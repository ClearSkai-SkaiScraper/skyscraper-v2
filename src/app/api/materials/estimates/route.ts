export const dynamic = "force-dynamic";
/**
 * /api/materials/estimates — CRUD for saved material estimates
 *
 * Uses the existing `material_carts` + `material_cart_items` Prisma models
 * with status="estimate" to distinguish from shopping carts.
 *
 * GET    → list saved estimates for the current org
 * POST   → save a new estimate (creates cart + items)
 * DELETE  → delete a saved estimate by id (query param ?id=xxx)
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/getAuthContext";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// GET — List saved estimates for the current org
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await getAuthContext();
    if (!session?.userId || !session?.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const carts = await prisma.material_carts.findMany({
      where: {
        orgId: session.orgId,
        status: "estimate",
      },
      include: {
        material_cart_items: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Transform to the shape the frontend expects
    const estimates = carts.map((cart) => ({
      id: cart.id,
      jobId: cart.jobId ?? undefined,
      claimId: cart.claimId ?? undefined,
      jobLabel: cart.name ?? "Unlinked Estimate",
      createdAt: cart.createdAt?.toISOString() ?? new Date().toISOString(),
      totalArea: (cart.metadata as Record<string, unknown>)?.totalArea ?? 0,
      pitch: (cart.metadata as Record<string, unknown>)?.pitch ?? "6/12",
      shingleType: (cart.metadata as Record<string, unknown>)?.shingleType ?? "ARCHITECTURAL",
      wasteFactor: (cart.metadata as Record<string, unknown>)?.wasteFactor ?? 1,
      totalCost: cart.material_cart_items.reduce(
        (sum, item) => sum + Number(item.lineTotal ?? 0),
        0
      ),
      materials: cart.material_cart_items.map((item) => ({
        category: item.category ?? "",
        productName: item.productName,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitPrice: Number(item.unitPrice ?? 0),
        totalPrice: Number(item.lineTotal ?? 0),
        coverage: (item.specifications as Record<string, unknown>)?.coverage as string | undefined,
      })),
    }));

    return NextResponse.json({ ok: true, estimates });
  } catch (err) {
    logger.error("[MATERIAL_ESTIMATES] GET error:", err);
    return NextResponse.json({ ok: false, error: "Failed to load estimates" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Save a new estimate (cart + items)
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthContext();
    if (!session?.userId || !session?.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, claimId, jobLabel, totalArea, pitch, shingleType, wasteFactor, materials } =
      body as {
        jobId?: string;
        claimId?: string;
        jobLabel?: string;
        totalArea: number;
        pitch: string;
        shingleType: string;
        wasteFactor: number;
        materials: Array<{
          category: string;
          productName: string;
          quantity: number;
          unit: string;
          unitPrice: number;
          totalPrice: number;
          coverage?: string;
        }>;
      };

    if (!materials?.length || !totalArea) {
      return NextResponse.json(
        { ok: false, error: "Missing materials or totalArea" },
        { status: 400 }
      );
    }

    const cart = await prisma.material_carts.create({
      data: {
        orgId: session.orgId,
        userId: session.userId,
        claimId: claimId ?? null,
        jobId: jobId ?? null,
        name: jobLabel || "Unlinked Estimate",
        status: "estimate",
        metadata: {
          totalArea,
          pitch,
          shingleType,
          wasteFactor,
          source: "material-estimator",
        },
        material_cart_items: {
          create: materials.map((m) => ({
            productName: m.productName,
            category: m.category || null,
            quantity: m.quantity,
            unit: m.unit,
            unitPrice: m.unitPrice,
            lineTotal: m.totalPrice,
            specifications: m.coverage ? { coverage: m.coverage } : undefined,
          })),
        },
      },
      include: {
        material_cart_items: true,
      },
    });

    logger.info(`[MATERIAL_ESTIMATES] Created estimate ${cart.id} for org ${session.orgId}`);

    return NextResponse.json({
      ok: true,
      estimate: {
        id: cart.id,
        jobId: cart.jobId,
        claimId: cart.claimId,
        jobLabel: cart.name,
        createdAt: cart.createdAt?.toISOString(),
      },
    });
  } catch (err) {
    logger.error("[MATERIAL_ESTIMATES] POST error:", err);
    return NextResponse.json({ ok: false, error: "Failed to save estimate" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — Remove a saved estimate
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAuthContext();
    if (!session?.userId || !session?.orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing estimate id" }, { status: 400 });
    }

    // Verify ownership (same org)
    const existing = await prisma.material_carts.findFirst({
      where: { id, orgId: session.orgId, status: "estimate" },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Estimate not found" }, { status: 404 });
    }

    // Cascade deletes cart items automatically
    await prisma.material_carts.delete({ where: { id } });

    logger.info(`[MATERIAL_ESTIMATES] Deleted estimate ${id}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[MATERIAL_ESTIMATES] DELETE error:", err);
    return NextResponse.json({ ok: false, error: "Failed to delete estimate" }, { status: 500 });
  }
}
