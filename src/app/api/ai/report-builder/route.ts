/**
 * AI Report Builder API
 *
 * POST /api/ai/report-builder
 *
 * Generates comprehensive PDF reports from Storm Intake analysis.
 * Integrates with AI pipeline and PDF generation system.
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { createAiConfig, withAiBilling } from "@/lib/ai/withAiBilling";

import { runStormIntakePipeline } from "@/lib/ai/pipelines/stormIntake";
import {
  requireActiveSubscription,
  SubscriptionRequiredError,
} from "@/lib/billing/requireActiveSubscription";
import { generatePDFBuffer } from "@/lib/pdf/reportBuilder";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportBuilderSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

async function POST_INNER(req: NextRequest, ctx: { userId: string; orgId: string | null }) {
  try {
    const { userId } = ctx;
    const orgId = ctx.orgId;

    // ── Billing guard ──
    if (orgId) {
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

    const body = await req.json();
    const validated = validateAIRequest(reportBuilderSchema, body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: validated.error, details: validated.details },
        { status: 422 }
      );
    }

    const { claimId, images, property } = validated.data;

    logger.debug("[Report Builder] Request received for claimId:", claimId);
    logger.debug("[Report Builder] Images count:", images?.length);

    // Fetch claim details
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
      },
    });

    if (!claim) {
      return NextResponse.json({ success: false, error: "Claim not found" }, { status: 404 });
    }

    // Get org context
    const claimOrgId = claim.orgId || "unknown";

    // Validate images are valid URLs or data URIs
    const validImages = images.filter((img: string) => {
      if (!img || typeof img !== "string") return false;
      return (
        img.startsWith("http") ||
        img.startsWith("data:") ||
        img.startsWith("/") ||
        img.startsWith("blob:")
      );
    });

    if (validImages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid image URLs found. Please ensure photos are uploaded correctly.",
        },
        { status: 400 }
      );
    }

    logger.debug("[Report Builder] Starting analysis for claim:", claimId);
    logger.debug("[Report Builder] Processing images", {
      valid: validImages.length,
      total: images.length,
    });

    // Run Storm Intake Pipeline
    const pipelineResult = await runStormIntakePipeline({
      images: validImages,
      claimId,
      orgId: claimOrgId,
      propertyAddress: property?.address,
      lossDate: claim.dateOfLoss || undefined,
      damageType: claim.damageType || undefined,
    });

    if (!pipelineResult.success || !pipelineResult.results) {
      logger.error("[Report Builder] Pipeline failed", { error: pipelineResult.error });
      return NextResponse.json(
        {
          success: false,
          error: pipelineResult.error || "AI analysis failed",
        },
        { status: 500 }
      );
    }

    logger.debug("[Report Builder] Analysis complete, generating PDF");

    // Build report data
    const reportData = {
      claimId,
      claimNumber: claim.claimNumber || undefined,
      property: {
        address: claim.properties?.street || property?.address || "Unknown Address",
        city: claim.properties?.city || property?.city || "",
        state: claim.properties?.state || property?.state || "",
        zip: claim.properties?.zipCode || property?.zip || "",
      },
      analysis: pipelineResult.results,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      orgName: undefined, // Could fetch from org table if needed
    };

    // Generate PDF
    const pdfBuffer = await generatePDFBuffer(reportData);

    logger.debug("[Report Builder] PDF generated successfully");
    logger.debug(`[Report Builder] PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SkaiScraper_Report_${claimId}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error("[Report Builder] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

export const POST = withAiBilling(
  createAiConfig("report_builder", { costPerRequest: 30 }),
  POST_INNER
);
