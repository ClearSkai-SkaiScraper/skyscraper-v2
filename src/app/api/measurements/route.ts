/**
 * GET  /api/measurements         — list measurement orders
 * POST /api/measurements         — place a new measurement order
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET — list orders                                                  */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ ok: false, message: "No organization" }, { status: 400 });
    }

    // Support optional claimId filter
    const url = new URL(request.url);
    const claimId = url.searchParams.get("claimId");

    const where: any = { org_id: user.orgId };
    if (claimId) {
      where.claim_id = claimId;
    }

    const orders = await prisma.measurement_orders.findMany({
      where,
      orderBy: { ordered_at: "desc" },
      take: 200,
    });

    return NextResponse.json({ ok: true, orders });
  } catch (error) {
    logger.error("[MEASUREMENTS_LIST_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed to load" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  POST — create order                                                */
/* ------------------------------------------------------------------ */

interface CreateOrderBody {
  propertyAddress: string;
  city?: string;
  state?: string;
  zip?: string;
  provider?: "gaf" | "eagleview" | "manual";
  orderType?: "roof" | "siding" | "gutters" | "full";
  claimId?: string;
  jobId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ ok: false, message: "No organization" }, { status: 400 });
    }

    const body: CreateOrderBody = await req.json();

    if (!body.propertyAddress) {
      return NextResponse.json(
        { ok: false, message: "Property address is required" },
        { status: 400 }
      );
    }

    const order = await prisma.measurement_orders.create({
      data: {
        org_id: user.orgId,
        claim_id: body.claimId ?? null,
        job_id: body.jobId ?? null,
        property_address: body.propertyAddress,
        city: body.city ?? null,
        state: body.state ?? null,
        zip: body.zip ?? null,
        provider: body.provider ?? "gaf",
        order_type: body.orderType ?? "roof",
        status: "pending",
        ordered_by: userId,
      },
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (error) {
    logger.error("[MEASUREMENTS_CREATE_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed to create order" },
      { status: 500 }
    );
  }
}
