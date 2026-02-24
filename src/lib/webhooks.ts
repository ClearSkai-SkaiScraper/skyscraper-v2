import crypto from "crypto";

import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";

import { fetchWithRetry } from "./net/fetchWithRetry";
// Cast helper to bypass union delegate type limitations for dynamic model names
const delegate = (name: string) => (getDelegate as any)(name) as any;

// Webhook event types
export type WebhookEvent =
  | "claim.created"
  | "claim.updated"
  | "claim.deleted"
  | "property.created"
  | "property.updated"
  | "team.member.added"
  | "team.member.removed";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  orgId: string;
  data: Record<string, any>;
}

/**
 * Trigger webhooks for a specific event
 * Called by other parts of the application when events occur
 */
export async function triggerWebhooks(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, any>
) {
  try {
    // Find all active webhooks for this org that are subscribed to this event
    const webhooks = await delegate("webhooks").findMany({
      where: {
        orgId,
        status: "active",
        events: { has: event },
      },
    });

    if (webhooks.length === 0) {
      logger.debug(`No webhooks registered for ${event} in org ${orgId}`);
      return;
    }

    // Prepare payload
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      orgId,
      data,
    };

    // Trigger all webhooks in parallel
    const results = await Promise.allSettled(
      webhooks.map((webhook) => deliverWebhook(webhook, payload))
    );

    // Log results
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Webhook ${webhooks[index].id} failed:`, result.reason);
      }
    });
  } catch (error) {
    logger.error("Failed to trigger webhooks:", error);
  }
}

/**
 * Deliver a webhook to a single endpoint with retry logic
 */
async function deliverWebhook(webhook: any, payload: WebhookPayload): Promise<void> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Generate signature
      const signature = generateSignature(payload, webhook.secret);

      // Send webhook request (internal retry handles transient network errors)
      const response = await fetchWithRetry(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": payload.event,
          "User-Agent": "SkaiScraper-Webhooks/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Success - update webhook stats
      await delegate("webhooks").update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: 0, // Reset on success
        },
      });
      await delegate("webhook_logs").create({
        data: {
          webhookId: webhook.id,
          event: payload.event,
          payload,
          status: "success",
          responseCode: response.status,
        },
      });

      return; // Success - exit
    } catch (error) {
      lastError = error as Error;
      console.error(`Webhook ${webhook.id} attempt ${attempt} failed:`, error);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed
  const newFailureCount = (webhook.failureCount || 0) + 1;

  // Disable webhook after 10 consecutive failures
  const shouldDisable = newFailureCount >= 10;

  await delegate("webhooks").update({
    where: { id: webhook.id },
    data: {
      failureCount: newFailureCount,
      status: shouldDisable ? "disabled" : webhook.status,
    },
  });

  // Log failure
  await delegate("webhook_logs").create({
    data: {
      webhookId: webhook.id,
      event: payload.event,
      payload,
      status: "failed",
      errorMessage: lastError?.message || "Unknown error",
    },
  });

  throw lastError;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: WebhookPayload, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Verify webhook signature (for receiving webhooks from external services)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
