/**
 * Auto-assignment for leads using round-robin distribution
 * Distributes leads evenly among team members
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Get the next assignee for round-robin distribution
 */
export async function getNextRoundRobinAssignee(orgId: string): Promise<string | null> {
  try {
    // Get all team members for this org
    const teamMembers = await prisma.user_organizations.findMany({
      where: {
        organizationId: orgId,
        role: { in: ["ADMIN", "MANAGER", "MEMBER"] },
      },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
    });

    if (teamMembers.length === 0) {
      logger.warn("[ROUND_ROBIN] No eligible team members for org", { orgId });
      return null;
    }

    // Simple load-balanced approach: assign to member with fewest leads
    const leadCounts = await Promise.all(
      teamMembers.map(async (member) => {
        const count = await prisma.leads.count({
          where: { orgId, assignedTo: member.userId },
        });
        return { userId: member.userId, count };
      })
    );

    leadCounts.sort((a, b) => a.count - b.count);
    const nextUserId = leadCounts[0].userId;

    logger.info("[ROUND_ROBIN] Assigned to next user", {
      orgId,
      userId: nextUserId,
      teamSize: teamMembers.length,
    });

    return nextUserId;
  } catch (error) {
    logger.error("[ROUND_ROBIN] Failed to get next assignee", { orgId, error });
    return null;
  }
}

/**
 * Auto-assign a lead to a team member using round-robin
 */
export async function autoAssignLead(leadId: string, orgId: string): Promise<string | null> {
  try {
    const assigneeId = await getNextRoundRobinAssignee(orgId);
    if (!assigneeId) return null;

    await prisma.leads.update({
      where: { id: leadId },
      data: { assignedTo: assigneeId, updatedAt: new Date() },
    });

    // Log activity (non-critical)
    try {
      await prisma.activities.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          leadId,
          type: "ASSIGNED",
          title: "Lead Auto-Assigned",
          description: "Lead auto-assigned via round-robin",
          userId: "system",
          userName: "System",
          metadata: { assigneeId, method: "round_robin" },
          updatedAt: new Date(),
        },
      });
    } catch {
      // activity logging is optional
    }

    logger.info("[AUTO_ASSIGN] Lead assigned", { leadId, assigneeId, orgId });
    return assigneeId;
  } catch (error) {
    logger.error("[AUTO_ASSIGN] Failed to auto-assign lead", { leadId, orgId, error });
    return null;
  }
}

/**
 * Assign lead by geography - falls back to round-robin
 */
export async function geoAssignLead(
  leadId: string,
  orgId: string,
  zipCode?: string,
  state?: string
): Promise<string | null> {
  try {
    logger.debug("[GEO_ASSIGN] Falling back to round-robin", { orgId, zipCode, state });
    return autoAssignLead(leadId, orgId);
  } catch (error) {
    logger.error("[GEO_ASSIGN] Failed to geo-assign lead", { leadId, orgId, error });
    return null;
  }
}
