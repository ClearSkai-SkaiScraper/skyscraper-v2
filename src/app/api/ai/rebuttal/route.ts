export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { RebuttalAgent } from "@/agents/rebuttalAgent";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";
import { saveAiPdfToStorage } from "@/lib/reports/saveAiPdfToStorage";
import { saveReportHistory } from "@/lib/reports/saveReportHistory";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { rebuttalSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

/**
 * Rebuttal Letter Generation API Endpoint
 *
 * Generates professional rebuttal letters for carrier denials using AI.
 * Supports multiple tones: professional, firm, legal
 */

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Rate limiting check (10 requests per minute for AI endpoints)
    const identifier = getRateLimitIdentifier(ctx.userId, req);
    const allowed = await rateLimiters.ai.check(10, identifier);

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "rate-limit-exceeded", message: "Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // Parse request body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
    }

    const validated = validateAIRequest(rebuttalSchema, body);
    if (!validated.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "validation-failed",
          message: validated.error,
          details: validated.details,
        },
        { status: 422 }
      );
    }

    const { claimId, denialText, tone = "professional" } = validated.data;

    // Verify claim exists and belongs to org
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId: ctx.orgId,
      },
      select: {
        id: true,
        claimNumber: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ ok: false, error: "claim-not-found" }, { status: 404 });
    }

    // Execute RebuttalAgent
    const agent = new RebuttalAgent();
    const result = await agent.execute(
      { claimId, denialText, tone },
      { orgId: ctx.orgId, userId: ctx.userId }
    );

    // Generate PDF and save to storage (non-blocking)
    let pdfSaved = false;
    try {
      const rebuttalHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Georgia, serif; padding: 50px; line-height: 1.8; max-width: 800px; margin: 0 auto; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; font-size: 28px; }
            h2 { color: #3b82f6; margin-top: 32px; font-size: 20px; }
            .meta { background: #f8fafc; padding: 20px; border-left: 4px solid #3b82f6; margin: 24px 0; }
            .letter-body { white-space: pre-wrap; font-size: 14px; line-height: 1.9; }
            .outline-item { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .citation { background: #fef3c7; padding: 12px; margin: 8px 0; border-left: 3px solid #f59e0b; font-size: 13px; }
            .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #cbd5e1; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>Rebuttal Letter</h1>
          
          <div class="meta">
            <p><strong>Claim Number:</strong> ${claim.claimNumber || claimId}</p>
            <p><strong>Tone:</strong> ${tone.charAt(0).toUpperCase() + tone.slice(1)}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <h2>Letter Content</h2>
          <div class="letter-body">${result.response.letter}</div>

          ${
            result.response.outline && result.response.outline.length > 0
              ? `
            <h2>Letter Outline</h2>
            ${result.response.outline.map((item: string) => `<div class="outline-item">• ${item}</div>`).join("")}
          `
              : ""
          }

          ${
            result.response.citations && result.response.citations.length > 0
              ? `
            <h2>Citations & References</h2>
            ${result.response.citations.map((citation: string) => `<div class="citation">${citation}</div>`).join("")}
          `
              : ""
          }

          ${
            result.response.attachments && result.response.attachments.length > 0
              ? `
            <h2>Recommended Attachments</h2>
            ${result.response.attachments.map((att: string) => `<div class="outline-item">📎 ${att}</div>`).join("")}
          `
              : ""
          }

          <div class="footer">
            <p><strong>Note:</strong> This is an AI-generated rebuttal letter. Review and customize before sending to carrier.</p>
            <p>Tokens Used: ${result.response.tokensUsed || 0}</p>
          </div>
        </body>
        </html>
      `;

      const pdfBuffer = await htmlToPdfBuffer(rebuttalHTML);

      await saveAiPdfToStorage({
        orgId: ctx.orgId,
        claimId,
        userId: ctx.userId,
        type: "REBUTTAL",
        label: `Rebuttal Letter - ${claim.claimNumber || claimId}`,
        pdfBuffer,
        visibleToClient: false, // Internal use only
      });

      pdfSaved = true;
      logger.debug(`[Rebuttal API] PDF saved for claim ${claimId}`);
    } catch (pdfError) {
      logger.error("[Rebuttal API] PDF generation failed (non-critical)", { error: pdfError });
      // Continue - PDF failure should not break the rebuttal response
    }

    // Save as artifact for persistence
    try {
      await prisma.generatedArtifact.create({
        data: {
          orgId: ctx.orgId,
          claimId,
          type: "DENIAL_REBUTTAL",
          title: `Rebuttal Letter - ${tone.charAt(0).toUpperCase() + tone.slice(1)} Tone`,
          content: result.response.letter || JSON.stringify(result.response),
          status: "completed",
          metadata: {
            tone,
            userId: ctx.userId,
            citations: result.response.citations,
            outline: result.response.outline,
          },
        },
      });
    } catch (artifactErr) {
      logger.error("[Rebuttal API] Artifact save failed", { error: artifactErr });
    }

    // Also save to ai_reports for Report History visibility
    try {
      const reportId = `rebuttal-${claimId}-${Date.now()}`;
      await prisma.ai_reports.create({
        data: {
          id: reportId,
          orgId: ctx.orgId,
          claimId,
          userId: ctx.userId,
          userName: "AI Rebuttal",
          type: "rebuttal_letter",
          title: `Rebuttal Letter - ${claim.claimNumber || claimId}`,
          content: result.response.letter || JSON.stringify(result.response),
          tokensUsed: result.response.tokensUsed || 0,
          status: "generated",
          updatedAt: new Date(),
        },
      });
    } catch (historyErr) {
      logger.error("[Rebuttal API] Report history save failed", { error: historyErr });
    }

    // ── Save to report_history table for Reports History page ──
    await saveReportHistory({
      orgId: ctx.orgId,
      userId: ctx.userId,
      type: "rebuttal",
      title: `Rebuttal Letter — ${claim.claimNumber || claimId}`,
      sourceId: claimId,
      fileUrl: null,
      metadata: {
        tone,
        claimNumber: claim.claimNumber,
        pdfSaved,
      },
    });

    return NextResponse.json({
      ok: true,
      claimId,
      claimNumber: claim.claimNumber,
      rebuttal: result,
      pdfSaved,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Rebuttal Generation Error]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "generation-failed",
        // eslint-disable-next-line no-restricted-syntax
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 200 } // Return 200 to prevent demo crashes
    );
  }
}
