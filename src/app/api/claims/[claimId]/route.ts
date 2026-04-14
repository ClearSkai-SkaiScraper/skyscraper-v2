import { NextResponse } from "next/server";
import { z } from "zod";

import { createForbiddenResponse, requirePermission } from "@/lib/auth/rbac";
import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const claimUpdateSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    damageType: z.string().optional(),
    dateOfLoss: z.string().optional(),
    carrier: z.string().optional(),
    policyNumber: z.string().optional(),
    lifecycleStage: z
      .enum([
        "FILED",
        "INSPECTION_SCHEDULED",
        "INSPECTION_COMPLETE",
        "ADJUSTER_REVIEW",
        "APPROVED",
        "DENIED",
        "APPEAL",
        "IN_PROGRESS",
        "BUILD",
        "WORK_COMPLETE",
        "CLOSEOUT_PENDING",
        "COMPLETED",
        "CLOSED",
        "DEPRECIATION",
      ])
      .optional(),
    lifecycle_stage: z
      .enum([
        "FILED",
        "INSPECTION_SCHEDULED",
        "INSPECTION_COMPLETE",
        "ADJUSTER_REVIEW",
        "APPROVED",
        "DENIED",
        "APPEAL",
        "IN_PROGRESS",
        "BUILD",
        "WORK_COMPLETE",
        "CLOSEOUT_PENDING",
        "COMPLETED",
        "CLOSED",
        "DEPRECIATION",
      ])
      .optional(),
    status: z
      .enum([
        "new",
        "filed",
        "intake",
        "in_progress",
        "build",
        "inspection",
        "supplement",
        "inspection_scheduled",
        "inspection_complete",
        "work_complete",
        "closeout_pending",
        "depreciation",
        "pending",
        "adjuster_review",
        "submitted",
        "in_review",
        "approved",
        "denied",
        "appeal",
        "completed",
        "closed",
        "archived",
      ])
      .optional(),
    claimNumber: z.string().optional(),
    policy_number: z.string().optional(),
    insured_name: z.string().optional(),
    homeowner_email: z.string().email().optional().or(z.literal("")),
    adjusterName: z.string().optional(),
    adjusterPhone: z.string().optional(),
    adjusterEmail: z.string().email().optional().or(z.literal("")),
    estimatedValue: z.number().optional(),
    approvedValue: z.number().optional(),
    deductible: z.number().optional(),
    priority: z.string().optional(),
    lossType: z.string().optional(),
    structureType: z.string().optional(),
    roofType: z.string().optional(),
    stories: z.number().optional(),
    slope: z.string().optional(),
    squareFootage: z.number().optional(),
    agentName: z.string().optional(),
    nextAction: z.string().optional(),
  })
  .strict();

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/claims/[id] - Get claim detail
 */
export const GET = withOrgScope(
  async (req, { orgId }, { params }: { params: { claimId: string } }) => {
    try {
      logger.debug(`[GET /api/claims/${params.claimId}] Looking up claim in org: ${orgId}`);

      // Try to find by ID first
      let claim = await prisma.claims.findFirst({
        where: {
          id: params.claimId,
          orgId,
        },
        include: {
          projects: true,
          activities: {
            orderBy: { createdAt: "desc" },
          },
          claim_activities: {
            include: {
              users: {
                select: { id: true, email: true },
              },
            },
            orderBy: { created_at: "desc" },
          },
          claim_payments: {
            orderBy: { paid_at: "desc" },
          },
          claim_supplements: {
            orderBy: { created_at: "desc" },
          },
          depreciation_invoices: {
            orderBy: { generated_at: "desc" },
          },
        },
      });

      // If not found by ID, try by claimNumber as fallback
      if (!claim) {
        logger.debug(`[GET /api/claims/${params.claimId}] Not found by ID, trying claimNumber...`);
        claim = await prisma.claims.findFirst({
          where: {
            claimNumber: params.claimId,
            orgId,
          },
          include: {
            projects: true,
            activities: {
              orderBy: { createdAt: "desc" },
            },
            claim_activities: {
              include: {
                users: {
                  select: { id: true, email: true },
                },
              },
              orderBy: { created_at: "desc" },
            },
            claim_payments: {
              orderBy: { paid_at: "desc" },
            },
            claim_supplements: {
              orderBy: { created_at: "desc" },
            },
            depreciation_invoices: {
              orderBy: { generated_at: "desc" },
            },
          },
        });
      }

      if (!claim) {
        logger.debug(`[GET /api/claims/${params.claimId}] NOT FOUND in org ${orgId}`);
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      logger.debug(`[GET /api/claims/${params.claimId}] FOUND claim: ${claim.id}`);
      return NextResponse.json({ claim }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      logger.error(`[GET /api/claims/${params.claimId}] Error:`, error);
      return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
    }
  }
);

/**
 * PATCH /api/claims/[id] - Update claim
 * 🛡️ MASTER PROMPT #66: RBAC Protection - requires "claims:edit" permission
 */
export const PATCH = withOrgScope(
  async (req, { orgId, userId }, { params }: { params: { claimId: string } }) => {
    try {
      // 🛡️ RBAC: Check permission to edit claims
      try {
        await requirePermission("claims:edit");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        return createForbiddenResponse("You don't have permission to edit claims", {
          requiredPermission: "claims:edit",
        });
      }

      // Verify claim exists and belongs to org
      const existingClaim = await prisma.claims.findFirst({
        where: {
          id: params.claimId,
          orgId,
        },
      });

      if (!existingClaim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      const body = await req.json();
      const parsed = claimUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const {
        title,
        description,
        damageType,
        dateOfLoss,
        carrier,
        policyNumber,
        lifecycleStage,
        lifecycle_stage,
        status,
        claimNumber,
        policy_number,
        insured_name,
        homeowner_email,
        adjusterName,
        adjusterPhone,
        adjusterEmail,
        estimatedValue,
        approvedValue,
        deductible,
        priority,
        lossType,
        structureType,
        roofType,
        stories,
        slope,
        squareFootage,
        agentName,
        nextAction,
      } = parsed.data;

      // Build update data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (damageType !== undefined) updateData.damageType = damageType;
      if (dateOfLoss !== undefined) updateData.dateOfLoss = new Date(dateOfLoss);
      if (carrier !== undefined) updateData.carrier = carrier;
      if (policyNumber !== undefined) updateData.policyNumber = policyNumber;
      const stageValue = lifecycle_stage ?? lifecycleStage;
      if (stageValue !== undefined) updateData.lifecycle_stage = stageValue;
      if (status !== undefined) updateData.status = status;

      // MASTER CLAIM WORKSPACE: Add new fields to whitelist
      if (claimNumber !== undefined) updateData.claimNumber = claimNumber;
      if (policy_number !== undefined) updateData.policy_number = policy_number;
      if (insured_name !== undefined) updateData.insured_name = insured_name;
      if (homeowner_email !== undefined) updateData.homeowner_email = homeowner_email;
      if (adjusterName !== undefined) updateData.adjusterName = adjusterName;
      if (adjusterPhone !== undefined) updateData.adjusterPhone = adjusterPhone;
      if (adjusterEmail !== undefined) updateData.adjusterEmail = adjusterEmail;
      if (estimatedValue !== undefined) updateData.estimatedValue = estimatedValue;
      if (approvedValue !== undefined) updateData.approvedValue = approvedValue;
      if (deductible !== undefined) updateData.deductible = deductible;
      if (priority !== undefined) updateData.priority = priority;
      if (lossType !== undefined) updateData.lossType = lossType;
      if (structureType !== undefined) updateData.structureType = structureType;
      if (roofType !== undefined) updateData.roofType = roofType;
      if (stories !== undefined) updateData.stories = stories;
      if (slope !== undefined) updateData.slope = slope;
      if (squareFootage !== undefined) updateData.squareFootage = squareFootage;
      if (agentName !== undefined) updateData.agentName = agentName;
      if (nextAction !== undefined) updateData.nextAction = nextAction;

      // Track stage changes for activity logging
      const stageChanged = stageValue && stageValue !== existingClaim.lifecycle_stage;
      const previousStage = existingClaim.lifecycle_stage;

      // Update the claim
      const claim = await prisma.claims.update({
        where: { id: params.claimId },
        data: updateData,
        include: {
          properties: true,
          activities: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      // Log activity if stage changed
      if (stageChanged) {
        await prisma.claim_activities.create({
          data: {
            id: crypto.randomUUID(),
            claim_id: claim.id,
            user_id: userId,
            type: "STATUS_CHANGE",
            message: `Claim lifecycle stage changed from ${previousStage} to ${stageValue}`,
            metadata: {
              previousStage,
              newStage: stageValue,
            },
          },
        });
      } else if (Object.keys(updateData).length > 0) {
        // Log general update activity
        await prisma.claim_activities.create({
          data: {
            id: crypto.randomUUID(),
            claim_id: claim.id,
            user_id: userId,
            type: "NOTE",
            message: `Claim "${claim.title}" was updated`,
          },
        });
      }

      return NextResponse.json({ claim }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      logger.error(`[PATCH /api/claims/${params.claimId}] Error:`, error);
      return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/claims/[id] - Delete claim (soft delete)
 * 🛡️ MASTER PROMPT #66: RBAC Protection - requires "claims:delete" permission
 */
export const DELETE = withOrgScope(
  async (req, { orgId, userId }, { params }: { params: { claimId: string } }) => {
    try {
      // 🛡️ RBAC: Check permission to delete claims
      try {
        await requirePermission("claims:delete");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        return createForbiddenResponse("You don't have permission to delete claims", {
          requiredPermission: "claims:delete",
        });
      }

      // Verify claim exists and belongs to org
      const claim = await prisma.claims.findFirst({
        where: {
          id: params.claimId,
          orgId,
        },
      });

      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      // Check if claim has supplements or payments
      const [supplementsCount, paymentsCount] = await Promise.all([
        prisma.claim_supplements.count({ where: { claim_id: claim.id } }),
        // NOTE[PRISMA_DRIFT]: Replace prisma.claim_payments with correct payment model when available
        prisma.claim_payments.count({ where: { claim_id: claim.id } }),
      ]);

      if (supplementsCount > 0 || paymentsCount > 0) {
        return NextResponse.json(
          {
            error: "Cannot delete claim with existing supplements or payments. Archive it instead.",
          },
          { status: 400 }
        );
      }

      // Soft delete by updating status + set archivedAt
      await prisma.claims.update({
        where: { id: params.claimId },
        data: {
          status: "archived",
          archivedAt: new Date(),
        },
      });

      // Log activity
      await prisma.claim_activities.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claim.id,
          user_id: userId,
          type: "STATUS_CHANGE",
          message: `Claim "${claim.title}" was archived`,
        },
      });

      return NextResponse.json({
        success: true,
        description: "Claim archived successfully",
      });
    } catch (error) {
      logger.error(`[DELETE /api/claims/${params.claimId}] Error:`, error);
      return NextResponse.json({ error: "Failed to delete claim" }, { status: 500 });
    }
  }
);
