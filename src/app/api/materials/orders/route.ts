/**
 * GET /api/materials/orders — List material orders for the org
 * POST /api/materials/orders — Create a new material order
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const claimId = req.nextUrl.searchParams.get("claimId");
    const status = req.nextUrl.searchParams.get("status");

    const where: Record<string, unknown> = { orgId };
    if (claimId) where.claimId = claimId;
    if (status) where.status = status;

    const orders = await prisma.materialOrder.findMany({
      where,
      include: {
        MaterialOrderItem: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        status: o.status,
        supplier: o.vendor,
        orderNumber: o.orderNumber,
        items: o.MaterialOrderItem.map((i) => ({
          name: i.productName,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
        })),
        subtotal: Number(o.subtotal),
        tax: Number(o.tax),
        total: Number(o.total),
        deliveryAddress: o.deliveryAddress,
        trackingNumber: o.trackingNumber,
        jobLabel: o.claimId,
      })),
    });
  } catch (error) {
    logger.error("[MATERIALS_ORDERS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, { orgId, userId: _userId }) => {
  try {
    const body = await req.json();
    const { claimId, vendor, items, deliveryAddress, orderType, specialInstructions } = body;

    if (!claimId || !vendor || !items?.length) {
      return NextResponse.json(
        { error: "claimId, vendor, and items are required" },
        { status: 400 }
      );
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true },
    });
    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const now = new Date();
    const orderNumber = `MO-${Date.now().toString(36).toUpperCase()}`;

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) => sum + i.quantity * i.unitPrice,
      0
    );
    const tax = subtotal * 0.0; // Tax calculated at checkout
    const total = subtotal + tax;

    const order = await prisma.materialOrder.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        claimId,
        orderNumber,
        vendor,
        status: "draft",
        orderType: orderType || "standard",
        deliveryAddress: deliveryAddress || "",
        specialInstructions,
        subtotal,
        tax,
        total,
        createdAt: now,
        updatedAt: now,
        MaterialOrderItem: {
          create: items.map(
            (i: {
              productName: string;
              category?: string;
              quantity: number;
              unit: string;
              unitPrice: number;
              manufacturer?: string;
              color?: string;
            }) => ({
              id: crypto.randomUUID(),
              category: i.category || "general",
              productName: i.productName,
              manufacturer: i.manufacturer,
              color: i.color,
              quantity: i.quantity,
              unit: i.unit || "ea",
              unitPrice: i.unitPrice,
              lineTotal: i.quantity * i.unitPrice,
              createdAt: now,
            })
          ),
        },
      },
      include: { MaterialOrderItem: true },
    });

    logger.info("[MATERIALS_ORDERS_CREATE]", { orgId, orderId: order.id, orderNumber });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    logger.error("[MATERIALS_ORDERS_CREATE]", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
});
