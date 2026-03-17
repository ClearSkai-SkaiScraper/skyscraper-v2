export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { runWeatherReport, WeatherReportInput } from "@/lib/ai/weather";
import { logCriticalAction } from "@/lib/audit/criticalActions";
import { withAuth } from "@/lib/auth/withAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { getBrandingForOrg, getBrandingWithDefaults } from "@/lib/branding/fetchBranding";
import { logger } from "@/lib/logger";
import { renderWeatherReportPDF, WeatherReportPdfInput } from "@/lib/pdf/weather-report-pdf";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveAiPdfToStorage } from "@/lib/reports/saveAiPdfToStorage";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";
import { getRadarForEvent } from "@/lib/weather/radarService";

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
    // Try Open-Meteo first (free, no key required)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`
    );

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.results?.[0]) {
        const lat = geoData.results[0].latitude;
        const lng = geoData.results[0].longitude;

        // Validate coordinates are reasonable
        if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
          logger.info("[Weather API] Geocoded address successfully", { address, lat, lng });
          return { lat, lng, resolved: true };
        }
      }
    }

    // Fallback to Nominatim (OpenStreetMap) - also free
    const nominatimRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "User-Agent": "SkaiScraper/1.0 (support@skaiscrape.com)" } }
    );

    if (nominatimRes.ok) {
      const nominatimData = await nominatimRes.json();
      if (nominatimData?.[0]) {
        const lat = parseFloat(nominatimData[0].lat);
        const lng = parseFloat(nominatimData[0].lon);

        if (lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
          logger.info("[Weather API] Geocoded via Nominatim fallback", { address, lat, lng });
          return { lat, lng, resolved: true };
        }
      }
    }

    logger.warn("[Weather API] Geocoding failed for address", { address });
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

    const body = (await req.json()) as WeatherReportInput & {
      claim_id?: string | null;
    };

    if (!body.address || !body.dol) {
      return NextResponse.json({ error: "address and dol are required." }, { status: 400 });
    }

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
        const claim = await prisma.claims.findUnique({
          where: { id: claimId },
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
      primaryColor: "#1e40af",
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
    try {
      const user = await prisma.users.findFirst({
        where: { clerkUserId: userId },
        select: { name: true, email: true },
      });
      generatedBy = user?.name || user?.email || undefined;
    } catch {
      // Ignore
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 4: Run AI weather analysis
    // ══════════════════════════════════════════════════════════════════════════
    let aiReport;
    try {
      aiReport = await runWeatherReport({
        ...body,
        claimId: claimId as string | null,
        orgId: orgId ?? null,
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
    // STEP 5: Geocode the address
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
    // STEP 6: Fetch radar and weather data
    // ══════════════════════════════════════════════════════════════════════════
    let radarImages: { url: string; label: string; stationId?: string }[] = [];
    let radarStationId: string | null = null;
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
        const dolDate = aiReport.dol || body.dol;
        const radarResult = await getRadarForEvent(geocodeResult.lat, geocodeResult.lng, dolDate);
        radarImages = radarResult.images;
        radarStationId = radarResult.stationId;
        weatherConditions = radarResult.weatherData || [];
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
    // STEP 8: Generate PDF with full hydration
    // ══════════════════════════════════════════════════════════════════════════
    let pdfSaved = false;
    let pdfUrl: string | null = null;

    try {
      if (claimId && orgId) {
        logger.info("[Weather API] Generating fully-hydrated PDF", {
          claimId,
          hasBranding: !!brandingData.companyName,
          hasClaim: !!claimDetails.claimNumber,
          locationResolved: geocodeResult.resolved,
        });

        const pdfInput: WeatherReportPdfInput = {
          address: body.address,
          dol: aiReport.dol || body.dol,
          lat: geocodeResult.lat,
          lng: geocodeResult.lng,
          locationResolved: geocodeResult.resolved,
          peril: aiReport.peril,
          summary: aiReport.summary,
          carrierTalkingPoints: aiReport.carrierTalkingPoints,
          events: aiReport.events?.map((e) => ({
            date: e.date,
            time: e.time,
            type: e.type,
            intensity: e.intensity,
            notes: e.notes,
          })),
          weatherConditions,
          radarStationId,
          radarImageCount: radarImages.length,
          claim: claimDetails.claimNumber
            ? {
                claimNumber: claimDetails.claimNumber,
                insuredName: claimDetails.insuredName,
                carrier: claimDetails.carrier,
                policyNumber: claimDetails.policyNumber,
                adjusterName: claimDetails.adjusterName,
                adjusterPhone: claimDetails.adjusterPhone,
                adjusterEmail: claimDetails.adjusterEmail,
                propertyAddress: claimDetails.propertyAddress,
              }
            : undefined,
          branding: {
            companyName: brandingData.companyName,
            phone: brandingData.phone,
            email: brandingData.email,
            website: brandingData.website,
            license: brandingData.license,
            logoUrl: brandingData.logoUrl,
            primaryColor: brandingData.primaryColor,
          },
          reportId: report.id,
          generatedBy,
        };

        const pdfBuffer = renderWeatherReportPDF(pdfInput);

        const pdfResult = await saveAiPdfToStorage({
          orgId,
          claimId,
          userId,
          type: "WEATHER",
          label: `Weather Report - ${body.address}`,
          pdfBuffer,
          visibleToClient: true,
          aiReportId: report.id,
        });

        pdfSaved = true;
        pdfUrl = pdfResult.publicUrl;
        logger.info(`[Weather API] PDF saved for claim ${claimId}`, { pdfUrl });
      }
    } catch (pdfError) {
      logger.error("[Weather API] PDF generation failed (non-critical):", pdfError);
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
