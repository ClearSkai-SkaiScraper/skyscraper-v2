import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Prisma singleton imported from @/lib/db/prisma

type ActivityPayload = {
  orgId: string;
  userId: string;
  entityType: "lead" | "claim" | "file" | "contact" | "property";
  entityId: string;
  action:
    | "CREATED"
    | "UPDATED"
    | "STATUS_CHANGED"
    | "FILE_UPLOADED"
    | "NOTE_ADDED"
    | "STAGE_CHANGED";
  title: string;
  description?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
};

export async function logActivity(payload: ActivityPayload) {
  try {
    const { randomUUID } = await import("crypto");
    await prisma.activities.create({
      data: {
        id: randomUUID(),
        orgId: payload.orgId,
        type: payload.action.toLowerCase(),
        title: payload.title,
        description: payload.description || "",
        userId: payload.userId,
        userName: "User", // TODO: Get from Clerk
        // Set the appropriate relation based on entity type
        leadId: payload.entityType === "lead" ? payload.entityId : undefined,
        claimId: payload.entityType === "claim" ? payload.entityId : undefined,
        contactId: payload.entityType === "contact" ? payload.entityId : undefined,
        metadata: payload.meta ? payload.meta : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
  } catch (error) {
    logger.error("Failed to log activity:", error);
    // Don't throw - activity logging shouldn't break the main flow
  }
}

// New: Get recent activity from activity_events table
export async function getRecentActivity(orgId: string, limit = 6) {
  const result = await db.query(
    `select id, kind, title, created_at, ref_type, ref_id, meta
     from activity_events
     where org_id = $1
     order by created_at desc
     limit $2`,
    [orgId, limit]
  );
  return result.rows || [];
}

// New: Get tool history for a user
export async function getToolHistory(clerkUserId: string, tool?: string, limit = 50) {
  try {
    const query = tool
      ? `select id, tool, status, tokens_used, created_at, input, output
         from tool_runs
         where clerk_user_id = $1 and tool = $2
         order by created_at desc
         limit $3`
      : `select id, tool, status, tokens_used, created_at, input, output
         from tool_runs
         where clerk_user_id = $1
         order by created_at desc
         limit $2`;

    const params = tool ? [clerkUserId, tool, limit] : [clerkUserId, limit];
    const result = await db.query(query, params);
    return result.rows || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // table may not exist yet — return empty gracefully
    logger.warn("[getToolHistory] Query failed (table may not exist):", error.message);
    return [];
  }
}

export async function getActivitiesForEntity(
  orgId: string,
  entityType: string,
  entityId: string,
  limit = 20
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { orgId };

  if (entityType === "lead") where.leadId = entityId;
  if (entityType === "claim") where.claim_id = entityId;
  if (entityType === "contact") where.contact_id = entityId;

  return prisma.activities.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Export alias for API routes
export async function getClaimActivity(claimId: string, limit = 20) {
  return getActivitiesForEntity("", "claim", claimId, limit);
}
