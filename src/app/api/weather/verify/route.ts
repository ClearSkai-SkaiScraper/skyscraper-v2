// src/app/api/weather/verify/route.ts
// Full weather verification → AI summary → PDF → Storage → ai_reports

import { NextRequest } from "next/server";

import { errors, ok, withErrorHandler } from "@/lib/api/response";
import { getBrandingForOrg } from "@/lib/db/branding";
import { createWeatherDocument } from "@/lib/db/properties";
import { log } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { type CAPAlert, capToEvents, fetchCAPAlerts } from "@/lib/weather/cap";
import { fetchMesonetReports, type MesonetFeature, mesonetToEvents } from "@/lib/weather/mesonet";
import { aiSummarizeWeather } from "@/lib/weather/report";
import { pickQuickDOL, scoreEventsForProperty } from "@/lib/weather/score";
import { buildWeatherPDF } from "@/pdf/weatherTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handlePOST(req: NextRequest) {
  const startTime = Date.now();

  // Auth is handled by withAuth wrapper — but this function is called from
  // withErrorHandler, so we need to do auth via the canonical pattern.
  // For now, import requireAuth directly for this complex handler.
  const { requireAuth, isAuthError } = await import("@/lib/auth/requireAuth");
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;
  const { userId, orgId: dbOrgId } = authResult;

  log.info("[weather-verify] Request started", { userId, orgId: dbOrgId });

  // 2) Rate limiting: 20 requests per minute for weather endpoints
  const identifier = getRateLimitIdentifier(userId, req);
  const allowed = await rateLimiters.weather.check(20, identifier);
  if (!allowed) {
    log.warn("[weather-verify] Rate limit exceeded", { userId, orgId: dbOrgId });
    return errors.tooManyRequests();
  }

  const body = await req.json();
  const { lat, lon, daysBack = 120, propertyId, claimId } = body;

  // B-11: ALWAYS use session orgId — NEVER trust body.orgId
  const finalOrgId = dbOrgId;

  if (!lat || !lon) {
    return errors.badRequest("Latitude and longitude are required.");
  }

  if (!finalOrgId) {
    return errors.badRequest("Organization ID is required. Please select an organization.");
  }

  // Fetch branding from database
  const dbBranding = await getBrandingForOrg(finalOrgId);

  // Transform to PDF template format
  const branding = dbBranding
    ? {
        primary: dbBranding.colorPrimary || undefined,
        secondary: dbBranding.colorAccent || undefined,
        background: undefined,
        logoUrl: dbBranding.logoUrl || undefined,
        companyName: dbBranding.companyName || undefined,
      }
    : undefined;

  const now = new Date();
  const start = new Date(now.getTime() - daysBack * 864e5);

  const bbox = buildBBox(lat, lon, 2);
  const startIso = start.toISOString();
  const endIso = now.toISOString();

  let capRows: CAPAlert[] = [];
  let mesRows: MesonetFeature[] = [];

  try {
    capRows = await fetchCAPAlerts({ bbox, startIso, endIso });
  } catch (error) {
    log.warn("[weather/verify] CAP alerts fetch failed:", error);
  }

  try {
    mesRows = await fetchMesonetReports({ bbox, startIso, endIso });
  } catch (error) {
    log.warn("[weather/verify] Mesonet reports fetch failed:", error);
  }

  const events = [...capToEvents(capRows), ...mesonetToEvents(mesRows)];

  const { scored, byDate } = scoreEventsForProperty(events, { lat, lon });
  const dol = pickQuickDOL(scored, byDate);
  const summary = await aiSummarizeWeather({ scored, dol, lat, lon });

  const pdfUrl = await buildWeatherPDF({
    lat,
    lon,
    dol,
    scored,
    summary,
    branding: branding || undefined,
  });

  // Record document in database (legacy)
  if (propertyId) {
    await createWeatherDocument({
      property_id: propertyId,
      orgId: finalOrgId,
      kind: "verification_pdf",
      pdfUrl,
      summaryText: summary,
      aiModelUsed: "gpt-4o-mini",
      eventCount: scored.length,
      dolDate: dol.recommended_date_utc || undefined,
    });
  }

  // Persist to ai_reports for unified tracking
  const { getUserName } = await import("@/lib/clerk-utils");
  await prisma.ai_reports.create({
    data: {
      id: `weather_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      orgId: finalOrgId,
      claimId: claimId || null,
      userId,
      userName: await getUserName(userId),
      type: "weather_chains",
      title: `Weather Verification - ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      prompt: `Weather verification for lat=${lat}, lon=${lon}, daysBack=${daysBack}`,
      content: JSON.stringify({ dol, events: scored, summary }),
      tokensUsed: 0, // Tracked via token system, not per-request
      model: "gpt-4o-mini",
      attachments: { pdfUrl, lat, lon, daysBack, eventCount: scored.length },
      status: "generated",
      updatedAt: new Date(),
    },
  });

  // Auto-generate timeline event if claim is linked
  if (claimId) {
    const { logWeatherVerificationEvent } = await import("@/lib/claims/timeline");
    await logWeatherVerificationEvent(claimId, userId);
  }

  // Log success
  const duration = Date.now() - startTime;
  log.info("[weather-verify] Request completed", {
    userId,
    orgId: finalOrgId,
    claimId,
    lat,
    lon,
    duration,
    eventCount: scored.length,
  });

  return ok({
    dol,
    events: scored,
    summary,
    pdfUrl,
  });
}

export const POST = withErrorHandler(handlePOST, "POST /api/weather/verify");

function buildBBox(lat: number, lon: number, deg: number) {
  return `${lon - deg},${lat - deg},${lon + deg},${lat + deg}`;
}
