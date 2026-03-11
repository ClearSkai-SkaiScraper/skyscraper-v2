/**
 * Auto-assignment for leads using round-robin distribution
 * Distributes leads evenly among team members
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Get the next assignee for round-robin distribution
 * Tracks the last assigned user per org and rotates through team members
 */
export async function getNextRoundRobinAssignee(orgId: string): Promise<string | null> {
  try {
    // Get all active team members for this org who can receive leads
    const teamMembers = await prisma.memberships.findMany({
      where: {
        orgId,
        status: "ACTIVE",
        // Include roles that should receive leads
        role: { in: ["ADMIN", "MANAGER", "MEMBER"] },
      },
      select: {
        userId: true,
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" }, // Consistent ordering
    });

    if (teamMembers.length === 0) {
      logger.warn("[ROUND_ROBIN] No eligible team members for org", { orgId });
      return null;
    }

    // Get the last assigned user from org settings
    const lastAssignedSetting = await prisma.org_settings.findUnique({
      where: {
        org_id_key: {
          org_id: orgId,
          key: "lead_last_assigned_user",
        },
      },
    });

    const lastAssignedUserId = (lastAssignedSetting?.value as { userId?: string })?.userId;

    // Find the index of the last assigned user
    let nextIndex = 0;
    if (lastAssignedUserId) {
      const lastIndex = teamMembers.findIndex((m) => m.userId === lastAssignedUserId);
      if (lastIndex !== -1) {
        nextIndex = (lastIndex + 1) % teamMembers.length;
      }
    }

    const nextAssignee = teamMembers[nextIndex];
    const nextUserId = nextAssignee.userId;

    // Update the last assigned user in settings
    await prisma.org_settings.upsert({
      where: {
        org_id_key: {
          org_id: orgId,
          key: "lead_last_assigned_user",
        },
      },
      update: {
        value: { userId: nextUserId },
        updated_at: new Date(),
      },
      create: {
        id: crypto.randomUUID(),
        org_id: orgId,
        key: "lead_last_assigned_user",
        value: { userId: nextUserId },
        updated_at: new Date(),
      },
    });

    logger.info("[ROUND_ROBIN] Assigned to next user", {
      orgId,
      userId: nextUserId,
      userName:
        `${nextAssignee.users?.firstName || ""} ${nextAssignee.users?.lastName || ""}`.trim(),
      teamSize: teamMembers.length,
      position: nextIndex + 1,
    });

    return nextUserId;
  } catch (error) {
    logger.error("[ROUND_ROBIN] Failed to get next assignee", { orgId, error });
    return null;
  }
}

/**
 * Auto-assign a lead to a team member
 * Uses round-robin if enabled in org settings
 */
export async function autoAssignLead(leadId: string, orgId: string): Promise<string | null> {
  try {
    // Check if auto-assign is enabled
    const settings = await prisma.org_settings.findUnique({
      where: {
        org_id_key: {
          org_id: orgId,
          key: "lead_routing_settings",
        },
      },
    });

    const routingSettings = settings?.value as {
      roundRobinEnabled?: boolean;
      autoAssignNewLeads?: boolean;
    } | null;

    // Check if round-robin or auto-assign is enabled
    if (!routingSettings?.roundRobinEnabled && !routingSettings?.autoAssignNewLeads) {
      logger.debug("[AUTO_ASSIGN] Auto-assign disabled for org", { orgId });
      return null;
    }

    // Get next assignee using round-robin
    const assigneeId = await getNextRoundRobinAssignee(orgId);
    if (!assigneeId) {
      return null;
    }

    // Update the lead with the assignee
    await prisma.leads.update({
      where: { id: leadId },
      data: {
        assignedTo: assigneeId,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.lead_activities.create({
      data: {
        id: crypto.randomUUID(),
        leadId,
        type: "ASSIGNED",
        description: "Lead auto-assigned via round-robin",
        metadata: { assigneeId, method: "round_robin" },
        createdAt: new Date(),
      },
    });

    logger.info("[AUTO_ASSIGN] Lead assigned", { leadId, assigneeId, orgId });
    return assigneeId;
  } catch (error) {
    logger.error("[AUTO_ASSIGN] Failed to auto-assign lead", { leadId, orgId, error });
    return null;
  }
}

/**
 * Assign lead by geography (zip code / state)
 * Routes leads based on configured territories
 */
export async function geoAssignLead(
  leadId: string,
  orgId: string,
  zipCode?: string,
  state?: string
): Promise<string | null> {
  try {
    // Check if geo-routing is enabled
    const settings = await prisma.org_settings.findUnique({
      where: {
        org_id_key: {
          org_id: orgId,
          key: "lead_routing_settings",
        },
      },
    });

    const routingSettings = settings?.value as { geoRoutingEnabled?: boolean } | null;
    if (!routingSettings?.geoRoutingEnabled) {
      logger.debug("[GEO_ASSIGN] Geo-routing disabled for org", { orgId });
      return null;
    }

    // Get territory assignments
    const territories = await prisma.org_settings.findUnique({
      where: {
        org_id_key: {
          org_id: orgId,
          key: "lead_territories",
        },
      },
    });

    const territoryMap = (territories?.value as Record<string, string>) || {};

    // Check if we have a match for zip or state
    let assigneeId: string | null = null;
    if (zipCode && territoryMap[zipCode]) {
      assigneeId = territoryMap[zipCode];
    } else if (state && territoryMap[state]) {
      assigneeId = territoryMap[state];
    }

    if (!assigneeId) {
      // Fall back to round-robin if no territory match
      return autoAssignLead(leadId, orgId);
    }

    // Verify the assignee is still a valid team member
    const membership = await prisma.memberships.findFirst({
      where: {
        orgId,
        userId: assigneeId,
        status: "ACTIVE",
      },
    });

    if (!membership) {
      logger.warn("[GEO_ASSIGN] Territory assignee no longer active", { assigneeId, orgId });
      return autoAssignLead(leadId, orgId);
    }

    // Update the lead
    await prisma.leads.update({
      where: { id: leadId },
      data: {
        assignedTo: assigneeId,
        updatedAt: new Date(),
      },
    });

    // Log activity
    await prisma.lead_activities.create({
      data: {
        id: crypto.randomUUID(),
        leadId,
        type: "ASSIGNED",
        description: `Lead assigned by territory (${zipCode || state})`,
        metadata: { assigneeId, method: "geo_routing", territory: zipCode || state },
        createdAt: new Date(),
      },
    });

    logger.info("[GEO_ASSIGN] Lead assigned by territory", {
      leadId,
      assigneeId,
      territory: zipCode || state,
    });

    return assigneeId;
  } catch (error) {
    logger.error("[GEO_ASSIGN] Failed to geo-assign lead", { leadId, orgId, error });
    return null;
  }
}
