export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { runWeatherReport, WeatherReportInput } from "@/lib/ai/weather";
import { logCriticalAction } from "@/lib/audit/criticalActions";
import { withAuth } from "@/lib/auth/withAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { renderWeatherPDF } from "@/lib/pdf/weather-pdf";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { saveAiPdfToStorage } from "@/lib/reports/saveAiPdfToStorage";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";
import { getRadarForEvent } from "@/lib/weather/radarService";

export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // List all reports the user has access to (orgId is DB-backed UUID from withAuth)
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

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // ── Billing guard ── (orgId is DB-backed UUID from withAuth)
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

    let aiReport;
    try {
      aiReport = await runWeatherReport({
        ...body,
        // Accept either claimId or claim_id (UI uses claim_id)
        claimId: (body.claimId ?? body.claim_id ?? null) as string | null,
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

    // ── Fetch NEXRAD radar imagery + Visual Crossing weather data for the DOL ──
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
    let lat = 0;
    let lng = 0;
    try {
      // Geocode address via Open-Meteo (free, no key)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(body.address)}&count=1&language=en&format=json`
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results?.[0]) {
          lat = geoData.results[0].latitude;
          lng = geoData.results[0].longitude;
        }
      }

      if (lat && lng) {
        const dolDate = aiReport.dol || body.dol;
        const radarResult = await getRadarForEvent(lat, lng, dolDate);
        radarImages = radarResult.images;
        radarStationId = radarResult.stationId;
        weatherConditions = radarResult.weatherData || [];
        logger.info("[Weather API] Fetched radar + weather data", {
          stationId: radarStationId,
          radarCount: radarImages.length,
          weatherDays: weatherConditions.length,
        });
      }
    } catch (radarErr) {
      logger.error("[Weather API] Radar/weather fetch failed (non-critical):", radarErr);
      // Continue — radar is supplementary, not critical
    }

    let report;
    try {
      // ── Resolve DB user ID for FK (weather_reports.createdById → users.id) ──
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

      report = await prisma.weather_reports.create({
        data: {
          id: randomUUID(),
          claimId: body.claim_id ?? (body.claimId as string | undefined) ?? null,
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
          },
          events: aiReport.events ?? [],
          providerRaw: aiReport,
        },
      });

      // Audit log weather report generation
      await logCriticalAction("WEATHER_REPORT_GENERATED", userId, orgId || "unknown", {
        reportId: report.id,
        address: body.address,
        dol: body.dol,
        claimId: body.claim_id || null,
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

    // Generate PDF and save to storage using jsPDF (serverless-compatible)
    let pdfSaved = false;
    let pdfUrl: string | null = null;
    try {
      if (body.claim_id && orgId) {
        logger.info("[Weather API] Generating PDF with jsPDF (serverless)", {
          claimId: body.claim_id,
          address: body.address,
        });

        // Use serverless-compatible jsPDF renderer
        const pdfBuffer = renderWeatherPDF({
          address: body.address,
          dol: aiReport.dol || body.dol,
          peril: aiReport.peril,
          summary: aiReport.summary,
          carrierTalkingPoints: aiReport.carrierTalkingPoints,
          events: aiReport.events,
          lat,
          lng,
          radarStationId,
          radarImageCount: radarImages.length,
          weatherConditions,
        });

        const pdfResult = await saveAiPdfToStorage({
          orgId,
          claimId: body.claim_id,
          userId,
          type: "WEATHER",
          label: `Weather Report - ${body.address}`,
          pdfBuffer,
          visibleToClient: true,
          aiReportId: report.id, // Link to weather_reports.id for PDF lookup
        });

        pdfSaved = true;
        pdfUrl = pdfResult.publicUrl;
        logger.debug(`[Weather API] PDF saved for claim ${body.claim_id}`, { pdfUrl });
      }
    } catch (pdfError) {
      logger.error("[Weather API] PDF generation failed (non-critical):", pdfError);
      // Continue - PDF failure should not break the weather report
    }

    // ── Save to report_history so it appears on Reports History page ──
    try {
      await saveReportHistory({
        orgId,
        userId,
        type: "weather_report",
        title: `Weather Report — ${body.address}`,
        sourceId: body.claim_id ?? (body.claimId as string | undefined) ?? null,
        fileUrl: pdfUrl,
        metadata: {
          address: body.address,
          dol: body.dol,
          peril: aiReport.peril,
          pdfSaved,
          reportId: report.id,
        },
      });
    } catch (histErr) {
      logger.error("[Weather API] Report history save failed (non-critical):", histErr);
      // Continue - history save failure should not break the weather report
    }

    // ── Save to file_assets so it appears on the claim's Documents tab ──
    if (body.claim_id && pdfUrl) {
      try {
        const fileAssetId = crypto.randomUUID();
        const storageKey = `claims/${body.claim_id}/weather/report_${Date.now()}.pdf`;

        await prisma.file_assets.create({
          data: {
            id: fileAssetId,
            orgId,
            claimId: body.claim_id,
            ownerId: userId,
            filename: `Weather Report — ${body.address} — ${new Date().toLocaleDateString("en-US")}.pdf`,
            publicUrl: pdfUrl,
            storageKey: storageKey,
            bucket: "documents",
            mimeType: "application/pdf",
            sizeBytes: 0, // Size not available here, but required field
            category: "report",
            file_type: "weather_report",
            visibleToClient: true,
            updatedAt: new Date(),
          },
        });
        logger.info(
          `[Weather API] ✅ Saved to file_assets for claim ${body.claim_id}, fileAssetId=${fileAssetId}`
        );
      } catch (faErr) {
        logger.error("[Weather API] ❌ Could not save to file_assets:", {
          error: faErr,
          claimId: body.claim_id,
          orgId,
          pdfUrl,
        });
      }
    } else {
      logger.warn(
        `[Weather API] Skipped file_assets save: claim_id=${body.claim_id}, pdfUrl=${!!pdfUrl}`
      );
    }

    return NextResponse.json(
      {
        report,
        pdfSaved,
        pdfUrl,
        weatherReportId: report.id,
        radarStation: radarStationId,
        radarImageCount: radarImages.length,
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
