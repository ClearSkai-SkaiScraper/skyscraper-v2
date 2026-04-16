import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";
import { submitVendorOrder } from "@/lib/vendors/vendorApiIntegration";

export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-syntax
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Vendor name lookup
const VENDOR_NAMES: Record<string, string> = {
  gaf: "GAF Materials",
  abc: "ABC Supply",
  srs: "SRS Distribution",
  beacon: "Beacon Building",
};

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

/**
 * POST /api/vendors/orders/[orderId]/submit
 * Submit a draft order to vendor
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    // Find the order
    const order = await prisma.materialOrder.findFirst({
      where: {
        id: orderId,
        orgId: ctx.orgId,
      },
      include: {
        MaterialOrderItem: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "draft") {
      return NextResponse.json({ error: "Only draft orders can be submitted" }, { status: 400 });
    }

    // Submit to vendor API integration
    const vendorResponse = await submitVendorOrder({
      orderId: order.orderNumber,
      vendorCode: order.vendor,
      items: order.MaterialOrderItem.map((item) => ({
        sku: item.productName, // Use productName as SKU identifier
        productName: item.productName,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      deliveryAddress: order.deliveryAddress || "",
      deliveryDate: order.deliveryDate?.toISOString().split("T")[0],
      specialInstructions: order.specialInstructions || undefined,
    });

    // Update order status based on vendor response
    const newStatus = vendorResponse.success ? "submitted" : "draft";
    const updatedOrder = await prisma.materialOrder.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    if (!vendorResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: vendorResponse.error || "Vendor API submission failed",
          vendorResponse,
        },
        { status: 400 }
      );
    }

    const vendorName = VENDOR_NAMES[order.vendor] || order.vendor;

    // Get user info for activity logging
    const user = await prisma.users.findUnique({
      where: { id: ctx.userId },
      select: { name: true },
    });
    const userName = user?.name || "Unknown";

    // Log activity
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        type: "material_order_submitted",
        title: `Order Submitted: ${order.orderNumber}`,
        description: `Material order ${order.orderNumber} submitted to ${vendorName}`,
        userId: ctx.userId,
        userName,
        claimId: order.claimId,
        metadata: {
          orderNumber: order.orderNumber,
          vendorName,
          total: Number(order.total),
        },
        updatedAt: new Date(),
      },
    });

    // Send vendor notification email (if contact email available)
    if (resend) {
      // Get org info for branding
      const org = await prisma.org.findUnique({ where: { id: ctx.orgId } });
      const orgName = org?.name || "SkaiScraper";

      // Build item list for email
      const itemsList = order.MaterialOrderItem.map(
        (item) => `• ${item.quantity}x ${item.productName}`
      ).join("\n");

      // Get team emails from org members
      const teamMembers = await prisma.users.findMany({
        where: { orgId: ctx.orgId },
        select: { email: true },
      });
      const teamEmails = teamMembers.map((m) => m.email).filter(Boolean) as string[];

      if (teamEmails.length > 0) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@skaiscrape.com",
          to: teamEmails.slice(0, 5), // Limit to 5 recipients
          subject: `Material Order Submitted: ${order.orderNumber}`,
          html: `
            <h2>Material Order Submitted</h2>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Vendor:</strong> ${vendorName}</p>
            <p><strong>Total:</strong> $${Number(order.total).toLocaleString()}</p>
            <p><strong>Submitted By:</strong> ${userName}</p>
            <h3>Items:</h3>
            <pre>${itemsList}</pre>
            <p>Log in to view the full order details.</p>
          `,
        });
        logger.debug(`[VENDOR_ORDER] Team notification sent for order ${order.orderNumber}`);
      }

      // Create in-app notification for the team
      const orgUsers = await prisma.users.findMany({
        where: { orgId: ctx.orgId },
        select: { id: true },
      });

      for (const orgUser of orgUsers) {
        if (orgUser.id !== ctx.userId) {
          const notificationId = crypto.randomUUID();
          await prisma.$executeRaw`
            INSERT INTO "Notification" ("id", "userId", "type", "title", "message", "claimId", "read", "createdAt")
            VALUES (${notificationId}, ${orgUser.id}, 'material_order', 'Material Order Submitted',
              ${`Order ${order.orderNumber} submitted to ${vendorName} - $${Number(order.total).toLocaleString()}`},
              ${order.claimId}, false, NOW())
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
      vendorResponse: {
        confirmationNumber: vendorResponse.confirmationNumber,
        vendorOrderId: vendorResponse.vendorOrderId,
        estimatedDelivery: vendorResponse.estimatedDelivery,
      },
      message: "Order submitted successfully",
    });
  } catch (error) {
    logger.error("Failed to submit order:", error);
    return NextResponse.json({ error: "Failed to submit order" }, { status: 500 });
  }
}
