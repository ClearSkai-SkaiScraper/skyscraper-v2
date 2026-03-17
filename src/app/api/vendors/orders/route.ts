import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Vendor name lookup for demo
const VENDOR_NAMES: Record<string, string> = {
  gaf: "GAF Materials",
  abc: "ABC Supply",
  srs: "SRS Distribution",
  beacon: "Beacon Building",
};

/**
 * GET /api/vendors/orders
 * Fetch material orders with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const vendorId = searchParams.get("vendorId");

    const where: Record<string, unknown> = {
      orgId: ctx.orgId,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (vendorId) {
      where.vendor = vendorId;
    }

    const orders = await prisma.materialOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        MaterialOrderItem: true,
        claims: {
          select: {
            id: true,
          },
        },
      },
    });

    // Transform orders
    const transformedOrders = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      vendor: order.vendor,
      vendorName: VENDOR_NAMES[order.vendor] || order.vendor,
      status: order.status,
      orderType: order.orderType,
      deliveryDate: order.deliveryDate,
      deliveryAddress: order.deliveryAddress,
      dropZoneNotes: order.dropZoneNotes,
      specialInstructions: order.specialInstructions,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      delivery: Number(order.delivery),
      total: Number(order.total),
      createdAt: order.createdAt,
      claimId: order.claimId,
      linkedJobs: order.claimId
        ? [{ id: order.claimId, title: order.deliveryAddress || "Linked Claim" }]
        : [],
      items: order.MaterialOrderItem.map((item) => ({
        id: item.id,
        productName: item.productName,
        category: item.category,
        manufacturer: item.manufacturer,
        color: item.color,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    }));

    return NextResponse.json({
      success: true,
      orders: transformedOrders,
    });
  } catch (error) {
    logger.error("Failed to fetch material orders:", error);
    return NextResponse.json({ error: "Failed to fetch material orders" }, { status: 500 });
  }
}

/**
 * POST /api/vendors/orders
 * Create a new material order
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      vendor,
      orderType,
      deliveryDate,
      deliveryAddress,
      dropZoneNotes,
      specialInstructions,
      linkedJobId,
      claimId,
      items,
      subtotal,
      tax,
      delivery,
      total,
    } = body;

    // Validate required fields
    if (!vendor || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Vendor and at least one item are required" },
        { status: 400 }
      );
    }

    // Get a claim ID - required by schema
    let resolvedClaimId = claimId || linkedJobId;
    if (!resolvedClaimId) {
      // Try to find an existing claim for the org
      const existingClaim = await prisma.claims.findFirst({
        where: { orgId: ctx.orgId },
        select: { id: true },
      });

      if (existingClaim) {
        resolvedClaimId = existingClaim.id;
      } else {
        return NextResponse.json(
          { error: "A claim must be linked to create a material order" },
          { status: 400 }
        );
      }
    }

    // Generate order number
    const orderCount = await prisma.materialOrder.count({
      where: { orgId: ctx.orgId },
    });
    const orderNumber = `MO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(3, "0")}`;

    // Create order with items
    const order = await prisma.materialOrder.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        claimId: resolvedClaimId,
        orderNumber,
        vendor,
        status: "draft",
        orderType: orderType || "standard",
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        deliveryAddress: deliveryAddress || "",
        dropZoneNotes: dropZoneNotes || undefined,
        specialInstructions: specialInstructions || undefined,
        subtotal: subtotal || 0,
        tax: tax || 0,
        delivery: delivery || 0,
        total: total || 0,
        updatedAt: new Date(),
        MaterialOrderItem: {
          create: items.map(
            (item: {
              productName: string;
              category: string;
              manufacturer?: string;
              color?: string;
              quantity: number;
              unit: string;
              unitPrice: number;
              lineTotal: number;
            }) => ({
              id: crypto.randomUUID(),
              productName: item.productName,
              category: item.category,
              manufacturer: item.manufacturer,
              color: item.color,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })
          ),
        },
      },
      include: {
        MaterialOrderItem: true,
      },
    });

    // Get user name
    const user = await prisma.users.findUnique({
      where: { id: ctx.userId },
      select: { name: true },
    });

    // Log activity
    await prisma.activities.create({
      data: {
        id: crypto.randomUUID(),
        orgId: ctx.orgId,
        type: "material_order_created",
        title: `Material Order Created: ${orderNumber}`,
        description: `New material order created with ${items.length} items, total: $${total?.toFixed(2)}`,
        userId: ctx.userId,
        userName: user?.name || "Unknown",
        claimId: resolvedClaimId,
        metadata: {
          orderNumber,
          vendor,
          orderType,
          itemCount: items.length,
          total,
        },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: Number(order.total),
      },
    });
  } catch (error) {
    logger.error("Failed to create material order:", error);
    return NextResponse.json({ error: "Failed to create material order" }, { status: 500 });
  }
}
