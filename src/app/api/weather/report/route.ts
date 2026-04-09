export const dynamic = "force-dynamic";
export const maxDuration = 120; // PDF generation + radar image downloads can be slow

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runWeatherReport, WeatherReportInput } from "@/lib/ai/weather";
import { logCriticalAction } from "@/lib/audit/criticalActions";
import { withAuth } from "@/lib/auth/withAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { getBrandingForOrg, getBrandingWithDefaults } from "@/lib/branding/fetchBranding";
import { BRAND_PRIMARY } from "@/lib/constants/branding";
import { logger } from "@/lib/logger";
import { renderWeatherReportPDF } from "@/lib/pdf/weather-report-pdf";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveAiPdfToStorage } from "@/lib/reports/saveAiPdfToStorage";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";
import { getRadarForEvent } from "@/lib/weather/radarService";
import {
  buildWeatherPdfViewModel,
  type WeatherPdfViewModel,
} from "@/lib/weather/weatherPdfViewModel";

// ─────────────────────────────────────────────────────────────────────────────
// Geocoding
// ─────────────────────────────────────────────────────────────────────────────

interface GeocodingResult {
  lat: number;
  lng: number;
  resolved: boolean;
}

async function geocodeAddress(address: string): Promise<GeocodingResult> {
  if (!address) {
    logger.warn("[Weather API] No address provided for geocoding");
    return { lat: 0, lng: 0, resolved: false };
  }

  try {
    // ── 1. Try Mapbox (best accuracy for street addresses) ──
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
    if (mapboxToken) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1&types=address,place`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          const feat = data.features?.[0];
          if (feat?.center) {
            logger.info("[Weather API] Geocoded via Mapbox", {
              address,
              lat: feat.center[1],
              lng: feat.center[0],
            });
            return { lat: feat.center[1], lng: feat.center[0], resolved: true };
          }
        }
      } catch {
        logger.warn("[Weather API] Mapbox geocoding failed, trying fallbacks");
      }
    }

    // ── 2. Nominatim / OpenStreetMap (free, handles full addresses) ──
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "SkaiScraper/1.0 (support@skaiscrape.com)" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (nominatimRes.ok) {
      const nominatimData = await nominatimRes.json();
      if (nominatimData?.[0]) {
        const lat = parseFloat(nominatimData[0].lat);
        const lng = parseFloat(nominatimData[0].lon);

        if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
          logger.info("[Weather API] Geocoded via Nominatim", { address, lat, lng });
          return { lat, lng, resolved: true };
        }
      }
    }

    // ── 3. Open-Meteo (city-level only — extract city name) ──
    const parts = address.split(",").map((s) => s.trim());
    const cityQuery =
      parts.length >= 3
        ? `${parts[1]}, ${parts[2].split(" ")[0]}`
        : parts.length === 2
          ? address
          : parts[0];

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.results?.[0]) {
        const lat = geoData.results[0].latitude;
        const lng = geoData.results[0].longitude;

        if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
          logger.info("[Weather API] Geocoded via Open-Meteo (city-level)", {
            cityQuery,
            lat,
            lng,
          });
          return { lat, lng, resolved: true };
        }
      }
    }

    logger.warn("[Weather API] All geocoding methods failed for address", { address });
    return { lat: 0, lng: 0, resolved: false };
  } catch (err) {
    logger.error("[Weather API] Geocoding error:", err);
    return { lat: 0, lng: 0, resolved: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - List reports
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const reports = await prisma.weather_reports.findMany({
      where: {
        OR: [{ createdById: userId }, { claims: { orgId } }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        address: true,
        dol: true,
        primaryPeril: true,
        mode: true,
        createdAt: true,
        globalSummary: true,
        events: true,
        claims: {
          select: { id: true, claimNumber: true },
        },
      },
    });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (err) {
    logger.error("[API Error] GET /api/weather/report:", err);
    return NextResponse.json({ error: "Failed to fetch reports." }, { status: 500 });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST - Generate new weather report
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // ── Billing guard ──
    try {
      await requireActiveSubscription(orgId);
    } catch (error) {
      if (error instanceof SubscriptionRequiredError) {
        return NextResponse.json(
          { error: "subscription_required", message: "Active subscription required" },
          { status: 402 }
        );
      }
      throw error;
    }

    // ── Rate limit ──
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: "Too many requests. Please try again later.",
          retryAfter: rl.reset,
        },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const weatherReportSchema = z
      .object({
        address: z.string().min(1, "Address is required").max(500),
        dol: z.string().min(1, "Date of loss is required").max(50),
        claimId: z.string().max(200).optional().nullable(),
        claim_id: z.string().max(200).optional().nullable(),
        mode: z.string().max(50).optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
      })
      .passthrough();

    const parsed = weatherReportSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data as WeatherReportInput & { claim_id?: string | null };

    const claimId = body.claimId ?? body.claim_id ?? null;

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 1: Fetch claim details if we have a claim ID
    // ══════════════════════════════════════════════════════════════════════════
    let claimDetails: {
      claimNumber?: string;
      insuredName?: string;
      carrier?: string;
      policyNumber?: string;
      adjusterName?: string;
      adjusterPhone?: string;
      adjusterEmail?: string;
      propertyAddress?: string;
      propertyLat?: number;
      propertyLng?: number;
    } = {};

    if (claimId) {
      try {
        const claim = await prisma.claims.findFirst({
          where: { id: claimId, orgId },
          select: {
            claimNumber: true,
            insured_name: true,
            carrier: true,
            policy_number: true,
            adjusterName: true,
            adjusterPhone: true,
            adjusterEmail: true,
            properties: {
              select: {
                street: true,
                city: true,
                state: true,
                zipCode: true,
              },
            },
          },
        });

        if (claim) {
          // Build full address from property components
          const prop = claim.properties;
          const fullAddress = prop
            ? [prop.street, prop.city, prop.state, prop.zipCode].filter(Boolean).join(", ")
            : undefined;

          claimDetails = {
            claimNumber: claim.claimNumber || undefined,
            insuredName: claim.insured_name || undefined,
            carrier: claim.carrier || undefined,
            policyNumber: claim.policy_number || undefined,
            adjusterName: claim.adjusterName || undefined,
            adjusterPhone: claim.adjusterPhone || undefined,
            adjusterEmail: claim.adjusterEmail || undefined,
            propertyAddress: fullAddress,
            // Note: properties table doesn't have lat/lng, will use geocoding
            propertyLat: undefined,
            propertyLng: undefined,
          };
          logger.info("[Weather API] Loaded claim details", {
            claimId,
            claimNumber: claim.claimNumber,
          });
        }
      } catch (claimErr) {
        logger.warn("[Weather API] Failed to load claim details:", claimErr);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 2: Fetch org branding
    // ══════════════════════════════════════════════════════════════════════════
    let brandingData = {
      companyName: "SkaiScraper",
      phone: undefined as string | undefined,
      email: undefined as string | undefined,
      website: undefined as string | undefined,
      license: undefined as string | undefined,
      logoUrl: undefined as string | undefined,
      primaryColor: BRAND_PRIMARY,
      accentColor: "#FFC838" as string | undefined,
      headshotUrl: undefined as string | undefined,
    };

    if (orgId) {
      try {
        const branding = await getBrandingForOrg(orgId);
        const defaults = getBrandingWithDefaults(branding);
        brandingData = {
          companyName: defaults.businessName,
          phone: defaults.phone || undefined,
          email: defaults.email || undefined,
          website: defaults.website || undefined,
          license: defaults.license || undefined,
          logoUrl: defaults.logo || undefined,
          primaryColor: defaults.primaryColor,
          accentColor: branding?.colorAccent || "#FFC838",
          headshotUrl: branding?.teamPhotoUrl || undefined,
        };
        logger.info("[Weather API] Loaded org branding", {
          orgId,
          companyName: brandingData.companyName,
        });
      } catch (brandErr) {
        logger.warn("[Weather API] Failed to load branding:", brandErr);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 3: Get user name for "generated by"
    // ══════════════════════════════════════════════════════════════════════════
    let generatedBy: string | undefined;
    let employeeTitle: string | undefined;
    let employeePhone: string | undefined;
    try {
      const user = await prisma.users.findFirst({
        where: { clerkUserId: userId },
        select: { name: true, email: true, phone: true },
      });
      generatedBy = user?.name || user?.email || undefined;
      employeePhone = user?.phone || undefined;
      // Title field may not exist in older databases
      employeeTitle = undefined;
    } catch {
      // Ignore - user info is optional
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 4: Geocode the address (moved before AI so we can fetch real data)
    // ══════════════════════════════════════════════════════════════════════════
    // First try property coordinates from claim, then geocode
    let geocodeResult: GeocodingResult;

    if (
      claimDetails.propertyLat &&
      claimDetails.propertyLng &&
      claimDetails.propertyLat !== 0 &&
      claimDetails.propertyLng !== 0
    ) {
      // Use existing property coordinates
      geocodeResult = {
        lat: claimDetails.propertyLat,
        lng: claimDetails.propertyLng,
        resolved: true,
      };
      logger.info("[Weather API] Using existing property coordinates", geocodeResult);
    } else {
      // Geocode the address
      geocodeResult = await geocodeAddress(body.address);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 5: Fetch radar and weather data (moved before AI for real data)
    // ══════════════════════════════════════════════════════════════════════════
    let radarImages: { url: string; label: string; stationId?: string; timestamp?: string }[] = [];
    let radarStationId: string | null = null;
    let propertyMapUrl: string | undefined;
    let weatherConditions: {
      datetime: string;
      tempmax: number;
      tempmin: number;
      precip: number;
      precipprob: number;
      windspeed: number;
      windgust?: number;
      conditions: string;
      icon: string;
      description?: string;
    }[] = [];

    if (geocodeResult.resolved) {
      try {
        const dolDate = body.dol;
        const radarResult = await getRadarForEvent(geocodeResult.lat, geocodeResult.lng, dolDate);
        radarImages = radarResult.images;
        radarStationId = radarResult.stationId;
        weatherConditions = radarResult.weatherData || [];
        propertyMapUrl = radarResult.propertyMapUrl;
        logger.info("[Weather API] Fetched radar + weather data", {
          stationId: radarStationId,
          radarCount: radarImages.length,
          weatherDays: weatherConditions.length,
        });
      } catch (radarErr) {
        logger.error("[Weather API] Radar/weather fetch failed (non-critical):", radarErr);
      }
    } else {
      logger.warn("[Weather API] Skipping weather data fetch - location not resolved");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 6: Run AI weather analysis (now with real weather observations)
    // ══════════════════════════════════════════════════════════════════════════
    let aiReport;
    try {
      aiReport = await runWeatherReport({
        ...body,
        claimId: claimId as string | null,
        orgId: orgId ?? null,
        weatherConditions: weatherConditions.length > 0 ? weatherConditions : undefined,
      });
    } catch (aiErr) {
      logger.error("[Weather API] AI report generation failed:", aiErr);
      return NextResponse.json(
        {
          error: "Weather AI analysis failed. Please try again.",
          step: "ai_generation",
          details: process.env.NODE_ENV === "development" ? String(aiErr) : undefined,
        },
        { status: 502 }
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 7: Save to database
    // ══════════════════════════════════════════════════════════════════════════
    let report;
    try {
      const dbUser = await prisma.users.findUnique({
        where: { clerkUserId: userId },
        select: { id: true },
      });
      if (!dbUser) {
        logger.error("[Weather API] No DB user found for Clerk userId:", userId);
        return NextResponse.json(
          {
            error: "User account not synced. Please refresh the page and try again.",
            step: "db_save",
          },
          { status: 500 }
        );
      }

      const reportId = randomUUID();
      report = await prisma.weather_reports.create({
        data: {
          id: reportId,
          claimId: claimId || null,
          createdById: dbUser.id,
          updatedAt: new Date(),
          mode: "full_report",
          address: body.address,
          dol: aiReport.dol ? new Date(aiReport.dol) : null,
          primaryPeril: aiReport.peril ?? null,
          globalSummary: {
            overallAssessment: aiReport.summary ?? "No summary available.",
            contractorNarrative: aiReport.carrierTalkingPoints ?? "",
            radarStation: radarStationId,
            radarImageCount: radarImages.length,
            locationResolved: geocodeResult.resolved,
            lat: geocodeResult.lat,
            lng: geocodeResult.lng,
          },
          events: aiReport.events ?? [],
          providerRaw: aiReport,
        },
      });

      await logCriticalAction("WEATHER_REPORT_GENERATED", userId, orgId || "unknown", {
        reportId: report.id,
        address: body.address,
        dol: body.dol,
        claimId: claimId || null,
        locationResolved: geocodeResult.resolved,
      });
    } catch (dbErr) {
      logger.error("[Weather API] DB save failed:", dbErr);
      return NextResponse.json(
        {
          error: "Failed to save weather report to database.",
          step: "db_save",
          details: process.env.NODE_ENV === "development" ? String(dbErr) : undefined,
        },
        { status: 500 }
      );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 8: Generate PDF with full hydration via WeatherPdfViewModel
    // ══════════════════════════════════════════════════════════════════════════
    let pdfSaved = false;
    let pdfUrl: string | null = null;
    let pdfErrorDetail: string | null = null;

    try {
      // Always generate PDF if orgId is present (standalone reports without claimId still get PDFs)
      if (orgId) {
        const pdfStartTime = Date.now();

        // ── Step 8a: Build View Model ──
        let viewModel: WeatherPdfViewModel;
        try {
          logger.info("[Weather API] ▶ Step 8a: Building WeatherPdfViewModel", {
            claimId: claimId || "standalone",
            hasBranding: !!brandingData.companyName,
            hasClaim: !!claimDetails.claimNumber,
            locationResolved: geocodeResult.resolved,
            anchorDate: aiReport.dol || body.dol,
            weatherDays: weatherConditions.length,
            radarCount: radarImages.length,
            eventsCount: aiReport.events?.length ?? 0,
          });

          viewModel = await buildWeatherPdfViewModel({
            reportId: report.id,
            generatedBy,
            claimNumber: claimDetails.claimNumber,
            insuredName: claimDetails.insuredName,
            carrier: claimDetails.carrier,
            policyNumber: claimDetails.policyNumber,
            adjusterName: claimDetails.adjusterName,
            adjusterPhone: claimDetails.adjusterPhone,
            adjusterEmail: claimDetails.adjusterEmail,
            propertyAddress: claimDetails.propertyAddress || body.address,
            dateOfLoss: aiReport.dol || body.dol,
            claimPeril: aiReport.peril,
            lat: geocodeResult.lat,
            lng: geocodeResult.lng,
            locationResolved: geocodeResult.resolved,
            radarStationId: radarStationId || undefined,
            companyName: brandingData.companyName,
            companyPhone: brandingData.phone,
            companyEmail: brandingData.email,
            companyWebsite: brandingData.website,
            companyLicense: brandingData.license,
            companyLogoUrl: brandingData.logoUrl,
            primaryColor: brandingData.primaryColor,
            accentColor: brandingData.accentColor,
            headshotUrl: brandingData.headshotUrl,
            employeeName: generatedBy,
            employeeTitle,
            employeePhone,
            weatherConditions: weatherConditions.map((wc) => ({
              datetime: wc.datetime,
              tempmax: wc.tempmax,
              tempmin: wc.tempmin,
              precip: wc.precip,
              precipprob: wc.precipprob,
              windspeed: wc.windspeed,
              windgust: wc.windgust,
              conditions: wc.conditions,
              description: wc.description,
            })),
            events:
              aiReport.events?.map((e) => ({
                date: e.date,
                time: e.time,
                type: e.type,
                severity: e.intensity,
                intensity: e.intensity,
                hailSize: e.hailSize || undefined,
                windSpeed: e.windSpeed || undefined,
                notes: e.notes,
              })) ?? [],
            radarFrames: radarImages.map((r) => ({
              url: r.url,
              timestamp: r.timestamp || `${aiReport.dol || body.dol}T12:00:00Z`,
              label: r.label,
            })),
            propertyMapUrl,
            summary: aiReport.summary,
            carrierTalkingPoints: aiReport.carrierTalkingPoints,
            dolSource: "user_input",
            providersUsed: geocodeResult.resolved ? ["visual_crossing", "iem_nexrad"] : [],
            providersFailed: [],
          });

          logger.info("[Weather API] ✅ Step 8a complete: View model built", {
            anchorDate: viewModel.anchorDate,
            weatherWindowDays: viewModel.weatherWindow.length,
            peril: viewModel.peril.displayText,
            confidence: viewModel.evidence.stormConfidence,
            hasStormEvidence: viewModel.hasStormEvidence,
            radarFramesLoaded: viewModel.radarFrames.length,
            hasRadarImagery: viewModel.hasRadarImagery,
            durationMs: Date.now() - pdfStartTime,
          });
        } catch (step8aErr) {
          const msg = step8aErr instanceof Error ? step8aErr.message : String(step8aErr);
          throw new Error(`[Step 8a FAILED - buildWeatherPdfViewModel] ${msg}`);
        }

        // ── Cross-check logger ──
        const sectionCrossCheck = {
          dolClaim: viewModel.claim.dateOfLoss,
          dolAnchor: viewModel.anchorDate,
          evidenceMaxWind: viewModel.evidence.maxWindGust ?? null,
          timelineMaxWind: Math.max(
            ...viewModel.weatherWindow.map((d) => d.windGust ?? d.windSpeed ?? 0)
          ),
          evidenceMaxPrecip: viewModel.evidence.maxPrecip ?? null,
          timelineMaxPrecip: Math.max(...viewModel.weatherWindow.map((d) => d.precip ?? 0)),
          evidenceHailMax: viewModel.evidence.hailSizeMax ?? null,
          stormConfidence: viewModel.evidence.stormConfidence,
          radarFrameCount: viewModel.radarFrames.length,
          radarClaimed: viewModel.hasRadarImagery,
          summaryMentionsRadar: viewModel.executiveSummary.toLowerCase().includes("radar"),
        };
        logger.info("[Weather API] Section cross-check", sectionCrossCheck);

        // ── Step 8b: Render PDF ──
        let pdfBuffer: Buffer;
        const MAX_PDF_BYTES = 5_000_000; // 5 MB — Supabase free-tier limit
        try {
          logger.info("[Weather API] ▶ Step 8b: Rendering PDF via jsPDF");
          const renderStart = Date.now();
          pdfBuffer = await renderWeatherReportPDF(viewModel);
          logger.info("[Weather API] ✅ Step 8b complete: PDF rendered", {
            pdfBytes: pdfBuffer.length,
            durationMs: Date.now() - renderStart,
          });

          // Guard: if PDF is too large (usually due to embedded radar PNGs),
          // strip radar imagery and re-render a lighter version.
          if (pdfBuffer.length > MAX_PDF_BYTES) {
            logger.warn("[Weather API] PDF too large, stripping radar and re-rendering", {
              originalBytes: pdfBuffer.length,
              maxAllowed: MAX_PDF_BYTES,
              radarFrames: viewModel.radarFrames.length,
            });
            viewModel.radarFrames = [];
            viewModel.hasRadarImagery = false;
            const reRenderStart = Date.now();
            pdfBuffer = await renderWeatherReportPDF(viewModel);
            logger.info("[Weather API] ✅ Step 8b re-render complete (no radar)", {
              pdfBytes: pdfBuffer.length,
              durationMs: Date.now() - reRenderStart,
            });
          }
        } catch (step8bErr) {
          const msg = step8bErr instanceof Error ? step8bErr.message : String(step8bErr);
          throw new Error(`[Step 8b FAILED - renderWeatherReportPDF] ${msg}`);
        }

        // ── Step 8c: Upload to Supabase ──
        try {
          logger.info("[Weather API] ▶ Step 8c: Uploading PDF to Supabase", {
            pdfBytes: pdfBuffer.length,
          });
          const uploadStart = Date.now();
          const pdfResult = await saveAiPdfToStorage({
            orgId,
            claimId: claimId || undefined,
            userId,
            type: "WEATHER",
            label: `Weather Report - ${body.address}`,
            pdfBuffer,
            visibleToClient: true,
            aiReportId: report.id,
          });

          pdfSaved = true;
          pdfUrl = pdfResult.publicUrl;
          logger.info("[Weather API] ✅ Step 8c complete: PDF uploaded to Supabase", {
            claimId: claimId || "standalone",
            pdfUrl,
            totalPdfPipelineMs: Date.now() - pdfStartTime,
            uploadMs: Date.now() - uploadStart,
          });
        } catch (step8cErr) {
          const msg = step8cErr instanceof Error ? step8cErr.message : String(step8cErr);
          throw new Error(`[Step 8c FAILED - saveAiPdfToStorage] ${msg}`);
        }
      }
    } catch (pdfError) {
      const errMsg = pdfError instanceof Error ? pdfError.message : String(pdfError);
      pdfErrorDetail = errMsg;
      logger.error("[Weather API] PDF generation failed (non-fatal):", {
        error: errMsg,
        stack: pdfError instanceof Error ? pdfError.stack : undefined,
        reportId: report.id,
        claimId: claimId || "standalone",
      });
      // PDF failure is non-fatal — report data is already saved.
      // Continue to return the report so the user can still see the data.
      // The PDF can be retried later.
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 9: Save to report_history
    // ══════════════════════════════════════════════════════════════════════════
    try {
      await saveReportHistory({
        orgId,
        userId,
        type: "weather_report",
        title: `Weather Report — ${body.address}`,
        sourceId: claimId ?? null,
        fileUrl: pdfUrl,
        metadata: {
          address: body.address,
          dol: body.dol,
          peril: aiReport.peril,
          pdfSaved,
          reportId: report.id,
          locationResolved: geocodeResult.resolved,
        },
      });
    } catch (histErr) {
      logger.error("[Weather API] Report history save failed (non-critical):", histErr);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 10: Save to file_assets
    // ══════════════════════════════════════════════════════════════════════════
    if (claimId && pdfUrl) {
      try {
        const fileAssetId = crypto.randomUUID();
        const storageKey = `claims/${claimId}/weather/report_${Date.now()}.pdf`;

        await prisma.file_assets.create({
          data: {
            id: fileAssetId,
            orgId,
            claimId,
            ownerId: userId,
            filename: `Weather Report — ${body.address} — ${new Date().toLocaleDateString("en-US")}.pdf`,
            publicUrl: pdfUrl,
            storageKey: storageKey,
            bucket: "claim-photos", // Correct bucket!
            mimeType: "application/pdf",
            sizeBytes: 0,
            category: "report",
            file_type: "weather_report",
            visibleToClient: true,
            updatedAt: new Date(),
          },
        });
        logger.info(
          `[Weather API] Saved to file_assets for claim ${claimId}, fileAssetId=${fileAssetId}`
        );
      } catch (faErr) {
        logger.error("[Weather API] Could not save to file_assets:", {
          error: faErr,
          claimId,
          orgId,
          pdfUrl,
        });
      }
    }

    return NextResponse.json(
      {
        report,
        pdfSaved,
        pdfUrl,
        pdfError: pdfSaved
          ? undefined
          : `PDF generation failed: ${pdfErrorDetail || "unknown error"}. Report data saved — you can retry PDF generation.`,
        weatherReportId: report.id,
        radarStation: radarStationId,
        radarImageCount: radarImages.length,
        locationResolved: geocodeResult.resolved,
        weatherDaysCount: weatherConditions.length,
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("[API Error] /api/weather/report:", err);
    return NextResponse.json(
      {
        error: "Failed to build weather report.",
        details: process.env.NODE_ENV === "development" ? String(err) : undefined,
      },
      { status: 500 }
    );
  }
});
