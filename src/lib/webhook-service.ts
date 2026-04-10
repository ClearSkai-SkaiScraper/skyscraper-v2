// ============================================================================
// H-18: Webhook Delivery Service
// ============================================================================
// Note: This is a placeholder for future webhook functionality.
// The Webhook and WebhookLog models need to be added to the schema.
// For now, the service is stubbed to prevent runtime errors.

import crypto from "crypto";

import { logger } from "@/lib/logger";

interface WebhookPayload {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: string;
  orgId: string;
}

export class WebhookService {
  private static async signPayload(payload: string, secret: string): Promise<string> {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  private static async deliverWebhook(
    url: string,
    payload: WebhookPayload,
    secret: string,
    attempt: number = 1
  ): Promise<{ success: boolean; statusCode?: number; error?: string; duration: number }> {
    const startTime = Date.now();
    const payloadString = JSON.stringify(payload);
    const signature = await this.signPayload(payloadString, secret);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": payload.event,
          "X-Webhook-Delivery": crypto.randomUUID(),
          "X-Webhook-Attempt": attempt.toString(),
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      return {
        success,
        statusCode: response.status,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      };
    }
  }

  // Stubbed: Webhook models not yet in schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async sendWebhook(_event: string, _data: any, _orgId: string): Promise<void> {
    // Enhancement: Implement when Webhook and WebhookLog models are added to schema
    // For now, log and return silently
    logger.debug(`[WEBHOOK_STUB] Would send webhook event: ${_event} for org: ${_orgId}`);
    return;
  }

  // Convenience methods for common events
  static async sendClaimCreated(claimId: string, orgId: string) {
    await this.sendWebhook("claim.created", { claimId }, orgId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async sendClaimUpdated(claimId: string, changes: any, orgId: string) {
    await this.sendWebhook("claim.updated", { claimId, changes }, orgId);
  }

  static async sendSupplementAdded(supplementId: string, claimId: string, orgId: string) {
    await this.sendWebhook("supplement.added", { supplementId, claimId }, orgId);
  }

  static async sendUploadCompleted(uploadId: string, claimId: string, orgId: string) {
    await this.sendWebhook("upload.completed", { uploadId, claimId }, orgId);
  }
}
