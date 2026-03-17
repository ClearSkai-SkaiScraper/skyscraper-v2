/**
 * Activity Feed System
 *
 * Unified activity stream across all entities
 * Real-time + persistent activity logging
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type ActivityType =
  | "STATUS_CHANGE"
  | "ASSIGNMENT"
  | "NEW_MESSAGE"
  | "NEW_DOCUMENT"
  | "NEW_NOTE"
  | "PAYMENT_RECEIVED"
  | "MILESTONE_REACHED"
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "COMMENT"
  | "MENTION";

export interface Activity {
  id: string;
  orgId: string;
  type: ActivityType;

  // Actor
  userId?: string;
  userName?: string;
  userEmail?: string;

  // Target
  resourceType: "JOB" | "CLAIM" | "LEAD" | "CLIENT" | "DOCUMENT" | "MESSAGE" | "TASK";
  resourceId: string;
  resourceTitle?: string;

  // Details
  action: string;
  description?: string;
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
}

/** Shape returned by the claim_activities dynamic model */
interface ActivityRecord {
  id: string;
  metadata?: {
    activityType?: string;
    resourceType?: string;
    description?: string;
    userName?: string;
    userEmail?: string;
    [key: string]: unknown;
  };
  user_id: string;
  claim_id: string;
  message?: string;
  type?: string;
  created_at: Date;
}

// Use prismaMaybeModel for graceful degradation since claim_activities may not exist
import { prismaMaybeModel } from "@/lib/db/prismaModel";
const ActivityLog = prismaMaybeModel("claim_activities");

/**
 * Log activity
 */
export async function logActivity(
  orgId: string,
  data: {
    type: ActivityType;
    userId?: string;
    resourceType: "JOB" | "CLAIM" | "LEAD" | "CLIENT" | "DOCUMENT" | "MESSAGE" | "TASK";
    resourceId: string;
    action: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Activity> {
  try {
    // Get user info
    let userName: string | undefined;
    let userEmail: string | undefined;

    if (data.userId) {
      const user = await prisma.users.findUnique({
        where: { id: data.userId },
        select: {
          email: true,
          name: true,
        },
      });

      if (user) {
        userName = user.name ?? undefined;
        userEmail = user.email;
      }
    }
    if (!ActivityLog) {
      logger.warn("ActivityLog model not available; skipping persistent activity log");
      const now = new Date();
      return {
        id: "no-db",
        orgId,
        type: data.type,
        userId: data.userId,
        userName,
        userEmail,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        action: data.action,
        description: data.description,
        metadata: {
          ...(data.metadata ?? {}),
          type: data.type,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          userName,
          userEmail,
        },
        createdAt: now,
      };
    }

    const created = await ActivityLog.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: data.resourceType === "CLAIM" ? data.resourceId : "system",
        user_id: data.userId ?? "system",
        type: "note",
        message: data.action,
        metadata: {
          ...(data.metadata ?? {}),
          activityType: data.type,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          description: data.description,
          userName,
          userEmail,
        },
      },
    });

    return {
      id: created.id,
      orgId,
      type: data.type,
      userId: data.userId,
      userName,
      userEmail,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      action: data.action,
      description: data.description,
      metadata: (created.metadata ?? undefined) as Record<string, unknown> | undefined,
      createdAt: created.created_at,
    };
  } catch (error) {
    logger.error("Failed to log activity:", error);
    throw error;
  }
}

/**
 * Get activity feed for resource
 */
export async function getResourceActivity(
  orgId: string,
  resourceType: string,
  resourceId: string,
  limit: number = 50
): Promise<Activity[]> {
  try {
    // Only claim activities are stored; filter by claim_id if resourceType is CLAIM
    if (resourceType !== "CLAIM" || !ActivityLog) {
      return [];
    }
    const records = await ActivityLog.findMany({
      where: {
        claim_id: resourceId,
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });
    return records.map((r: ActivityRecord) => ({
      id: r.id,
      orgId,
      type: (r.metadata?.activityType ?? "UPDATED") as ActivityType,
      userId: r.user_id,
      resourceType: "CLAIM" as const,
      resourceId: r.claim_id,
      action: r.message ?? "",
      description: r.metadata?.description,
      metadata: r.metadata as Record<string, unknown> | undefined,
      createdAt: r.created_at,
    })) as Activity[];
  } catch {
    return [];
  }
}

/**
 * Get org-wide activity feed
 */
export async function getOrgActivity(
  orgId: string,
  filters?: {
    type?: ActivityType;
    resourceType?: string;
    userId?: string;
    since?: Date;
  },
  limit: number = 100
): Promise<Activity[]> {
  try {
    if (!ActivityLog) return [];
    // Get claims for this org to filter activities
    const orgClaims = await prisma.claims.findMany({
      where: { orgId },
      select: { id: true },
    });
    const claimIds = orgClaims.map((c) => c.id);
    if (claimIds.length === 0) return [];

    const records = await ActivityLog.findMany({
      where: {
        claim_id: { in: claimIds },
        ...(filters?.userId && { user_id: filters.userId }),
        ...(filters?.since && { created_at: { gte: filters.since } }),
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });
    return records
      .filter((r: ActivityRecord) => !filters?.type || r.metadata?.activityType === filters.type)
      .filter(
        (r: ActivityRecord) =>
          !filters?.resourceType || r.metadata?.resourceType === filters.resourceType
      )
      .map((r: ActivityRecord) => ({
        id: r.id,
        orgId,
        type: (r.metadata?.activityType ?? "UPDATED") as ActivityType,
        userId: r.user_id,
        resourceType: (r.metadata?.resourceType ?? "CLAIM") as Activity["resourceType"],
        resourceId: r.claim_id,
        action: r.message ?? "",
        description: r.metadata?.description,
        metadata: r.metadata as Record<string, unknown> | undefined,
        createdAt: r.created_at,
      })) as Activity[];
  } catch {
    return [];
  }
}

/**
 * Get user's activity feed (personalized)
 */
export async function getUserActivity(
  orgId: string,
  userId: string,
  limit: number = 50
): Promise<Activity[]> {
  try {
    if (!ActivityLog) return [];

    // Get user's items - use fields that actually exist on these models
    const [claims, leads, jobs] = await Promise.all([
      prisma.claims.findMany({
        where: { orgId, assignedTo: userId },
        select: { id: true },
      }),
      prisma.leads.findMany({
        where: { orgId, OR: [{ createdBy: userId }, { assignedTo: userId }] },
        select: { id: true },
      }),
      prisma.jobs
        .findMany({
          where: { orgId, foreman: userId },
          select: { id: true },
        })
        .catch(() => []),
    ]);

    const claimIds = claims.map((c) => c.id);
    // leads and jobs don't have activity logs in claim_activities, but include for future
    void leads;
    void jobs;

    if (claimIds.length === 0) {
      // Check for user's own activities
      const userActivities = await ActivityLog.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: limit,
      });
      return userActivities.map((r: ActivityRecord) => ({
        id: r.id,
        orgId,
        type: (r.metadata?.activityType ?? "UPDATED") as ActivityType,
        userId: r.user_id,
        resourceType: (r.metadata?.resourceType ?? "CLAIM") as Activity["resourceType"],
        resourceId: r.claim_id,
        action: r.message ?? "",
        description: r.metadata?.description,
        metadata: r.metadata as Record<string, unknown> | undefined,
        createdAt: r.created_at,
      })) as Activity[];
    }

    // Get activity for user's claims or user's own actions
    const records = await ActivityLog.findMany({
      where: {
        OR: [{ user_id: userId }, { claim_id: { in: claimIds } }],
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });
    return records.map((r: ActivityRecord) => ({
      id: r.id,
      orgId,
      type: (r.metadata?.activityType ?? "UPDATED") as ActivityType,
      userId: r.user_id,
      resourceType: (r.metadata?.resourceType ?? "CLAIM") as Activity["resourceType"],
      resourceId: r.claim_id,
      action: r.message ?? "",
      description: r.metadata?.description,
      metadata: r.metadata as Record<string, unknown> | undefined,
      createdAt: r.created_at,
    })) as Activity[];
  } catch {
    return [];
  }
}

/**
 * Get activity stats for dashboard
 */
export async function getActivityStats(
  orgId: string,
  period: "today" | "week" | "month" = "today"
): Promise<{
  totalActivities: number;
  byType: Record<ActivityType, number>;
  byResource: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
}> {
  const since = new Date();

  switch (period) {
    case "today":
      since.setHours(0, 0, 0, 0);
      break;
    case "week":
      since.setDate(since.getDate() - 7);
      break;
    case "month":
      since.setMonth(since.getMonth() - 1);
      break;
  }

  try {
    if (!ActivityLog) {
      return {
        totalActivities: 0,
        byType: {} as Record<ActivityType, number>,
        byResource: {},
        topUsers: [],
      };
    }
    // Get claims for this org
    const orgClaims = await prisma.claims.findMany({
      where: { orgId },
      select: { id: true },
    });
    const claimIds = orgClaims.map((c) => c.id);
    if (claimIds.length === 0) {
      return {
        totalActivities: 0,
        byType: {} as Record<ActivityType, number>,
        byResource: {},
        topUsers: [],
      };
    }

    const activities = await ActivityLog.findMany({
      where: {
        claim_id: { in: claimIds },
        created_at: { gte: since },
      },
    });

    const byType: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    const userCounts: Record<string, { userName: string; count: number }> = {};

    for (const activity of activities as ActivityRecord[]) {
      const activityType = activity.metadata?.activityType ?? activity.type ?? "UPDATED";
      const resourceType = activity.metadata?.resourceType ?? "CLAIM";
      const userName = activity.metadata?.userName;

      // Count by type
      byType[activityType] = (byType[activityType] || 0) + 1;

      // Count by resource
      byResource[resourceType] = (byResource[resourceType] || 0) + 1;

      // Count by user
      if (activity.user_id && userName) {
        if (!userCounts[activity.user_id]) {
          userCounts[activity.user_id] = {
            userName,
            count: 0,
          };
        }
        userCounts[activity.user_id].count++;
      }
    }

    // Top 10 users
    const topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalActivities: activities.length,
      byType: byType as Record<ActivityType, number>,
      byResource,
      topUsers,
    };
  } catch (error) {
    logger.error("Failed to get activity stats:", error);
    return {
      totalActivities: 0,
      byType: {} as Record<ActivityType, number>,
      byResource: {},
      topUsers: [],
    };
  }
}

/**
 * Clean up old activities (retention)
 */
export async function cleanupOldActivities(retentionDays: number = 90): Promise<number> {
  try {
    if (!ActivityLog) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await ActivityLog.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    logger.debug(`🗑️ Cleaned up ${result.count} old activities`);
    return result.count;
  } catch {
    return 0;
  }
}
