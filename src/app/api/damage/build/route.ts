export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { runDamageBuilder } from "@/lib/ai/damage";
import { withOrgScope } from "@/lib/auth/tenant";
import { requireActiveSubscription, SubscriptionRequiredError } from "@/lib/billing/requireActiveSubscription";
import { getDelegate } from "@/lib/db/modelAliases";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Types for request/response payload
type DamageBuildRequest = {
  claimId?: string | null;
  leadId?: string | null;
  photos: {
    url: string;
    id?: string;
    label?: string;
    tags?: string[];
  }[];
  hoverData?: unknown;
  carrierEstimateText?: string | null;
  notesText?: string | null;
};

/**
 * POST /api/damage/build
 * AI-powered damage assessment builder
 * Analyzes photos and data to generate damage findings
 */
export const POST = withOrgScope(async (req: Request, { userId, orgId }) => {
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
        { error: "rate_limit_exceeded", message: "Too many requests. Please try again later.", retryAfter: rl.reset },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const body = (await req.json()) as DamageBuildRequest;

    if (!body || !Array.isArray(body.photos) || body.photos.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required." },
        { status: 400 }
      );
    }

    logger.debug("[Damage Builder] Starting analysis for user:", userId);
    logger.info("[Damage Builder] Input:", {
      claimId: body.claimId,
      leadId: body.leadId,
      photoCount: body.photos.length,
      hasHoverData: !!body.hoverData
    });

    // Call AI engine to analyze damage
    const aiResult = await runDamageBuilder({
      claimId: body.claimId ?? null,
      leadId: body.leadId ?? null,
      orgId,       // DB-verified — never null or "default"
      userId,
      photos: body.photos,
      hoverData: body.hoverData ?? null,
      carrierEstimateText: body.carrierEstimateText ?? null,
      notesText: body.notesText ?? null,
    });

    const damageAssessment = await getDelegate('damageAssessment').create({
      data: {
        orgId,
        claimId: body.claimId || undefined,
        leadId: body.leadId || undefined,
        createdById: userId,
        primaryPeril: aiResult.peril,
        confidence: aiResult.confidence,
        summary: aiResult.summary,
        metadata: {
          ...aiResult.meta,
          hoverData: aiResult.hoverData ?? body.hoverData ?? null,
        } as Record<string, unknown>,
      },
    });

    // Create findings tied to this assessment
    let createdFindings: any[] = [];
    
    if (Array.isArray(aiResult.findings) && aiResult.findings.length > 0) {
      createdFindings = await Promise.all(
        aiResult.findings.map((f: any) =>
          prisma.damage_findings.create({
            data: {
              id: crypto.randomUUID(),
              damage_assessment_id: damageAssessment.id,
              location_facet: f.location?.facet ?? null,
              elevation: f.location?.elevation ?? null,
              location_notes: f.location?.notes ?? f.location?.facet ?? null,
              damage_type: f.damageType ?? "unknown",
              material: f.material ?? null,
              severity: f.severity ?? null,
              peril_attribution: f.perilAttribution ?? null,
              description: f.description ?? null,
              recommended_action: f.recommendedAction ?? null,
              suggested_line_items: f.suggestedLineItems ?? [],
              updated_at: new Date(),
            },
          })
        )
      );
    }

    return NextResponse.json(
      {
        damageAssessmentId: damageAssessment.id,
        assessment: damageAssessment,
        findings: createdFindings,
      },
      { status: 200 }
    );
  } catch (err) {
    logger.error("Error in /api/damage/build:", err);
    return NextResponse.json(
      { error: "Failed to build damage assessment." },
      { status: 500 }
    );
  }
});
