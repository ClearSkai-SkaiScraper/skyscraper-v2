import { logger } from "@/lib/logger";

/**
 * Queue Helper - Safe Job Enqueue
 *
 * Placeholder for Redis/Upstash/BullMQ integration.
 * Currently logs to console for debugging.
 *
 * Usage:
 *   await enqueueJobSafe("publicLead.intake", { leadId, orgId, ... });
 *
 * Future: Wire into Upstash Redis Queue or BullMQ
 */

export async function enqueueJobSafe(
  queueName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>
): Promise<void> {
  // S1-01: NO LONGER A SILENT NO-OP
  // Log a visible warning so we can track any callers that rely on this
  logger.warn(
    `[QUEUE_NOT_WIRED] enqueueJobSafe called for "${queueName}" but no backing queue is configured. Job data logged but NOT processed.`,
    {
      queueName,
      payloadKeys: Object.keys(payload),
    }
  );

  // TODO: Wire to pg-boss when queue integration is ready:
  // import { pgBoss } from "@/lib/queue/pg-boss";
  // await pgBoss.send(queueName, payload);
}
