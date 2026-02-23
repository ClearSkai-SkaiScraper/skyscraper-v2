/**
 * GET    /api/measurements/[id]  — get a single order
 * PATCH  /api/measurements/[id]  — update order (status, report, measurements)
 * DELETE /api/measurements/[id]  — cancel an order
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/* ------------------------------------------------------------------ */
/*  GET                                                                */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const { id } = await params;

    const order = await prisma.measurement_orders.findFirst({
      where: { id, org_id: orgId },
    });

    if (!order) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    logger.error("[MEASUREMENTS_GET_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH                                                              */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const { id } = await params;
    const body = await req.json();

    // Verify order belongs to this org before updating
    const existing = await prisma.measurement_orders.findFirst({
      where: { id, org_id: orgId },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }

    const updated = await prisma.measurement_orders.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.reportUrl && { report_url: body.reportUrl }),
        ...(body.measurements && { measurements: body.measurements }),
        ...(body.externalId && { external_id: body.externalId }),
        ...(body.status === "completed" && { completed_at: new Date() }),
        ...(body.status === "failed" && {
          failed_at: new Date(),
          failure_reason: body.failureReason ?? "Unknown error",
        }),
      },
    });

    return NextResponse.json({ ok: true, order: updated });
  } catch (error) {
    logger.error("[MEASUREMENTS_UPDATE_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE (soft-cancel)                                               */
/* ------------------------------------------------------------------ */

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId } = auth;

    const { id } = await params;

    // Verify order belongs to this org before cancelling
    const existing = await prisma.measurement_orders.findFirst({
      where: { id, org_id: orgId },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
    }

    await prisma.measurement_orders.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ ok: true, message: "Order cancelled" });
  } catch (error) {
    logger.error("[MEASUREMENTS_DELETE_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed" },
      { status: 500 }
    );
  }
}
