export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PHASE 3 SPRINT 3: POST /api/proposals/build
 * Builds a new proposal draft with AI-generated content
 */

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { requireActiveSubscription, SubscriptionRequiredError } from "@/lib/billing/requireActiveSubscription";
import prisma from "@/lib/prisma";
import { draftProposalSections } from "@/lib/proposals/ai";
import {
    buildProposalContext,
    validateProposalContext,
} from "@/lib/proposals/context";
import type {
    ProposalBuildRequest,
    ProposalBuildResponse,
} from "@/lib/proposals/types";
import { checkRateLimit } from "@/lib/rate-limit";

// Token system removed — flat $80/month pricing includes all features

export async function POST(request: Request) {
  try {
    // Authenticate user (dev bypass support)
    const { userId, orgId } = await auth();
    let effectiveUserId = userId;
    let effectiveOrgId = orgId;
    const devKeyHeader = request.headers.get("x-dev-proposal-key");
    const devKeyEnv = process.env.PROPOSAL_DEV_KEY;
    if (!effectiveUserId && devKeyEnv && devKeyHeader === devKeyEnv && process.env.NODE_ENV !== "production") {
      // Find first user/org as a safe dev surrogate
      try {
        const firstUser = await prisma.users.findFirst({ select: { clerkUserId: true, orgId: true } });
        if (firstUser) {
          effectiveUserId = firstUser.clerkUserId;
          effectiveOrgId = firstUser.orgId;
        } else {
          effectiveUserId = "dev-bypass-user";
          effectiveOrgId = null;
        }
      } catch {
        effectiveUserId = "dev-bypass-user";
        effectiveOrgId = null;
      }
    }
    if (!effectiveUserId || !effectiveOrgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Billing guard ──
    try {
      await requireActiveSubscription(effectiveOrgId);
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
    const rl = await checkRateLimit(effectiveUserId, "AI");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests. Please try again later.", retryAfter: rl.reset },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    // Parse request body
    const body: ProposalBuildRequest = await request.json();
    const { leadId, jobId, packetType, tone } = body;

    if (!leadId || !jobId || !packetType) {
      return NextResponse.json(
        { error: "Missing required fields: leadId, jobId, packetType" },
        { status: 400 }
      );
    }

    if (
      packetType !== "retail" &&
      packetType !== "claims" &&
      packetType !== "contractor"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid packetType. Must be 'retail', 'claims', or 'contractor'",
        },
        { status: 400 }
      );
    }

    // Track analytics: proposal_build_started
    logger.info("[Analytics] proposal_build_started", {
      userId: effectiveUserId,
      orgId: effectiveOrgId,
      leadId,
      jobId,
      packetType,
      tone,
    });

    // Build proposal context from database (map not found/mismatch errors to 404)
    let context;
    try {
      context = await buildProposalContext({ orgId: effectiveOrgId, leadId, jobId });
    } catch (e) {
      const msg = e?.message || '';
      if (msg.startsWith('NOT_FOUND:')) {
        const parts = msg.split(':');
        return NextResponse.json({ error: `${parts[1]} not found`, id: parts[2] }, { status: 404 });
      }
      if (msg.startsWith('MISMATCH:')) {
        return NextResponse.json({ error: 'Job lead linkage mismatch', details: msg }, { status: 409 });
      }
      throw e;
    }

    // Validate context has required data
    const validation = validateProposalContext(context, packetType);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Incomplete data for proposal generation",
          missing: validation.missing,
        },
        { status: 400 }
      );
    }

    // Generate AI content with optional tone preset
    const ai = await draftProposalSections(context, packetType, tone);

    // Create ProposalDraft record
    const draft = await prisma.proposal_drafts.create({
      data: {
        id: crypto.randomUUID(),
        org_id: effectiveOrgId,
        user_id: effectiveUserId,
        lead_id: leadId,
        job_id: jobId,
        packet_type: packetType,
        context_json: context as any, // JSON field
        ai_summary: ai.summary,
        ai_scope: ai.scope,
        ai_terms: ai.terms,
        ai_notes: ai.notes,
        status: "draft",
        template:
          packetType === "retail"
            ? "retail/v1"
            : packetType === "claims"
              ? "claims/v1"
              : "contractor/v1",
      },
    });

    // Track analytics: proposal_build_succeeded
    logger.info("[Analytics] proposal.build.succeeded", {
      userId: effectiveUserId,
      orgId: effectiveOrgId,
      leadId,
      jobId,
      packetType,
      tone: tone || "auto",
      draftId: draft.id,
    });

    const response: ProposalBuildResponse = {
      draftId: draft.id,
      ai,
      context,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("[API] /api/proposals/build error:", error);
    return NextResponse.json(
      {
        error: "Failed to build proposal",
      },
      { status: 500 }
    );
  }
}
