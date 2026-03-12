import { Map } from "lucide-react";
import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getMapboxToken } from "@/lib/debug/mapboxDebug";
import { logger } from "@/lib/logger";
import { getOrgLocation } from "@/lib/org/getOrgLocation";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import type { JobMarker } from "./_components/MapViewClient";

// Dynamic import — Mapbox can't run in SSR
const MapViewClient = nextDynamic(() => import("./_components/MapViewClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center rounded-xl border bg-muted/10">
      <div className="text-center">
        <div className="mb-3 text-4xl">🗺️</div>
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    </div>
  ),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Map View | SkaiScraper",
  description: "Interactive map of all your jobs, claims, leads, and vendor locations",
};

/* ─────────────────────────────────────────────────────────
 *  Mapbox Forward Geocoding — address → lat/lng
 * ───────────────────────────────────────────────────────── */
async function geocodeAddress(
  address: string,
  token: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address.trim());
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&types=address,place&access_token=${token}`,
      { next: { revalidate: 86400 } } // Cache for 24h
    );
    const json = await res.json();
    const coords = json?.features?.[0]?.center;
    if (coords && coords.length === 2) {
      return { lng: coords[0], lat: coords[1] };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Batch geocode items, 10 concurrent to respect Mapbox rate limits.
 */
async function batchGeocode<T extends { _address?: string }>(
  items: T[],
  token: string
): Promise<(T & { lat: number; lng: number })[]> {
  const BATCH = 10;
  const results: (T & { lat: number; lng: number })[] = [];

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const geocoded = await Promise.all(
      batch.map(async (item) => {
        if (!item._address) return null;
        const coords = await geocodeAddress(item._address, token);
        if (!coords) return null;
        return { ...item, lat: coords.lat, lng: coords.lng };
      })
    );
    geocoded.forEach((r) => {
      if (r) results.push(r);
    });
  }

  return results;
}

/* ─────────────────────────────────────────────────────────
 *  Data loaders
 * ───────────────────────────────────────────────────────── */

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "approved":
      return "#22c55e";
    case "in_progress":
      return "#3b82f6";
    case "pending":
      return "#f59e0b";
    case "rejected":
      return "#991b1b";
    default:
      return "#3b82f6";
  }
}

async function getClaimMarkers(orgId: string, token: string): Promise<JobMarker[]> {
  try {
    const claims = await prisma.claims.findMany({
      where: { orgId },
      include: {
        properties: {
          select: { id: true, street: true, city: true, state: true, zipCode: true },
        },
      },
      take: 100,
    });

    const items = claims
      .map((claim) => {
        const p = claim.properties;
        if (!p?.street || !p?.city) return null;
        const address = `${p.street}, ${p.city}, ${p.state || ""} ${p.zipCode || ""}`.trim();
        return {
          _address: address,
          id: claim.id,
          label: `${p.street}, ${p.city || ""}`,
          type: "claim" as const,
          color: getStatusColor(claim.status),
          status: claim.status,
          address,
          claimNumber: claim.claimNumber || undefined,
          insurer: claim.carrier || undefined,
          value: claim.estimatedValue ? Number(claim.estimatedValue) : null,
        };
      })
      .filter(Boolean) as Array<any>;

    return batchGeocode(items, token);
  } catch (error) {
    logger.error("[MapView] Failed to load claims:", error);
    return [];
  }
}

async function getLeadMarkers(orgId: string, token: string): Promise<JobMarker[]> {
  try {
    const leads = await prisma.leads.findMany({
      where: {
        orgId,
        OR: [{ jobCategory: "lead" }, { jobCategory: null }],
        stage: { notIn: ["closed_lost", "archived"] },
      },
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      take: 100,
    });

    const items = leads
      .map((lead) => {
        const c = lead.contacts;
        if (!c?.street || !c?.city) return null;
        const address = `${c.street}, ${c.city}, ${c.state || ""} ${c.zipCode || ""}`.trim();
        const contactName = [c.firstName, c.lastName].filter(Boolean).join(" ");
        return {
          _address: address,
          id: lead.id,
          label: lead.title || contactName || "Lead",
          type: "lead" as const,
          color: "#a855f7",
          status: lead.stage || undefined,
          address,
          contactName: contactName || undefined,
          value: lead.value ? Number(lead.value) : null,
        };
      })
      .filter(Boolean) as Array<any>;

    return batchGeocode(items, token);
  } catch (error) {
    logger.error("[MapView] Failed to load leads:", error);
    return [];
  }
}

async function getRetailMarkers(orgId: string, token: string): Promise<JobMarker[]> {
  try {
    const retailJobs = await prisma.leads.findMany({
      where: {
        orgId,
        jobCategory: { in: ["out_of_pocket", "financed", "repair"] },
        stage: { notIn: ["closed_lost", "archived"] },
      },
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      take: 100,
    });

    const items = retailJobs
      .map((job) => {
        const c = job.contacts;
        if (!c?.street || !c?.city) return null;
        const address = `${c.street}, ${c.city}, ${c.state || ""} ${c.zipCode || ""}`.trim();
        const contactName = [c.firstName, c.lastName].filter(Boolean).join(" ");
        return {
          _address: address,
          id: job.id,
          label: job.title || contactName || "Retail Job",
          type: "retail" as const,
          color: "#f97316",
          status: job.stage || undefined,
          address,
          contactName: contactName || undefined,
          jobCategory: job.jobCategory || undefined,
          value: job.value ? Number(job.value) : null,
        };
      })
      .filter(Boolean) as Array<any>;

    return batchGeocode(items, token);
  } catch (error) {
    logger.error("[MapView] Failed to load retail jobs:", error);
    return [];
  }
}

async function getVendorMarkers(orgId: string | null): Promise<JobMarker[]> {
  try {
    const vendorLocations = await prisma.vendorLocation.findMany({
      where: {
        isActive: true,
        lat: { not: null },
        lng: { not: null },
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        lat: true,
        lng: true,
      },
      take: 100,
    });

    return vendorLocations
      .map((v) => {
        const latNum = Number(v.lat);
        const lngNum = Number(v.lng);
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
        return {
          id: v.id,
          lat: latNum,
          lng: lngNum,
          label: v.name,
          type: "vendor" as const,
          color: "#6b7280",
          address: [v.city, v.state].filter(Boolean).join(", ") || undefined,
        } satisfies JobMarker;
      })
      .filter(Boolean) as JobMarker[];
  } catch (error) {
    logger.error("[MapView] Failed to load vendors:", error);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────
 *  Page
 * ───────────────────────────────────────────────────────── */
export default async function MapViewPage() {
  const orgResult = await safeOrgContext();
  const hasOrg = orgResult.ok;
  const orgId = hasOrg ? orgResult.orgId : null;

  const location = orgId
    ? await getOrgLocation(orgId)
    : { lat: 33.4484, lng: -112.074, city: "Phoenix", state: "AZ" };

  const mapboxToken = getMapboxToken();

  if (!mapboxToken) {
    return (
      <PageContainer>
        <PageHero
          section="jobs"
          title="Map View"
          subtitle="Interactive map of your claims, leads, and vendor locations"
          icon={<Map className="h-6 w-6" />}
          size="compact"
        />
        <div className="mt-6 flex h-[60vh] flex-col items-center justify-center rounded-xl border border-border bg-muted/20 p-6">
          <div className="mb-4 text-5xl">🗺️</div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">Map Coming Soon</h3>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            The interactive map is being configured for your account. Contact support if you need
            this feature enabled.
          </p>
        </div>
      </PageContainer>
    );
  }

  // Fetch all marker types in parallel (with real Mapbox geocoding)
  const [claimMarkers, leadMarkers, retailMarkers, vendorMarkers] = await Promise.all([
    orgId ? getClaimMarkers(orgId, mapboxToken) : Promise.resolve([]),
    orgId ? getLeadMarkers(orgId, mapboxToken) : Promise.resolve([]),
    orgId ? getRetailMarkers(orgId, mapboxToken) : Promise.resolve([]),
    getVendorMarkers(orgId),
  ]);

  const markers: JobMarker[] = [
    ...claimMarkers,
    ...leadMarkers,
    ...retailMarkers,
    ...vendorMarkers,
  ];

  return (
    <PageContainer maxWidth="full">
      <PageHero
        section="jobs"
        title="Map View"
        subtitle={`${markers.length} location${markers.length === 1 ? "" : "s"} — claims, leads, retail jobs & vendors`}
        icon={<Map className="h-6 w-6" />}
        size="compact"
      />
      <div className="mt-4">
        <MapViewClient markers={markers} initialCenter={{ lat: location.lat, lng: location.lng }} />
      </div>
    </PageContainer>
  );
}
