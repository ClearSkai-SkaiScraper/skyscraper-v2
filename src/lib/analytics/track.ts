/**
 * Product Analytics Tracking
 * Lightweight event tracking system for conversion funnels
 * Uses existing activities table for storage
 */

import { prismaModel } from "@/lib/db/prismaModel";
import { logger } from "@/lib/logger";

// Critical conversion events to track
export const PRODUCT_EVENTS = {
  ORG_BRANDING_COMPLETED: "org_branding_completed",
  FIRST_CLIENT_CREATED: "first_client_created",
  FIRST_CLAIM_CREATED: "first_claim_created",
  FIRST_UPLOAD_PHOTO: "first_upload_photo",
  FIRST_AI_ARTIFACT_SAVED: "first_ai_artifact_saved",
  FIRST_PDF_EXPORTED: "first_pdf_exported",
  FIRST_VENDOR_RESOURCE_OPENED: "first_vendor_resource_opened",
  FIRST_TRADE_INVITED: "first_trade_invited",
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

interface TrackEventOptions {
  orgId: string;
  userId?: string;
  eventName: ProductEventName;
  payload?: Record<string, any>;
}

// Use the activities model from Prisma schema
const Activity = prismaModel("activities");

/**
 * Track a product event
 * Server-safe only (uses Prisma directly)
 */
export async function trackProductEvent({
  orgId,
  userId,
  eventName,
  payload,
}: TrackEventOptions): Promise<void> {
  // Respect analytics disable flag
  if (process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "true") {
    return;
  }

  try {
    if (!Activity) return;

    // Use activities table for event storage
    await Activity.create({
      data: {
        id: crypto.randomUUID(),
        orgId: orgId,
        userId: userId || "system",
        userName: "System",
        type: eventName,
        title: `Product event: ${eventName}`,
        description: `Product event: ${eventName}`,
        metadata: payload || {},
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    // Silent fail - don't break user flows
    logger.error(`[TRACK_EVENT] Failed: ${eventName}`, error);
  }
}

/**
 * Check if an event has been tracked for an org (for first-time detection)
 */
export async function hasTrackedEvent(
  orgId: string,
  eventName: ProductEventName
): Promise<boolean> {
  try {
    if (!Activity) return false;

    const event = await Activity.findFirst({
      where: {
        orgId: orgId,
        type: eventName,
      },
    });
    return !!event;
  } catch (error) {
    logger.error(`[HAS_TRACKED_EVENT] Failed: ${eventName}`, error);
    return false;
  }
}

/**
 * Get conversion funnel stats for an org
 */
export async function getConversionFunnel(orgId: string) {
  try {
    if (!Activity) return [];

    const events = await Activity.findMany({
      where: {
        orgId: orgId,
        type: {
          in: Object.values(PRODUCT_EVENTS),
        },
      },
      select: {
        type: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return events;
  } catch (error) {
    logger.error("[GET_CONVERSION_FUNNEL] Failed:", error);
    return [];
  }
}

/**
 * Get all product events for analytics dashboard
 */
export async function getProductEventsSummary(orgId?: string) {
  try {
    const where = {
      type: {
        in: Object.values(PRODUCT_EVENTS),
      },
      ...(orgId && { orgId: orgId }),
    };

    if (!Activity) return [];

    const events = await Activity.groupBy({
      by: ["type"],
      where,
      _count: {
        type: true,
      },
    });

    return events.map((e: { type: string; _count: { type: number } }) => ({
      eventName: e.type,
      count: e._count.type,
    }));
  } catch (error) {
    logger.error("[GET_PRODUCT_EVENTS_SUMMARY] Failed:", error);
    return [];
  }
}
