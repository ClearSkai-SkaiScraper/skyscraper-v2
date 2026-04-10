"use server";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  priority: "low" | "medium" | "high";
  category: "claim" | "project" | "job" | "system" | "user";
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  userId?: string;
}

export const getInboxActivities = cache(async (): Promise<ActivityItem[]> => {
  const user = await currentUser();
  if (!user) return [];

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  try {
    const activities = await prisma.activities.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return activities.map((activity) => {
      // Parse metadata if it exists
      const metadata = (activity.metadata as Record<string, unknown>) || {};

      // Determine entity ID and type from available relations
      const entityId =
        activity.claimId || activity.projectId || activity.jobId || activity.leadId || undefined;
      const entityType = activity.claimId
        ? "claim"
        : activity.projectId
          ? "project"
          : activity.jobId
            ? "job"
            : activity.leadId
              ? "lead"
              : undefined;

      return {
        id: activity.id,
        type: activity.type || "notification",
        title: activity.title || "New Activity",
        description: (activity.description || (metadata.details as string) || "") as string,
        timestamp: activity.createdAt,
        read: (metadata.read || false) as boolean,
        priority: (metadata.priority || "medium") as ActivityItem["priority"],
        category: determineCategory(activity.type || ""),
        relatedEntityId: entityId,
        relatedEntityType: entityType,
        actionUrl: generateActionUrl(entityType, entityId),
        userId: activity.userId || undefined,
      };
    });
  } catch (error) {
    logger.error("[getInboxActivities] Error:", error);
    return [];
  }
});

function determineCategory(type: string): ActivityItem["category"] {
  if (type.includes("claim")) return "claim";
  if (type.includes("project")) return "project";
  if (type.includes("job")) return "job";
  if (type.includes("user") || type.includes("team")) return "user";
  return "system";
}

function generateActionUrl(
  entityType: string | null | undefined,
  entityId: string | null | undefined
): string | undefined {
  if (!entityType || !entityId) return undefined;

  const typeMap: Record<string, string> = {
    claim: "/claims",
    project: "/projects",
    job: "/jobs",
    property: "/properties",
    contact: "/contacts",
    lead: "/leads",
  };

  const basePath = typeMap[entityType.toLowerCase()];
  return basePath ? `${basePath}/${entityId}` : undefined;
}

export async function markAsRead(activityId: string): Promise<{ success: boolean }> {
  const user = await currentUser();
  if (!user) return { success: false };

  try {
    const activity = await prisma.activities.findUnique({
      where: { id: activityId },
    });

    if (!activity) return { success: false };

    // Update metadata to mark as read
    const metadata = (activity.metadata as Record<string, unknown>) || {};
    metadata.read = true;

    await prisma.activities.update({
      where: { id: activityId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { metadata: metadata as any },
    });

    return { success: true };
  } catch (error) {
    logger.error("[markAsRead] Error:", error);
    return { success: false };
  }
}

export async function markAllAsRead(): Promise<{ success: boolean; count: number }> {
  const user = await currentUser();
  if (!user) return { success: false, count: 0 };

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  try {
    const activities = await prisma.activities.findMany({
      where: { orgId },
    });

    let count = 0;
    for (const activity of activities) {
      const metadata = (activity.metadata as Record<string, unknown>) || {};
      if (!metadata.read) {
        metadata.read = true;
        await prisma.activities.update({
          where: { id: activity.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { metadata: metadata as any },
        });
        count++;
      }
    }

    return { success: true, count };
  } catch (error) {
    logger.error("[markAllAsRead] Error:", error);
    return { success: false, count: 0 };
  }
}
