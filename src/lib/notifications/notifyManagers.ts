// src/lib/notifications/notifyManagers.ts
// Fire-and-forget in-app notification to all managers (PM+) in the org
// when a field tech submits a job value for approval.

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface NotifyManagersArgs {
  orgId: string;
  submittedByUserId: string;
  entityType: "claim" | "lead";
  entityId: string;
  entityTitle: string;
  estimatedValue: number; // cents
}

/**
 * Sends an in-app notification to every org member with role PM, ADMIN, or OWNER
 * when a job value is submitted for approval.
 *
 * This is fire-and-forget — errors are logged but never thrown.
 */
export async function notifyManagersOfSubmission(args: NotifyManagersArgs): Promise<void> {
  try {
    const { orgId, submittedByUserId, entityType, entityId, entityTitle, estimatedValue } = args;

    // Find all managers (PM+) in this org, excluding the submitter
    const managers = await prisma.user_organizations.findMany({
      where: {
        organizationId: orgId,
        role: { in: ["ADMIN", "PM", "OWNER"] },
        userId: { not: submittedByUserId },
      },
      select: { userId: true },
    });

    if (managers.length === 0) {
      logger.info("[NOTIFY_MANAGERS] No managers found to notify", { orgId });
      return;
    }

    const formattedValue = `$${(estimatedValue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    const link = entityType === "claim" ? `/claims/${entityId}` : `/leads/${entityId}`;

    // Batch-create notifications for each manager
    await prisma.notification.createMany({
      data: managers.map((m) => ({
        id: crypto.randomUUID(),
        orgId,
        userId: m.userId,
        type: "approval_request",
        level: "info",
        title: "Job Value Needs Approval",
        body: `${entityTitle || "A " + entityType} has a new job value of ${formattedValue} pending your approval.`,
        link,
        channel: "in_app",
        status: "sent",
        metadata: {
          entityType,
          entityId,
          estimatedValue,
          submittedBy: submittedByUserId,
        },
        createdAt: new Date(),
      })),
    });

    logger.info("[NOTIFY_MANAGERS] Sent approval notifications", {
      orgId,
      entityType,
      entityId,
      managerCount: managers.length,
    });
  } catch (err) {
    // Fire-and-forget — never throw
    logger.error("[NOTIFY_MANAGERS] Failed to send notifications:", err);
  }
}
