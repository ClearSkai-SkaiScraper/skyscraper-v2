export const dynamic = "force-dynamic";

/**
 * PHASE 41: Carrier Compliance API Route
 * POST /api/carrier/compliance
 *
 * Analyzes contractor scope for carrier-specific compliance
 * Returns conflicts, recommendations, and carrier-friendly adjusted scope
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";

import {
  analyzeScopeForCarrierConflicts,
  generateCarrierFriendlyScope,
  generateComplianceSummary,
  type ScopeLineItem,
} from "@/lib/ai/carrierComplianceEngine";
import { detectCarrier } from "@/lib/ai/carrierDetect";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, getRateLimitError } from "@/lib/ratelimit";
import { track } from "@/lib/track";

// Input validation schema
const ComplianceRequestSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  scope: z.array(
    z.object({
      code: z.string(),
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number(),
      totalPrice: z.number(),
      category: z.string().optional(),
    })
  ),
  manualCarrier: z.string().optional(),
  adjusterEmail: z.string().optional(),
  policyPDFText: z.string().optional(),
});

export const POST = withAuth(async (request: NextRequest, { orgId, userId }) => {
  try {
    // 1. Rate limiting
    const rateLimit = await checkRateLimit(userId, "API");
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: getRateLimitError(rateLimit.reset),
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate request
    const body = await request.json();
    const parsed = ComplianceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { leadId, scope, manualCarrier, adjusterEmail, policyPDFText } = parsed.data;

    // 4. Get lead and verify ownership
    const lead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        orgId,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 7. Detect carrier
    const carrierDetection = detectCarrier({
      manualCarrier,
      adjusterEmail,
      policyPDFText,
      leadNotes: lead.description || undefined,
    });

    if (!carrierDetection.carrierName || !carrierDetection.rules) {
      return NextResponse.json(
        {
          error: "Unable to detect carrier",
          message: "Please provide carrier name, adjuster email, or policy PDF",
          detectedFrom: carrierDetection.detectedFrom,
        },
        { status: 400 }
      );
    }

    // 8. Analyze scope for conflicts
    const conflicts = analyzeScopeForCarrierConflicts(
      scope as ScopeLineItem[],
      carrierDetection.rules
    );

    // 9. Generate carrier-friendly scope
    const adjustments = generateCarrierFriendlyScope(
      scope as ScopeLineItem[],
      carrierDetection.rules
    );

    // 10. Generate compliance summary
    const summary = generateComplianceSummary(scope as ScopeLineItem[], carrierDetection.rules);

    // 11. Save carrier profile
    await prisma.carrierProfile.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        leadId: leadId,
        carrierName: carrierDetection.carrierName,
        detectedFrom: carrierDetection.detectedFrom,
        confidence: carrierDetection.confidence,
        guidelinesJson: carrierDetection.rules as any,
        updatedAt: new Date(),
      },
    });

    // 12. Track analytics
    await track("carrier_detected", {
      props: {
        leadId,
        orgId,
        carrier: carrierDetection.carrierName,
        confidence: carrierDetection.confidence,
        detectedFrom: carrierDetection.detectedFrom,
        conflictsFound: conflicts.length,
        criticalIssues: summary.criticalIssues,
      },
    }).catch(logger.error);

    // 13. Return comprehensive report
    return NextResponse.json({
      success: true,
      carrier: {
        name: carrierDetection.carrierName,
        confidence: carrierDetection.confidence,
        detectedFrom: carrierDetection.detectedFrom,
        alternativePossibilities: carrierDetection.alternativePossibilities,
      },
      rules: carrierDetection.rules,
      conflicts,
      adjustments,
      summary,
      recommendedScope: adjustments
        .map((adj) => adj.adjustedItem)
        .filter((item) => item.quantity > 0),
    });
  } catch (error) {
    logger.error("Carrier compliance error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Unknown error",
      },
      { status: 500 }
    );
  }
});
