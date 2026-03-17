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
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";
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

    // Generate PDF and save to storage (non-blocking)
    let pdfSaved = false;
    let pdfUrl: string | null = null;
    try {
      if (body.claim_id && orgId) {
        // Build weather conditions table rows
        const weatherRows = weatherConditions
          .map(
            (w) => `
          <tr>
            <td style="font-weight:600;">${new Date(w.datetime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
            <td>${w.tempmax?.toFixed(0) || "—"}° / ${w.tempmin?.toFixed(0) || "—"}°F</td>
            <td style="color:${w.precip > 0.1 ? "#2563eb" : "#6b7280"}">${w.precip?.toFixed(2) || "0.00"}"</td>
            <td>${w.precipprob?.toFixed(0) || 0}%</td>
            <td style="color:${(w.windspeed || 0) > 30 ? "#dc2626" : "#6b7280"}">${w.windspeed?.toFixed(0) || "—"} mph${w.windgust ? ` (${w.windgust.toFixed(0)} gust)` : ""}</td>
            <td><strong>${w.conditions || "—"}</strong></td>
          </tr>
        `
          )
          .join("");

        const weatherHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page { size: Letter; margin: 0; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                color: #1f2937;
                font-size: 11px;
                line-height: 1.5;
                padding: 32px 36px;
                background: #ffffff;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px solid #1e40af;
                padding-bottom: 12px;
                margin-bottom: 16px;
              }
              .company-name { font-size: 18px; font-weight: 800; color: #1e40af; }
              .badge {
                display: inline-block;
                background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                color: white;
                padding: 6px 14px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .meta-grid {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 8px 20px;
                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 14px 18px;
                margin-bottom: 16px;
              }
              .meta-grid .label { color: #64748b; font-weight: 600; font-size: 9px; text-transform: uppercase; }
              .meta-grid .value { font-weight: 600; color: #0f172a; font-size: 11px; }
              .section-title {
                font-size: 13px;
                font-weight: 700;
                color: #1e40af;
                margin: 16px 0 8px;
                padding-bottom: 4px;
                border-bottom: 2px solid #e2e8f0;
                display: flex;
                align-items: center;
                gap: 6px;
              }
              .stats-row {
                display: flex;
                gap: 12px;
                margin-bottom: 14px;
              }
              .stat-card {
                flex: 1;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 12px 14px;
                text-align: center;
              }
              .stat-card.peril { border-left: 4px solid #dc2626; }
              .stat-card.radar { border-left: 4px solid #2563eb; }
              .stat-card.location { border-left: 4px solid #059669; }
              .stat-value { font-size: 18px; font-weight: 800; }
              .stat-value.peril { color: #dc2626; }
              .stat-value.radar { color: #2563eb; }
              .stat-value.location { color: #059669; }
              .stat-label { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
              .summary-box {
                background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
                border: 1px solid #bfdbfe;
                border-left: 4px solid #1e40af;
                border-radius: 8px;
                padding: 14px 18px;
                margin: 12px 0;
                font-size: 11px;
                line-height: 1.6;
              }
              .summary-box h4 { font-size: 12px; color: #1e40af; margin-bottom: 6px; }
              .carrier-box {
                background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
                border: 1px solid #fbbf24;
                border-left: 4px solid #f59e0b;
                border-radius: 8px;
                padding: 12px 16px;
                margin: 12px 0;
              }
              .carrier-box h4 { font-size: 11px; color: #92400e; margin-bottom: 6px; }
              .carrier-box p { font-size: 10px; color: #78350f; line-height: 1.5; }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 10px;
                margin: 8px 0;
              }
              th {
                background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                color: white;
                padding: 8px 10px;
                text-align: left;
                font-size: 9px;
                font-weight: 600;
              }
              td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
              tr:nth-child(even) { background: #f9fafb; }
              .event-card {
                background: #fffbeb;
                border: 1px solid #fcd34d;
                border-left: 4px solid #f59e0b;
                padding: 10px 14px;
                margin: 8px 0;
                border-radius: 6px;
              }
              .event-card strong { color: #92400e; }
              .radar-section {
                background: #0f172a;
                border-radius: 8px;
                padding: 16px;
                margin-top: 16px;
              }
              .radar-section h3 { color: #f8fafc; font-size: 12px; margin-bottom: 10px; }
              .radar-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
              }
              .radar-frame {
                background: #1e293b;
                border-radius: 6px;
                overflow: hidden;
                text-align: center;
              }
              .radar-frame img { width: 100%; height: auto; display: block; }
              .radar-frame .caption { color: #94a3b8; font-size: 9px; padding: 6px 8px; }
              .radar-note { font-size: 9px; color: #64748b; margin-top: 10px; font-style: italic; }
              .no-data { color: #9ca3af; font-style: italic; padding: 12px; text-align: center; background: #f9fafb; border-radius: 6px; }
              .footer {
                margin-top: 16px;
                padding-top: 10px;
                border-top: 1px solid #e2e8f0;
                font-size: 8px;
                color: #94a3b8;
                display: flex;
                justify-content: space-between;
              }
            </style>
          </head>
          <body>
            <!-- HEADER -->
            <div class="header">
              <div class="company-name">SkaiScraper Weather Intelligence</div>
              <div class="badge">Comprehensive Weather Report</div>
            </div>

            <!-- CLAIM META GRID -->
            <div class="meta-grid">
              <div><div class="label">Property Address</div><div class="value">${body.address}</div></div>
              <div><div class="label">Date of Loss</div><div class="value">${aiReport.dol || body.dol}</div></div>
              <div><div class="label">Primary Peril</div><div class="value">${aiReport.peril || "Unknown"}</div></div>
              <div><div class="label">Coordinates</div><div class="value">${lat.toFixed(4)}, ${lng.toFixed(4)}</div></div>
              <div><div class="label">Nearest Radar</div><div class="value">${radarStationId || "N/A"}</div></div>
              <div><div class="label">Generated</div><div class="value">${new Date().toLocaleString()}</div></div>
            </div>

            <!-- KEY METRICS -->
            <div class="stats-row">
              <div class="stat-card peril">
                <div class="stat-value peril">${aiReport.peril || "—"}</div>
                <div class="stat-label">Primary Peril</div>
              </div>
              <div class="stat-card radar">
                <div class="stat-value radar">${radarStationId || "—"}</div>
                <div class="stat-label">Radar Station</div>
              </div>
              <div class="stat-card location">
                <div class="stat-value location">${weatherConditions.length || 0}</div>
                <div class="stat-label">Weather Days Analyzed</div>
              </div>
            </div>

            <!-- AI SUMMARY -->
            <div class="summary-box">
              <h4>🔍 Executive Summary</h4>
              <p>${aiReport.summary || "No summary available."}</p>
            </div>
            
            ${
              aiReport.carrierTalkingPoints
                ? `
              <div class="carrier-box">
                <h4>📋 Carrier Talking Points</h4>
                <p>${aiReport.carrierTalkingPoints}</p>
              </div>
            `
                : ""
            }

            ${
              weatherConditions.length > 0
                ? `
              <!-- WEATHER CONDITIONS TABLE -->
              <div class="section-title">🌤️ Visual Crossing Weather Data — 3-Day Window</div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Temp (H/L)</th>
                    <th>Precip</th>
                    <th>Precip %</th>
                    <th>Wind</th>
                    <th>Conditions</th>
                  </tr>
                </thead>
                <tbody>${weatherRows}</tbody>
              </table>
            `
                : ""
            }

            ${
              aiReport.events && aiReport.events.length > 0
                ? `
              <div class="section-title">⚡ Weather Events Detected</div>
              ${aiReport.events
                .map(
                  (e: any) => `
                <div class="event-card">
                  <p><strong>${e.date || "Unknown Date"}:</strong> ${e.description || e.type || "Weather Event"}</p>
                  ${e.severity ? `<p style="margin-top:4px;font-size:10px;">Severity: <strong>${e.severity}</strong></p>` : ""}
                  ${e.hailSize ? `<p style="font-size:10px;">Hail Size: <strong>${e.hailSize}</strong></p>` : ""}
                  ${e.windSpeed ? `<p style="font-size:10px;">Wind Speed: <strong>${e.windSpeed}</strong></p>` : ""}
                </div>
              `
                )
                .join("")}
            `
                : ""
            }

            ${
              radarImages.length > 0
                ? `
              <div class="radar-section">
                <h3>📡 NEXRAD Radar Imagery — ${aiReport.dol || body.dol}</h3>
                <p style="color:#94a3b8;font-size:10px;margin-bottom:10px;">
                  Radar composites from station <strong style="color:#60a5fa;">${radarStationId || "N/A"}</strong> 
                  showing precipitation patterns on the date of loss.
                </p>
                <div class="radar-grid">
                  ${radarImages
                    .filter((img) => img.url.includes("n0q_"))
                    .slice(0, 6)
                    .map(
                      (img) => `
                      <div class="radar-frame">
                        <img src="${img.url}" alt="${img.label}" onerror="this.style.display='none'" />
                        <div class="caption">${img.label}</div>
                      </div>
                    `
                    )
                    .join("")}
                </div>
                <p class="radar-note">Source: Iowa Environmental Mesonet NEXRAD Archive / NWS RIDGE. 
                Images show base reflectivity (n0q) composites. Brighter colors indicate heavier precipitation.</p>
              </div>
            `
                : ""
            }

            <!-- FOOTER -->
            <div class="footer">
              <span>Generated by SkaiScraper Weather Intelligence • ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span>Sources: Visual Crossing, Iowa Mesonet NEXRAD, NWS RIDGE • Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
            </div>
          </body>
          </html>
        `;

        const pdfBuffer = await htmlToPdfBuffer(weatherHTML);

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
        logger.debug(`[Weather API] Saved to file_assets for claim ${body.claim_id}`);
      } catch (faErr) {
        logger.warn("[Weather API] Could not save to file_assets:", faErr);
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
