import { Map } from "lucide-react";
import nextDynamic from "next/dynamic";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getMapboxToken } from "@/lib/debug/mapboxDebug";
import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import { getOrgLocation } from "@/lib/org/getOrgLocation";
import prisma from "@/lib/prisma";

// Dynamic import to prevent SSR issues with Mapbox
const MapboxMap = nextDynamic(() => import("@/components/maps/MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/10">
      <div className="text-center">
        <div className="mb-3 text-4xl">🗺️</div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  type?: string;
  color?: string;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getClaimsWithLocations(orgId: string): Promise<MapMarker[]> {
  try {
    const claims = await prisma.claims.findMany({
      where: {
        orgId,
      },
      include: {
        properties: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      take: 100, // Reasonable limit for map performance
    });

    // Map claims to markers using address-based coordinates
    return claims
      .map((claim) => {
        const p = claim.properties;
        if (!p?.street || !p?.city) {
          // No address — skip this claim
          return null;
        }
        const address = `${p.street}, ${p.city}, ${p.state || ""} ${p.zipCode || ""}`;
        const coords = addressToCoords(address);

        return {
          id: claim.id,
          lat: coords.lat,
          lng: coords.lng,
          label: `${p.street}, ${p.city || ""}`,
          type: "claim",
          color: getStatusColor(claim.status),
        } satisfies MapMarker;
      })
      .filter(Boolean) as MapMarker[];
  } catch (error) {
    logger.error("[MapView] Failed to load claim locations:", error);
    return [];
  }
}

async function getVendorsWithLocations(): Promise<MapMarker[]> {
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
        vendorId: true,
      },
      take: 100, // Reasonable limit for map performance
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
          type: "vendor",
          color: "#6b7280", // grey for vendors (distinct from claims)
        } satisfies MapMarker;
      })
      .filter(Boolean) as MapMarker[];
  } catch (error) {
    logger.error("[MapView] Failed to load vendor locations:", error);
    return []; // Return empty array on error
  }
}

// Deterministic position from address string (until real geocoding API is added)
function addressToCoords(address: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < address.length; i++) {
    h = (Math.imul(31, h) + address.charCodeAt(i)) | 0;
  }
  return {
    lat: 33.4484 + ((Math.abs(h) % 1000) / 1000) * 0.4 - 0.2,
    lng: -112.074 + ((Math.abs(h >> 10) % 1000) / 1000) * 0.4 - 0.2,
  };
}

async function getLeadsWithLocations(orgId: string): Promise<MapMarker[]> {
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

    return leads
      .map((lead) => {
        const c = lead.contacts;
        if (!c.street || !c.city) return null;
        const address = `${c.street}, ${c.city}, ${c.state || ""} ${c.zipCode || ""}`;
        const coords = addressToCoords(address);
        return {
          id: lead.id,
          lat: coords.lat,
          lng: coords.lng,
          label: `${c.firstName} ${c.lastName} — ${lead.title}`,
          type: "lead",
          color: "#a855f7", // purple for leads
        } satisfies MapMarker;
      })
      .filter(Boolean) as MapMarker[];
  } catch (error) {
    logger.error("[MapView] Failed to load lead locations:", error);
    return [];
  }
}

async function getRetailJobsWithLocations(orgId: string): Promise<MapMarker[]> {
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

    return retailJobs
      .map((job) => {
        const c = job.contacts;
        if (!c.street || !c.city) return null;
        const address = `${c.street}, ${c.city}, ${c.state || ""} ${c.zipCode || ""}`;
        const coords = addressToCoords(address);
        return {
          id: job.id,
          lat: coords.lat,
          lng: coords.lng,
          label: `${c.firstName} ${c.lastName} — ${job.title}`,
          type: "retail",
          color: "#f97316", // orange for retail
        } satisfies MapMarker;
      })
      .filter(Boolean) as MapMarker[];
  } catch (error) {
    logger.error("[MapView] Failed to load retail job locations:", error);
    return [];
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "approved":
      return "#22c55e"; // green
    case "in_progress":
      return "#3b82f6"; // blue
    case "pending":
      return "#f59e0b"; // amber
    case "rejected":
      return "#991b1b"; // dark red
    case "retail":
      return "#f97316"; // orange
    case "lead":
    case "leads":
      return "#a855f7"; // purple
    default:
      return "#117CFF"; // default blue
  }
}

export default async function MapViewPage() {
  // Optional org context - Maps work without an org
  const orgResult = await getActiveOrgContext({ optional: true });

  // Soft-gate: do not redirect unauthenticated users; render demo map

  const hasOrg = orgResult.ok;
  const orgId = hasOrg ? orgResult.orgId : null;

  // Get org location or use Phoenix, AZ as default
  const location = orgId
    ? await getOrgLocation(orgId)
    : { lat: 33.4484, lng: -112.074, city: "Phoenix", state: "AZ" };

  // Fetch all marker types in parallel
  const [claimMarkers, vendorMarkers, leadMarkers, retailMarkers] = await Promise.all([
    orgId ? getClaimsWithLocations(orgId) : Promise.resolve([]),
    getVendorsWithLocations(),
    orgId ? getLeadsWithLocations(orgId) : Promise.resolve([]),
    orgId ? getRetailJobsWithLocations(orgId) : Promise.resolve([]),
  ]);
  const markers = [...claimMarkers, ...vendorMarkers, ...leadMarkers, ...retailMarkers];

  // Check for Mapbox token (supports multiple env keys via shared helper)
  const mapboxToken = getMapboxToken();

  if (!mapboxToken) {
    return (
      <PageContainer>
        <PageHero
          section="jobs"
          title="Map View"
          subtitle="Interactive map of your claims and vendor locations"
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

  // If no locations, show empty state but still render base map
  if (markers.length === 0) {
    return (
      <PageContainer>
        <PageHero
          section="jobs"
          title="Map View"
          subtitle="No locations to display"
          icon={<Map className="h-6 w-6" />}
          size="compact"
        />
        <div className="mt-6 h-[60vh] overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <MapboxMap
            markers={[]}
            initialCenter={{ lat: location.lat, lng: location.lng }}
            className="h-full w-full"
          />
        </div>
        <div className="mt-4 rounded-lg border border-border bg-card p-3 text-center text-xs text-muted-foreground">
          No claims or vendor locations found for your organization.
        </div>
      </PageContainer>
    );
  }

  // Normal map view with legend
  return (
    <PageContainer>
      <PageHero
        section="jobs"
        title="Map View"
        subtitle={`Showing ${markers.length} location${markers.length === 1 ? "" : "s"}`}
        icon={<Map className="h-6 w-6" />}
        size="compact"
      />
      <div className="mt-6 h-[60vh] overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <MapboxMap
          markers={markers}
          initialCenter={{ lat: location.lat, lng: location.lng }}
          className="h-full w-full"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-sm">
        <span className="font-semibold text-foreground">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#a855f7]"></div>
          <span className="text-muted-foreground">Leads ({leadMarkers.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#f97316]"></div>
          <span className="text-muted-foreground">Retail ({retailMarkers.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#6b7280]"></div>
          <span className="text-muted-foreground">Vendors ({vendorMarkers.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#22c55e]"></div>
          <span className="text-muted-foreground">Approved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#3b82f6]"></div>
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#f59e0b]"></div>
          <span className="text-muted-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#991b1b]"></div>
          <span className="text-muted-foreground">Rejected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#f97316]"></div>
          <span className="text-muted-foreground">Retail</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#a855f7]"></div>
          <span className="text-muted-foreground">Leads</span>
        </div>
      </div>
    </PageContainer>
  );
}
