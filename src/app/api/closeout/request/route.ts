/**
 * POST /api/closeout/request
 *
 * Closeout workflow:
 * 1. Sets entity status to FINISHED
 * 2. Creates a manager approval task
 * 3. Logs activity
 *
 * Body: { entityId, entityType: "claim"|"lead", reason?: string }
 */
import { auth } from "@clerk/nextjs/server";
import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getTenantContext();
    if (!ctx?.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await req.json();
    const { entityId, entityType, reason } = body;

    if (!entityId || !entityType) {
      return NextResponse.json({ error: "entityId and entityType required" }, { status: 400 });
    }

    if (!["claim", "lead"].includes(entityType)) {
      return NextResponse.json({ error: "entityType must be 'claim' or 'lead'" }, { status: 400 });
    }

    const now = new Date();
    let entityTitle = "Unknown";

    // 1. Update status to FINISHED
    if (entityType === "claim") {
      const claim = await prisma.claims.findFirst({
        where: { id: entityId, orgId: ctx.orgId },
        select: { id: true, title: true },
      });
      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      entityTitle = claim.title;

      await prisma.claims.update({
        where: { id: entityId },
        data: { status: "FINISHED", updatedAt: now },
      });
    } else {
      const lead = await prisma.leads.findFirst({
        where: { id: entityId, orgId: ctx.orgId },
        select: { id: true, title: true },
      });
      if (!lead) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
      entityTitle = lead.title;

      await prisma.leads.update({
        where: { id: entityId },
        data: { stage: "FINISHED", updatedAt: now },
      });
    }

    // 2. Create manager approval task
    const taskId = createId();
    try {
      await prisma.tasks.create({
        data: {
          id: taskId,
          orgId: ctx.orgId,
          title: `Closeout Approval: ${entityTitle}`,
          description: [
            `Closeout requested for ${entityType === "claim" ? "claim" : "retail job"}: "${entityTitle}"`,
            reason ? `\nReason: ${reason}` : "",
            `\nRequested by user ${userId} on ${now.toLocaleDateString()}.`,
            `\nTo approve: Archive the file. To reject: Change status back and add a note.`,
          ].join(""),
          status: "TODO",
          priority: "HIGH",
          notes: "Category: closeout_approval",
          // Leave assignedTo null — any manager/admin can pick it up
          dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (taskErr) {
      // Tasks table might not have category column — try without it
      logger.warn("[CLOSEOUT] Task creation failed with category, retrying:", taskErr);
      await prisma.tasks.create({
        data: {
          id: taskId,
          orgId: ctx.orgId,
          title: `Closeout Approval: ${entityTitle}`,
          description: [
            `Closeout requested for ${entityType === "claim" ? "claim" : "retail job"}: "${entityTitle}"`,
            reason ? `\nReason: ${reason}` : "",
            `\nRequested by user ${userId} on ${now.toLocaleDateString()}.`,
            `\nTo approve: Archive the file. To reject: Change status back and add a note.`,
          ].join(""),
          status: "TODO",
          priority: "HIGH",
          notes: `Requested by ${userId}`,
          dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // 3. Log activity
    try {
      await prisma.activities.create({
        data: {
          id: createId(),
          orgId: ctx.orgId,
          userId: userId,
          type: "status_change",
          title: "Closeout Requested",
          description: reason
            ? `Closeout requested: ${reason}`
            : "Closeout requested — awaiting manager approval",
          userName: userId,
          ...(entityType === "claim" ? { claimId: entityId } : { leadId: entityId }),
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (actErr) {
      // Non-critical — log and continue
      logger.warn("[CLOSEOUT] Activity log failed:", actErr);
    }

    logger.info("[CLOSEOUT_REQUEST]", {
      orgId: ctx.orgId,
      entityId,
      entityType,
      userId,
      taskId,
    });

    return NextResponse.json({
      success: true,
      taskId,
      message: "Closeout requested. Manager approval task created.",
    });
  } catch (err) {
    logger.error("[CLOSEOUT_REQUEST] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
