/**
 * POST /api/pipeline/move
 * Move a claim or lead to a new pipeline stage
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, { orgId: userOrgId, userId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { claimId, leadId, stage } = body;

    if (!stage) {
      return NextResponse.json({ error: "Stage is required" }, { status: 400 });
    }

    // Handle claim moves
    if (claimId) {
      const claim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: { id: true, orgId: true, status: true },
      });

      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      // Tenant isolation: verify claim belongs to user's org
      if (claim.orgId !== userOrgId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      // Map pipeline stage to claim status
      const stageToStatus: Record<string, string> = {
        new: "new",
        draft: "new",
        qualified: "in_progress",
        proposal: "in_progress",
        negotiation: "in_progress",
        approved: "in_progress",
        won: "completed",
        closed: "completed",
      };

      // Map pipeline stage to valid ClaimLifecycleStage enum values
      // Valid enum: FILED, ADJUSTER_REVIEW, APPROVED, DENIED, APPEAL, BUILD, COMPLETED, DEPRECIATION
      const stageToLifecycle: Record<string, string> = {
        new: "FILED",
        draft: "FILED",
        qualified: "ADJUSTER_REVIEW",
        proposal: "APPROVED",
        negotiation: "APPROVED",
        approved: "APPROVED",
        won: "COMPLETED",
        closed: "COMPLETED",
      };

      const newStatus = stageToStatus[stage] || stage;
      const newLifecycle = stageToLifecycle[stage] || null;

      const updated = await prisma.claims.update({
        where: { id: claimId },
        data: {
          status: newStatus,
          ...(newLifecycle ? { lifecycle_stage: newLifecycle as any } : {}),
          updatedAt: new Date(),
        },
        select: { id: true, status: true, lifecycle_stage: true, updatedAt: true },
      });

      return NextResponse.json({
        success: true,
        stage,
        status: updated.status,
        lifecycle_stage: updated.lifecycle_stage,
      });
    }

    // Handle lead moves
    if (leadId) {
      // Tenant isolation: verify lead belongs to user's org
      const lead = await prisma.leads.findUnique({
        where: { id: leadId },
        select: { id: true, orgId: true },
      });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      if (lead.orgId !== userOrgId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const updated = await prisma.leads.update({
        where: { id: leadId },
        data: { stage, updatedAt: new Date() },
        select: { id: true, stage: true, updatedAt: true },
      });

      return NextResponse.json({ success: true, stage: updated.stage });
    }

    return NextResponse.json({ error: "claimId or leadId required" }, { status: 400 });
  } catch (error) {
    logger.error("[PIPELINE_MOVE]", error);
    return NextResponse.json({ error: "Failed to move job" }, { status: 500 });
  }
});
