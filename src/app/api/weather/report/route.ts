import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { runWeatherReport, WeatherReportInput } from "@/lib/ai/weather";
import { withAuth } from "@/lib/auth/withAuth";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";
import { saveAiPdfToStorage } from "@/lib/reports/saveAiPdfToStorage";

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

    const aiReport = await runWeatherReport({
      ...body,
      // Accept either claimId or claim_id (UI uses claim_id)
      claimId: (body.claimId ?? body.claim_id ?? null) as string | null,
      orgId: orgId ?? null,
    });

    const report = await prisma.weather_reports.create({
      data: {
        id: randomUUID(),
        claimId: body.claim_id ?? (body.claimId as string | undefined) ?? null,
        createdById: userId,
        updatedAt: new Date(),
        mode: "full_report",
        address: body.address,
        dol: aiReport.dol ? new Date(aiReport.dol) : null,
        primaryPeril: aiReport.peril ?? null,
        globalSummary: {
          overallAssessment: aiReport.summary,
          contractorNarrative: aiReport.carrierTalkingPoints,
        },
        events: aiReport.events ?? [],
        providerRaw: aiReport,
      },
    });

    // Generate PDF and save to storage (non-blocking)
    let pdfSaved = false;
    try {
      if (body.claim_id && orgId) {
        const weatherHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
              h2 { color: #3b82f6; margin-top: 24px; }
              .meta { background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; }
              .event { background: #fef3c7; padding: 12px; margin: 10px 0; border-left: 4px solid #f59e0b; }
              .confidence { font-weight: bold; color: #059669; }
            </style>
          </head>
          <body>
            <h1>Weather Report</h1>
            <div class="meta">
              <p><strong>Address:</strong> ${body.address}</p>
              <p><strong>Date of Loss:</strong> ${aiReport.dol || body.dol}</p>
              <p><strong>Primary Peril:</strong> ${aiReport.peril || "Unknown"}</p>
              <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <h2>Summary</h2>
            <p>${aiReport.summary || "No summary available."}</p>
            
            ${
              aiReport.carrierTalkingPoints
                ? `
              <h2>Carrier Talking Points</h2>
              <p>${aiReport.carrierTalkingPoints}</p>
            `
                : ""
            }
            
            ${
              aiReport.events && aiReport.events.length > 0
                ? `
              <h2>Weather Events</h2>
              ${aiReport.events
                .map(
                  (e: any) => `
                <div class="event">
                  <p><strong>${e.date || "Unknown Date"}:</strong> ${e.description || e.type || "Event"}</p>
                  ${e.severity ? `<p>Severity: ${e.severity}</p>` : ""}
                  ${e.hailSize ? `<p>Hail Size: ${e.hailSize}</p>` : ""}
                  ${e.windSpeed ? `<p>Wind Speed: ${e.windSpeed}</p>` : ""}
                </div>
              `
                )
                .join("")}
            `
                : ""
            }
          </body>
          </html>
        `;

        const pdfBuffer = await htmlToPdfBuffer(weatherHTML);

        await saveAiPdfToStorage({
          orgId,
          claimId: body.claim_id,
          userId,
          type: "WEATHER",
          label: `Weather Report - ${body.address}`,
          pdfBuffer,
          visibleToClient: true,
        });

        pdfSaved = true;
        logger.debug(`[Weather API] PDF saved for claim ${body.claim_id}`);
      }
    } catch (pdfError) {
      logger.error("[Weather API] PDF generation failed (non-critical):", pdfError);
      // Continue - PDF failure should not break the weather report
    }

    return NextResponse.json({ report, pdfSaved }, { status: 200 });
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
