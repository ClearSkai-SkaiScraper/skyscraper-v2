/**
 * POST /api/measurements/webhook
 *
 * Webhook endpoint for GAF QuickMeasure / EagleView callbacks.
 * When a measurement report is ready, the provider sends a webhook here
 * to update the order status and attach the report.
 */

import { NextRequest, NextResponse } from "next/server";

import { verifyGAFWebhookSignature } from "@/lib/integrations/gaf";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature (HMAC-SHA256)
    const rawBody = await req.text();
    const signature = req.headers.get("x-gaf-signature");

    const isValid = await verifyGAFWebhookSignature(rawBody, signature);
    if (!isValid) {
      logger.warn("[MEASUREMENTS_WEBHOOK] Invalid signature — rejecting");
      return NextResponse.json({ ok: false, message: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Validate webhook (provider-specific — GAF QuickMeasure format)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orderId, externalId, status, reportUrl, measurements, provider } = body;

    if (!orderId && !externalId) {
      return NextResponse.json(
        { ok: false, message: "Missing orderId or externalId" },
        { status: 400 }
      );
    }

    // Find the order — match by our ID or the provider's external ID
    const order = orderId
      ? await prisma.measurement_orders.findUnique({ where: { id: orderId } })
      : await prisma.measurement_orders.findFirst({
          where: { external_id: externalId },
        });

    if (!order) {
      logger.warn("[MEASUREMENTS_WEBHOOK] Order not found:", { orderId, externalId });
      return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
    }

    // Update the order
    const updateData: Record<string, unknown> = {
      metadata: {
        ...(order.metadata as Record<string, unknown> | null),
        webhookPayload: body,
        webhookReceivedAt: new Date().toISOString(),
      },
    };

    if (status === "completed" || reportUrl) {
      updateData.status = "completed";
      updateData.completed_at = new Date();
      if (reportUrl) updateData.report_url = reportUrl;
      if (measurements) updateData.measurements = measurements;
    } else if (status === "failed" || status === "error") {
      updateData.status = "failed";
      updateData.failed_at = new Date();
      updateData.failure_reason = body.error || body.message || "Provider reported failure";
    } else if (status === "processing") {
      updateData.status = "processing";
    }

    await prisma.measurement_orders.update({
      where: { id: order.id },
      data: updateData,
    });

    logger.info(
      `[MEASUREMENTS_WEBHOOK] Order ${order.id} updated to ${updateData.status ?? "unchanged"}`
    );

    return NextResponse.json({ ok: true, message: "Webhook processed" });
  } catch (error) {
    logger.error("[MEASUREMENTS_WEBHOOK_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
