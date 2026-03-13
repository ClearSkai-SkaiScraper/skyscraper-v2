/**
 * ============================================================================
 * VISION → REPORT ENGINE CONNECTOR
 * ============================================================================
 *
 * Generates professional inspection reports from vision pipeline results.
 * Takes detection data + AI analysis and produces structured reports
 * ready for PDF generation or client delivery.
 *
 * @route POST /api/ai/vision/report
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/ai/client";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const ReportInputSchema = z.object({
  /** Claim ID to generate report for */
  claimId: z.string().min(1),

  /** Report type */
  reportType: z
    .enum([
      "damage_assessment",
      "inspection_summary",
      "scope_of_work",
      "supplement_justification",
      "progress_report",
    ])
    .default("damage_assessment"),

  /** Vision pipeline results (from /api/ai/vision/pipeline) */
  visionResults: z
    .object({
      detections: z.array(z.any()).optional().default([]),
      aiAnalysis: z.any().optional(),
      categorized: z.record(z.array(z.any())).optional().default({}),
    })
    .optional(),

  /** Photo organizer results (from /api/ai/photos/organize) */
  photoResults: z
    .object({
      photos: z.array(z.any()).optional().default([]),
      summary: z.any().optional(),
    })
    .optional(),

  /** Blueprint analysis results (from /api/ai/blueprint/analyze) */
  blueprintResults: z.any().optional(),

  /** Additional notes */
  notes: z.string().optional(),

  /** Whether to include IRC/IBC code references */
  includeCodeReferences: z.boolean().optional().default(true),
});

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  const start = Date.now();

  try {
    const body = await req.json();
    const input = ReportInputSchema.parse(body);

    // Fetch claim + property data
    const claim = await prisma.claims.findFirst({
      where: { id: input.claimId, orgId },
      include: {
        properties: true,
        damage_assessments: {
          orderBy: { created_at: "desc" },
          take: 5,
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ ok: false, error: "Claim not found" }, { status: 404 });
    }

    // Fetch org branding for report header
    let branding: any = null;
    try {
      branding = await prisma.org_branding.findFirst({
        where: { orgId },
      });
    } catch {
      // Non-critical
    }

    // Build comprehensive report using GPT-4o
    const openai = getOpenAI();

    const detectionSummary = input.visionResults?.detections?.length
      ? `YOLO detected ${input.visionResults.detections.length} items across categories: ${Object.keys(input.visionResults.categorized || {}).join(", ")}`
      : "No YOLO detections available";

    const aiSummary = input.visionResults?.aiAnalysis
      ? `AI Analysis: Severity=${input.visionResults.aiAnalysis.overallSeverity}, Types=${(input.visionResults.aiAnalysis.damageTypes || []).join(", ")}, ${input.visionResults.aiAnalysis.description}`
      : "";

    const photoSummary = input.photoResults?.summary
      ? `Photo Analysis: ${input.photoResults.summary.totalPhotos} photos, ${input.photoResults.summary.withDamage} showing damage`
      : "";

    const blueprintSummary = input.blueprintResults?.analysis?.summary || "";

    const reportPrompt = `Generate a professional ${input.reportType.replace(/_/g, " ")} report.

PROPERTY INFORMATION:
- Address: ${claim.properties?.street || "N/A"}, ${claim.properties?.city || ""}, ${claim.properties?.state || ""} ${claim.properties?.zipCode || ""}
- Claim #: ${claim.claimNumber}
- Date of Loss: ${claim.dateOfLoss?.toLocaleDateString() || "N/A"}
- Damage Type: ${claim.damageType}
- Carrier: ${claim.carrier || "N/A"}
- Insured: ${claim.insured_name || "N/A"}

VISION ANALYSIS RESULTS:
${detectionSummary}
${aiSummary}
${photoSummary}
${blueprintSummary}

${input.notes ? `ADDITIONAL NOTES: ${input.notes}` : ""}

${input.includeCodeReferences ? "Include relevant IRC/IBC building code references for each finding." : ""}

Generate a structured report with these sections:
1. Executive Summary
2. Property Description
3. Damage Findings (by component/area)
4. Photographic Evidence Summary
5. IRC/IBC Code References (if applicable)
6. Recommended Repairs
7. Estimated Scope of Work
8. Conclusion

Use professional contractor/adjuster language. Be specific with measurements and damage descriptions.
Reference specific photo categories and detection counts where available.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert property damage assessment specialist writing professional inspection reports for insurance claims. 
Your reports are used by contractors, adjusters, and insurance carriers. 
Be thorough, precise, and use industry-standard terminology.
Format with clear headers and bullet points.
Include IRC/IBC code references where applicable.`,
        },
        { role: "user", content: reportPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    const reportContent = response.choices[0]?.message?.content || "";

    // Save report to database
    let reportId: string | null = null;
    try {
      const report = await prisma.reports.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          claimId: input.claimId,
          title: `${input.reportType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — ${claim.claimNumber}`,
          type: input.reportType,
          createdById: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          sections: {
            content: reportContent,
            visionDetections: input.visionResults?.detections?.length || 0,
            photoCount: input.photoResults?.photos?.length || 0,
            hasBlueprint: !!input.blueprintResults,
            model: "gpt-4o",
          },
        },
      });
      reportId = report.id;
    } catch (saveErr) {
      logger.warn("[VISION_REPORT] Failed to save report to DB", {
        error: saveErr instanceof Error ? saveErr.message : String(saveErr),
      });
    }

    logger.info("[VISION_REPORT] Report generated", {
      claimId: input.claimId,
      reportType: input.reportType,
      reportId,
      processingTimeMs: Date.now() - start,
    });

    return NextResponse.json({
      ok: true,
      report: {
        id: reportId,
        title: `${input.reportType.replace(/_/g, " ")} — ${claim.claimNumber}`,
        content: reportContent,
        type: input.reportType,
        claimNumber: claim.claimNumber,
        property: {
          street: claim.properties?.street,
          city: claim.properties?.city,
          state: claim.properties?.state,
          zipCode: claim.properties?.zipCode,
        },
        branding: branding
          ? {
              companyName: branding.companyName,
              logoUrl: branding.logoUrl,
              primaryColor: branding.primaryColor,
            }
          : null,
      },
      meta: {
        processingTimeMs: Date.now() - start,
        model: "gpt-4o",
        visionDetections: input.visionResults?.detections?.length || 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("[VISION_REPORT] Fatal error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ ok: false, error: "Report generation failed" }, { status: 500 });
  }
});
