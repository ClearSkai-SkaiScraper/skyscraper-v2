/**
 * GAF QuickMeasure API Client
 *
 * Handles:
 * - OAuth / API key authentication with GAF
 * - Ordering roof measurements
 * - Checking order status
 * - Retrieving completed measurement reports
 * - Webhook signature verification
 *
 * Environment vars required:
 * - GAF_API_KEY          — Partner API key from GAF
 * - GAF_API_SECRET       — Partner secret for webhook signature verification
 * - GAF_ENVIRONMENT      — sandbox | production
 *
 * GAF QuickMeasure API docs:
 *   https://developer.gaf.com/quickmeasure (partner access required)
 *
 * IMPORTANT: Never import this file on the client side.
 */

import "server-only";

import { logger } from "@/lib/logger";

// ── Config ──────────────────────────────────────────────────────────────

const GAF_API_BASE =
  // eslint-disable-next-line no-restricted-syntax
  process.env.GAF_ENVIRONMENT === "production"
    ? "https://api.gaf.com/quickmeasure/v1"
    : "https://sandbox-api.gaf.com/quickmeasure/v1";

// eslint-disable-next-line no-restricted-syntax
const apiKey = process.env.GAF_API_KEY || "";
// eslint-disable-next-line no-restricted-syntax
const apiSecret = process.env.GAF_API_SECRET || "";

// ── Types ───────────────────────────────────────────────────────────────

export interface GAFMeasurementOrder {
  orderId: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  orderType: "roof" | "siding" | "gutters" | "full";
  reportUrl?: string;
  measurements?: GAFMeasurements;
  estimatedCompletionTime?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GAFMeasurements {
  totalSquares: number;
  totalArea: number;
  ridgeLength: number;
  hipLength: number;
  valleyLength: number;
  rakeLength: number;
  eaveLength: number;
  flashingLength: number;
  dripEdgeLength: number;
  pitch: string;
  predominantPitch: string;
  facets: GAFFacet[];
  wasteFactor: number;
}

export interface GAFFacet {
  id: string;
  area: number;
  pitch: string;
  vertices: Array<{ x: number; y: number }>;
}

export interface GAFOrderRequest {
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  orderType: "roof" | "siding" | "gutters" | "full";
  callbackUrl: string;
  customerRef?: string;
  notes?: string;
  urgency?: "standard" | "rush";
}

// ── Client Class ────────────────────────────────────────────────────────

export class GAFQuickMeasureClient {
  private orgId: string;

  constructor(orgId: string) {
    if (!apiKey) {
      throw new Error("[GAF] API key not configured. Set GAF_API_KEY env var.");
    }
    this.orgId = orgId;
  }

  // ── Low-level request ─────────────────────────────────────────────────

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${GAF_API_BASE}${endpoint}`;

    const res = await fetch(url, {
      method,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`GAF API error (${res.status}): ${errorText}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Order Measurements ────────────────────────────────────────────────

  /**
   * Place a new measurement order with GAF QuickMeasure.
   * Returns the order ID for tracking.
   */
  async orderMeasurement(input: GAFOrderRequest): Promise<GAFMeasurementOrder> {
    logger.info(`[GAF] Ordering ${input.orderType} measurement for ${input.address.street}`);

    const result = await this.request<GAFMeasurementOrder>("POST", "/orders", {
      address: input.address,
      orderType: input.orderType,
      callbackUrl: input.callbackUrl,
      customerRef: input.customerRef || this.orgId,
      notes: input.notes,
      urgency: input.urgency || "standard",
    });

    logger.info(`[GAF] Order placed: ${result.orderId} (status: ${result.status})`);
    return result;
  }

  /**
   * Check the status of an existing measurement order.
   */
  async getOrderStatus(orderId: string): Promise<GAFMeasurementOrder> {
    return this.request<GAFMeasurementOrder>("GET", `/orders/${orderId}`);
  }

  /**
   * Get the measurement report (PDF URL + structured data) for a completed order.
   */
  async getReport(orderId: string): Promise<{
    reportUrl: string;
    measurements: GAFMeasurements;
    generatedAt: string;
  }> {
    return this.request("GET", `/orders/${orderId}/report`);
  }

  /**
   * Cancel a pending measurement order.
   */
  async cancelOrder(orderId: string, reason?: string): Promise<{ ok: boolean }> {
    return this.request("POST", `/orders/${orderId}/cancel`, {
      reason: reason || "Cancelled by user",
    });
  }

  /**
   * List all orders for this org.
   */
  async listOrders(
    status?: string,
    page = 1,
    limit = 20
  ): Promise<{ orders: GAFMeasurementOrder[]; total: number }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set("status", status);
    return this.request("GET", `/orders?${params.toString()}`);
  }

  /**
   * Test API connection.
   */
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.listOrders(undefined, 1, 1);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }
}

// ── Webhook Signature Verification ──────────────────────────────────────

/**
 * Verify the HMAC-SHA256 signature on inbound GAF webhooks.
 *
 * GAF sends:
 *   X-GAF-Signature: sha256=<hex-digest>
 *
 * Where the digest is HMAC-SHA256(secret, rawBody).
 */
export async function verifyGAFWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!apiSecret) {
    logger.warn("[GAF] No API secret configured — skipping webhook signature verification");
    return true; // Allow in dev when secret isn't set
  }

  if (!signatureHeader) {
    logger.warn("[GAF] Missing X-GAF-Signature header");
    return false;
  }

  const [algo, providedSignature] = signatureHeader.split("=");
  if (algo !== "sha256" || !providedSignature) {
    logger.warn("[GAF] Invalid signature format");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const computedHex = Buffer.from(signature).toString("hex");

    const isValid = computedHex === providedSignature;
    if (!isValid) {
      logger.warn("[GAF] Webhook signature mismatch");
    }
    return isValid;
  } catch (err) {
    logger.error("[GAF] Signature verification error:", err);
    return false;
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

/**
 * Get a GAF QuickMeasure client for an org.
 */
export function getGAFClient(orgId: string): GAFQuickMeasureClient {
  return new GAFQuickMeasureClient(orgId);
}

// ── Measurement Utility ─────────────────────────────────────────────────

/**
 * Convert GAF measurements to a summary useful for estimates.
 */
export function summarizeMeasurements(m: GAFMeasurements): {
  totalSquares: number;
  totalAreaSqFt: number;
  ridgeFt: number;
  hipFt: number;
  valleyFt: number;
  rakeFt: number;
  eaveFt: number;
  dripEdgeFt: number;
  flashingFt: number;
  predominantPitch: string;
  facetCount: number;
  wasteFactor: number;
  estimatedShingleBundles: number;
} {
  // 3 bundles per square is the standard rule of thumb
  const estimatedShingleBundles = Math.ceil(m.totalSquares * 3 * (1 + m.wasteFactor / 100));

  return {
    totalSquares: m.totalSquares,
    totalAreaSqFt: m.totalArea,
    ridgeFt: m.ridgeLength,
    hipFt: m.hipLength,
    valleyFt: m.valleyLength,
    rakeFt: m.rakeLength,
    eaveFt: m.eaveLength,
    dripEdgeFt: m.dripEdgeLength,
    flashingFt: m.flashingLength,
    predominantPitch: m.predominantPitch,
    facetCount: m.facets.length,
    wasteFactor: m.wasteFactor,
    estimatedShingleBundles,
  };
}
