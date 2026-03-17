export const dynamic = "force-dynamic";

// app/api/automation/recommendation/accept/route.ts
/**
 * POST /api/automation/recommendation/accept
 *
 * Accepts and executes a recommendation
 */

import { type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/** Shape returned by the automationRecommendation delegate */
interface RecommendationRecord {
  id: string;
  orgId: string;
  action?: string;
  targetId?: string;
  targetType?: string;
  newStatus?: string;
  taskTitle?: string;
  taskDescription?: string;
  assigneeId?: string;
  isAccepted?: boolean;
  acceptedAt?: Date | null;
  acceptedBy?: string | null;
}

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = await req.json();
    const { recommendationId } = body;

    if (!recommendationId) {
      return NextResponse.json({ error: "Missing recommendationId" }, { status: 400 });
    }

    // orgId is DB-backed UUID from withAuth
    const recommendation = await getDelegate("automationRecommendation").findUnique({
      where: { id: recommendationId, orgId },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    const rec = recommendation as RecommendationRecord;

    // Mark as accepted
    await getDelegate("automationRecommendation").update({
      where: { id: recommendationId, orgId },
      data: { isAccepted: true, acceptedAt: new Date(), acceptedBy: userId },
    });

    // Execute the recommendation action based on type
    const action = rec.action;
    const targetId = rec.targetId;
    const targetType = rec.targetType;

    if (action && targetId) {
      switch (action) {
        case "update_status":
          if (targetType === "claim" && rec.newStatus) {
            await prisma.claims.update({
              where: { id: targetId, orgId },
              data: { status: rec.newStatus, updatedAt: new Date() },
            });
          } else if (targetType === "job" && rec.newStatus) {
            await prisma.jobs.update({
              where: { id: targetId, orgId },
              data: { status: rec.newStatus, updatedAt: new Date() },
            });
          }
          break;

        case "create_task":
          if (targetType === "claim" && rec.taskTitle) {
            await prisma.claim_tasks.create({
              data: {
                id: crypto.randomUUID(),
                claim_id: targetId,
                org_id: orgId,
                title: rec.taskTitle,
                description: rec.taskDescription || "",
                status: "todo",
                created_at: new Date(),
                updated_at: new Date(),
              } as unknown as Prisma.claim_tasksUncheckedCreateInput,
            });
          }
          break;

        case "assign_user":
          if (targetType === "claim" && rec.assigneeId) {
            await prisma.claims.update({
              where: { id: targetId, orgId },
              data: { assignedTo: rec.assigneeId, updatedAt: new Date() },
            });
          }
          break;
      }

      // Log the action
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          type: "recommendation_executed",
          title: `Recommendation Accepted: ${action}`,
          description: `Executed ${action} on ${targetType} ${targetId}`,
          userId,
          metadata: { recommendationId, action, targetId, targetType } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        } as unknown as Prisma.activitiesUncheckedCreateInput,
      });
    }

    return NextResponse.json({ success: true, executed: !!action });
  } catch (error) {
    logger.error("[RECOMMENDATION ACCEPT] Error:", error);
    return NextResponse.json(
      { error: "Failed to accept recommendation", details: String(error) },
      { status: 500 }
    );
  }
});
