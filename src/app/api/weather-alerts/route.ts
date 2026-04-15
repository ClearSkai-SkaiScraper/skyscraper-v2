/**
 * GET /api/weather-alerts
 *
 * Fetches real-time severe weather alerts from the National Weather Service (NWS) API.
 * Resolves the org's primary service area state from their properties or contractor profile
 * and returns active alerts filtered by severity.
 *
 * NWS API is free, requires no API key — only a User-Agent header.
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NWS_BASE = "https://api.weather.gov";
const USER_AGENT = "SkaiScraper/1.0 (support@skaiscrape.com)";

// Map of severity → sort priority (lower = more urgent)
const SEVERITY_ORDER: Record<string, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
};

interface NWSFeature {
  properties: {
    id: string;
    event: string;
    headline: string;
    description: string;
    severity: string;
    certainty: string;
    urgency: string;
    effective: string;
    expires: string;
    areaDesc: string;
    senderName: string;
    response: string;
    instruction: string | null;
  };
}

interface NWSResponse {
  features: NWSFeature[];
}

export async function GET() {
  try {
    const orgCtx = await safeOrgContext();

    if (orgCtx.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = orgCtx.orgId;
    const userId = orgCtx.userId;

    // Resolve primary state for this org:
    // 1. Check user's Trades Network profile (tradesCompanyMember) for state
    // 2. Fall back to contractor_profiles.serviceAreas
    // 3. Fall back to most common property state
    let state: string | null = null;

    if (userId) {
      try {
        // First: user's Trades Network profile
        const tradesMember = await prisma.tradesCompanyMember.findUnique({
          where: { userId },
          select: { state: true },
        });

        if (tradesMember?.state) {
          const s = tradesMember.state.trim();
          state = s.length === 2 ? s.toUpperCase() : stateNameToCode(s);
        }
      } catch (err) {
        logger.warn("[WEATHER_ALERTS] Failed to resolve user trades state", { userId, err });
      }
    }

    if (!state && orgId) {
      try {
        // Try contractor profile serviceAreas
        const profile = await prisma.contractor_profiles.findUnique({
          where: { orgId },
          select: { serviceAreas: true },
        });

        if (profile?.serviceAreas) {
          // serviceAreas is Json — could be array of strings or objects
          const areas = profile.serviceAreas as unknown;
          if (Array.isArray(areas) && areas.length > 0) {
            const first = areas[0];
            if (typeof first === "string" && first.length === 2) {
              state = first.toUpperCase();
            } else if (typeof first === "object" && first !== null) {
              const areaObj = first as Record<string, unknown>;
              const s = areaObj.state ?? areaObj.stateCode ?? areaObj.abbreviation;
              if (typeof s === "string") state = s.toUpperCase();
            }
          }
        }

        // Fallback: most common property state for this org
        if (!state) {
          const topState = await prisma.properties.groupBy({
            by: ["state"],
            where: { orgId },
            _count: { state: true },
            orderBy: { _count: { state: "desc" } },
            take: 1,
          });

          if (topState.length > 0 && topState[0].state) {
            // Convert full state name to 2-letter code if needed
            const raw = topState[0].state.trim();
            state = raw.length === 2 ? raw.toUpperCase() : stateNameToCode(raw);
          }
        }
      } catch (err) {
        logger.warn("[WEATHER_ALERTS] Failed to resolve org state", { orgId, err });
      }
    }

    // Default to AZ (Arizona) if we can't resolve — platform primary market
    if (!state) state = "AZ";

    // Fetch NWS alerts for the state
    const url = `${NWS_BASE}/alerts/active?area=${state}&status=actual&message_type=alert`;
    const nwsRes = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
      },
      next: { revalidate: 300 }, // Cache for 5 min
    });

    if (!nwsRes.ok) {
      logger.warn("[WEATHER_ALERTS] NWS API error", {
        status: nwsRes.status,
        state,
      });
      return NextResponse.json({ alerts: [], state, source: "nws", error: "NWS unavailable" });
    }

    const nwsData: NWSResponse = await nwsRes.json();

    // Filter to storm-relevant alerts and map to clean shape
    const stormKeywords = [
      "tornado",
      "thunderstorm",
      "hail",
      "wind",
      "hurricane",
      "tropical",
      "storm",
      "flood",
      "flash",
      "severe",
      "winter",
      "ice",
      "blizzard",
      "freeze",
      "fire",
      "lightning",
    ];

    const alerts = nwsData.features
      .filter((f) => {
        const event = f.properties.event?.toLowerCase() ?? "";
        const severity = f.properties.severity ?? "Unknown";
        // Include all Extreme/Severe, plus Moderate+ if storm-related
        if (severity === "Extreme" || severity === "Severe") return true;
        return stormKeywords.some((kw) => event.includes(kw));
      })
      .map((f) => ({
        id: f.properties.id,
        event: f.properties.event,
        headline: f.properties.headline,
        severity: f.properties.severity,
        urgency: f.properties.urgency,
        certainty: f.properties.certainty,
        effective: f.properties.effective,
        expires: f.properties.expires,
        areas: f.properties.areaDesc,
        instruction: f.properties.instruction,
        senderName: f.properties.senderName,
        response: f.properties.response,
      }))
      .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4))
      .slice(0, 20); // Cap at 20 alerts

    return NextResponse.json({
      alerts,
      state,
      source: "nws",
      fetchedAt: new Date().toISOString(),
      total: nwsData.features.length,
      filtered: alerts.length,
    });
  } catch (err) {
    logger.error("[WEATHER_ALERTS] Unexpected error", { err });
    return NextResponse.json(
      { alerts: [], error: "Failed to fetch weather alerts" },
      { status: 500 }
    );
  }
}

/** Convert a full US state name to its 2-letter code */
function stateNameToCode(name: string): string | null {
  const map: Record<string, string> = {
    alabama: "AL",
    alaska: "AK",
    arizona: "AZ",
    arkansas: "AR",
    california: "CA",
    colorado: "CO",
    connecticut: "CT",
    delaware: "DE",
    florida: "FL",
    georgia: "GA",
    hawaii: "HI",
    idaho: "ID",
    illinois: "IL",
    indiana: "IN",
    iowa: "IA",
    kansas: "KS",
    kentucky: "KY",
    louisiana: "LA",
    maine: "ME",
    maryland: "MD",
    massachusetts: "MA",
    michigan: "MI",
    minnesota: "MN",
    mississippi: "MS",
    missouri: "MO",
    montana: "MT",
    nebraska: "NE",
    nevada: "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    ohio: "OH",
    oklahoma: "OK",
    oregon: "OR",
    pennsylvania: "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    tennessee: "TN",
    texas: "TX",
    utah: "UT",
    vermont: "VT",
    virginia: "VA",
    washington: "WA",
    "west virginia": "WV",
    wisconsin: "WI",
    wyoming: "WY",
    "district of columbia": "DC",
  };
  return map[name.toLowerCase()] ?? null;
}
