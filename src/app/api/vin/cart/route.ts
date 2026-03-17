/**
 * VIN — Materials Cart API
 * GET    /api/vin/cart — Get user's carts
 * POST   /api/vin/cart — Create cart / Add items
 * PUT    /api/vin/cart — Update cart item
 * DELETE /api/vin/cart — Remove cart item
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "open";
    const claimId = searchParams.get("claimId");

    const where: Record<string, unknown> = {
      orgId: ctx.orgId,
      userId: ctx.userId,
    };

    if (status !== "all") where.status = status;
    if (claimId) where.claimId = claimId;

    const carts = await prisma.material_carts.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        material_cart_items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      carts: carts.map((cart) => ({
        id: cart.id,
        name: cart.name,
        status: cart.status,
        supplier: cart.supplier,
        claimId: cart.claimId,
        jobId: cart.jobId,
        material_cart_items: cart.material_cart_items.map((item) => ({
          id: item.id,
          productName: item.productName,
          sku: item.sku,
          manufacturer: item.manufacturer,
          category: item.category,
          color: item.color,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          lineTotal: item.lineTotal ? Number(item.lineTotal) : null,
          supplier: item.supplier,
          supplierUrl: item.supplierUrl,
          imageUrl: item.imageUrl,
          notes: item.notes,
        })),
        itemCount: cart.material_cart_items.length,
        totalEstimate: cart.material_cart_items.reduce(
          (sum, i) => sum + (i.lineTotal ? Number(i.lineTotal) : 0),
          0
        ),
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      })),
    });
  } catch (error) {
    logger.error("[VIN Cart] Error:", error);
    return NextResponse.json({ error: "Failed to fetch carts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Create a new cart
    if (action === "create_cart") {
      const cart = await prisma.material_carts.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          name: body.name || "Untitled Cart",
          claimId: body.claimId,
          jobId: body.jobId,
          supplier: body.supplier,
          status: "open",
        },
      });

      return NextResponse.json({ success: true, cart });
    }

    // Add item to cart
    if (action === "add_item") {
      const {
        cartId,
        productName,
        sku,
        manufacturer,
        category,
        color,
        quantity,
        unit,
        unitPrice,
        supplier,
        supplierUrl,
        imageUrl,
        notes,
      } = body;

      if (!cartId || !productName) {
        return NextResponse.json({ error: "cartId and productName required" }, { status: 400 });
      }

      // Verify cart belongs to caller's org
      const ownerCart = await prisma.material_carts.findFirst({
        where: { id: cartId, orgId: ctx.orgId },
      });
      if (!ownerCart) {
        return NextResponse.json({ error: "Cart not found" }, { status: 404 });
      }

      const lineTotal = quantity && unitPrice ? quantity * unitPrice : null;

      const item = await prisma.material_cart_items.create({
        data: {
          cartId,
          productName,
          sku,
          manufacturer,
          category,
          color,
          quantity: quantity || 1,
          unit: unit || "each",
          unitPrice,
          lineTotal,
          supplier,
          supplierUrl,
          imageUrl,
          notes,
        },
      });

      // Update cart timestamp
      await prisma.material_carts.update({
        where: { id: cartId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({ success: true, item });
    }

    // Submit cart → create material order
    if (action === "submit_cart") {
      const { cartId } = body;

      // Verify cart belongs to caller's org
      const cart = await prisma.material_carts.findFirst({
        where: { id: cartId, orgId: ctx.orgId },
        include: { material_cart_items: true },
      });

      if (!cart) {
        return NextResponse.json({ error: "Cart not found" }, { status: 404 });
      }

      if (cart.material_cart_items.length === 0) {
        return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
      }

      // Get a claim ID if possible
      let claimId = cart.claimId;
      if (!claimId) {
        const claim = await prisma.claims.findFirst({
          where: { orgId: ctx.orgId },
          select: { id: true },
        });
        claimId = claim?.id || null;
      }

      if (!claimId) {
        return NextResponse.json({ error: "No claim found to link order" }, { status: 400 });
      }

      const orderCount = await prisma.materialOrder.count({ where: { orgId: ctx.orgId } });
      const orderNumber = `MO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(3, "0")}`;

      const total = cart.material_cart_items.reduce(
        (s, i) => s + (i.lineTotal ? Number(i.lineTotal) : 0),
        0
      );

      const order = await prisma.materialOrder.create({
        data: {
          id: crypto.randomUUID(),
          orgId: ctx.orgId,
          claimId,
          orderNumber,
          vendor: cart.supplier || "custom",
          status: "submitted",
          orderType: "standard",
          deliveryAddress: "",
          subtotal: total,
          tax: 0,
          delivery: 0,
          total,
          updatedAt: new Date(),
          MaterialOrderItem: {
            create: cart.material_cart_items.map((item) => ({
              id: crypto.randomUUID(),
              productName: item.productName,
              category: item.category || "general",
              manufacturer: item.manufacturer,
              color: item.color,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice || 0,
              lineTotal: item.lineTotal || 0,
            })),
          },
        },
      });

      // Mark cart as submitted
      await prisma.material_carts.update({
        where: { id: cartId },
        data: { status: "submitted" },
      });

      // Workflow event
      await prisma.vendor_workflow_events.create({
        data: {
          orgId: ctx.orgId,
          eventType: "cart_submitted",
          entityType: "material_cart",
          entityId: cartId,
          claimId,
          payload: {
            orderNumber,
            orderId: order.id,
            itemCount: cart.material_cart_items.length,
            total,
          },
        },
      });

      return NextResponse.json({ success: true, order: { id: order.id, orderNumber } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("[VIN Cart] Error:", error);
    return NextResponse.json({ error: "Failed to process cart action" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { itemId, quantity, unitPrice, notes } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }

    // Verify item belongs to a cart owned by caller's org
    const existingItem = await prisma.material_cart_items.findFirst({
      where: {
        id: itemId,
        material_carts: { orgId: ctx.orgId },
      },
    });
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const lineTotal = quantity && unitPrice ? quantity * unitPrice : undefined;

    const item = await prisma.material_cart_items.update({
      where: { id: itemId },
      data: {
        quantity,
        unitPrice,
        lineTotal,
        notes,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    logger.error("[VIN Cart] Update error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const cartId = searchParams.get("cartId");

    if (cartId) {
      // Verify cart belongs to caller's org before deleting
      const existing = await prisma.material_carts.findFirst({
        where: { id: cartId, orgId: ctx.orgId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Cart not found" }, { status: 404 });
      }
      await prisma.material_carts.delete({ where: { id: cartId } });
      return NextResponse.json({ success: true, deleted: "cart" });
    }

    if (itemId) {
      // Verify item belongs to a cart owned by caller's org
      const existingItem = await prisma.material_cart_items.findFirst({
        where: {
          id: itemId,
          material_carts: { orgId: ctx.orgId },
        },
      });
      if (!existingItem) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      await prisma.material_cart_items.delete({ where: { id: itemId } });
      return NextResponse.json({ success: true, deleted: "item" });
    }

    return NextResponse.json({ error: "itemId or cartId required" }, { status: 400 });
  } catch (error) {
    logger.error("[VIN Cart] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
