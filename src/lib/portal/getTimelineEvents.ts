import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Safe wrapper to fetch timeline events without crashing if table missing
export async function getClaimTimelineEventsSafe(claimId: string) {
  try {
    const events = await prisma.claim_timeline_events.findMany({
      where: { claim_id: claimId, visible_to_client: true },
      orderBy: { occurred_at: "asc" },
    });
    return events;
  } catch (err: any) {
    const msg = err?.message || "";
    if (/relation .*claim_timeline_events.* does not exist/i.test(msg)) {
      logger.warn("[timeline] claim_timeline_events table missing; returning empty list.");
      return [];
    }
    logger.error("[TIMELINE] Unexpected error loading events", { error: msg });
    return [];
  }
}
