/**
 * Weather Maps — Storm Intelligence, Forecast & Evidence Hub
 *
 * Apple Weather–inspired layout:
 *   - Current conditions bar (live from Visual Crossing)
 *   - Full-width Mapbox map with overlay layers (claims, heatmap, storms)
 *   - Right sidebar: data sets (storm events, weather reports, NWS alerts)
 *   - 7-day forecast strip below map
 *   - Active alerts banner
 *   - "Use as Evidence" flow to attach weather data to claims
 */

import { CloudRain } from "lucide-react";
import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getMapboxToken } from "@/lib/debug/mapboxDebug";
import { logger } from "@/lib/logger";
import { getOrgLocation } from "@/lib/org/getOrgLocation";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import type { WeatherClaimMarker } from "./_components/WeatherMapDashboard";

const WeatherMapDashboard = nextDynamic(() => import("./_components/WeatherMapDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center rounded-2xl border bg-slate-900/20 backdrop-blur-sm">
      <div className="text-center">
        <div className="mb-3 text-5xl">🌩️</div>
        <p className="text-sm font-medium text-muted-foreground">Loading Weather Intelligence…</p>
      </div>
    </div>
  ),
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Weather Intelligence Map | SkaiScraper",
  description: "Storm damage map, 7-day forecast, live alerts, and weather evidence for claims",
};

/* ─── Geocode address via Mapbox ─── */
async function geocodeAddress(
  address: string,
  token: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address.trim());
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?limit=1&types=address,place&access_token=${token}`,
      { next: { revalidate: 86400 } }
    );
    const json = await res.json();
    const coords = json?.features?.[0]?.center;
    if (coords && coords.length === 2) return { lng: coords[0], lat: coords[1] };
    return null;
  } catch {
    return null;
  }
}

/* ─── Infer severity from weather data ─── */
function inferSeverity(claim: {
  hailSize: string | null;
  windSpeed: string | null;
}): "low" | "moderate" | "severe" | "extreme" | null {
  const hail = parseFloat(claim.hailSize || "0");
  const wind = parseFloat(claim.windSpeed || "0");
  if (hail >= 2 || wind >= 80) return "extreme";
  if (hail >= 1 || wind >= 60) return "severe";
  if (hail >= 0.5 || wind >= 40) return "moderate";
  if (hail > 0 || wind > 0) return "low";
  return null;
}

/* ─── Load claims with weather data as map markers ─── */
async function loadWeatherMarkers(orgId: string, token: string): Promise<WeatherClaimMarker[]> {
  const claims = await prisma.claims.findMany({
    where: { orgId, isDemo: false },
    select: {
      id: true,
      claimNumber: true,
      status: true,
      dateOfLoss: true,
      properties: {
        select: { street: true, city: true, state: true, zipCode: true },
      },
      weather_reports: {
        select: {
          overallAssessment: true,
          primaryPeril: true,
          globalSummary: true,
          events: true,
          lat: true,
          lng: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const items = claims
    .map((c) => {
      const prop = c.properties?.[0];
      const address = prop
        ? [prop.street, prop.city, prop.state, prop.zipCode].filter(Boolean).join(", ")
        : "";
      const report = c.weather_reports?.[0];
      const events =
        (report?.events as Array<{
          hailSize?: string;
          windSpeed?: string;
        }>) || [];
      const hailSize = events.find((e) => e.hailSize)?.hailSize || null;
      const windSpeed = events.find((e) => e.windSpeed)?.windSpeed || null;
      const summary =
        typeof report?.globalSummary === "string"
          ? report.globalSummary
          : (report?.globalSummary as { text?: string })?.text || report?.overallAssessment || null;
      return {
        id: c.id,
        claimNumber: c.claimNumber || c.id.slice(0, 8),
        address,
        status: c.status || "unknown",
        dolDate: c.dateOfLoss ? c.dateOfLoss.toISOString() : null,
        weatherSummary: summary,
        hailSize,
        windSpeed,
        _address: address,
        _reportLat: report?.lat ?? null,
        _reportLng: report?.lng ?? null,
      };
    })
    .filter((m) => m._address);

  // Batch geocode (10 at a time to respect Mapbox rate limits)
  const BATCH = 10;
  const results: WeatherClaimMarker[] = [];

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const geocoded = await Promise.all(
      batch.map(async (item) => {
        let lat = item._reportLat;
        let lng = item._reportLng;
        if (lat == null || lng == null) {
          const coords = await geocodeAddress(item._address, token);
          if (!coords) return null;
          lat = coords.lat;
          lng = coords.lng;
        }
        return {
          id: item.id,
          claimNumber: item.claimNumber,
          address: item.address,
          lat,
          lng,
          status: item.status,
          dolDate: item.dolDate,
          weatherSummary: item.weatherSummary,
          hailSize: item.hailSize,
          windSpeed: item.windSpeed,
          severity: inferSeverity(item),
        };
      })
    );
    geocoded.forEach((r) => {
      if (r) results.push(r);
    });
  }

  return results;
}

export default async function WeatherMapsPage() {
  const ctx = await safeOrgContext();

  if (ctx.status === "unauthenticated") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Sign in to access weather intelligence.
      </div>
    );
  }

  const mapboxToken = getMapboxToken();
  const orgLocation = await getOrgLocation(ctx.orgId);
  const center: [number, number] = [orgLocation.lng, orgLocation.lat];

  let markers: WeatherClaimMarker[] = [];
  if (ctx.orgId && mapboxToken) {
    try {
      markers = await loadWeatherMarkers(ctx.orgId, mapboxToken);
    } catch (error) {
      logger.error("[WEATHER_MAP] Failed to load markers", { error });
    }
  }

  return (
    <PageContainer>
      <PageHero
        section="leads"
        title="Weather Intelligence"
        subtitle="Live weather, storm data, forecasts, and evidence for claims — all in one view"
        icon={<CloudRain className="h-6 w-6 text-blue-500" />}
      />

      {!mapboxToken ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Mapbox token not configured. Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment
          variables to enable weather maps.
        </div>
      ) : (
        <WeatherMapDashboard markers={markers} center={center} mapboxToken={mapboxToken} />
      )}
    </PageContainer>
  );
}
