/**
 * GET  /api/measurements         — list measurement orders
 * POST /api/measurements         — place a new measurement order (via GAF/EagleView API)
 */

import { getGAFClient } from "@/lib/integrations/gaf";
import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
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
    return NextResponse.json({ ok: false, message: "Failed to load" }, { status: 500 });
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

    const provider = body.provider ?? "gaf";
    const orderType = body.orderType ?? "roof";

    // Create the local DB record first
    const order = await prisma.measurement_orders.create({
      data: {
        org_id: user.orgId,
        claim_id: body.claimId ?? null,
        job_id: body.jobId ?? null,
        property_address: body.propertyAddress,
        city: body.city ?? null,
        state: body.state ?? null,
        zip: body.zip ?? null,
        provider,
        order_type: orderType,
        status: "pending",
        ordered_by: userId,
      },
    });

    // If provider is GAF, call the GAF API to actually place the order
    if (provider === "gaf" && process.env.GAF_API_KEY) {
      try {
        const gaf = getGAFClient(user.orgId);
        const gafOrder = await gaf.orderMeasurement({
          address: {
            street: body.propertyAddress,
            city: body.city ?? "",
            state: body.state ?? "",
            zip: body.zip ?? "",
          },
          orderType: orderType as "roof" | "siding" | "gutters" | "full",
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://skaiscrape.com"}/api/measurements/webhook`,
          customerRef: order.id,
          urgency: body.urgency ?? "standard",
        });

        // Update local record with GAF order info
        await prisma.measurement_orders.update({
          where: { id: order.id },
          data: {
            external_id: gafOrder.orderId,
            status: gafOrder.status,
            metadata: {
              gafOrderId: gafOrder.orderId,
              estimatedCompletion: gafOrder.estimatedCompletionTime,
              placedAt: new Date().toISOString(),
            },
          },
        });

        logger.info("[MEASUREMENTS_CREATE] GAF order placed", {
          orderId: order.id,
          gafOrderId: gafOrder.orderId,
        });
      } catch (gafErr) {
        // Log but don't fail — local record exists, can retry
        logger.error("[MEASUREMENTS_CREATE] GAF API call failed:", gafErr);
        await prisma.measurement_orders.update({
          where: { id: order.id },
          data: {
            metadata: {
              gafError: gafErr instanceof Error ? gafErr.message : "GAF API error",
              errorAt: new Date().toISOString(),
            },
          },
        });
      }
    }

    // If provider is EagleView, log for manual follow-up (API not yet available)
    if (provider === "eagleview") {
      logger.info("[MEASUREMENTS_CREATE] EagleView order created (manual follow-up required)", {
        orderId: order.id,
      });
      await prisma.measurement_orders.update({
        where: { id: order.id },
        data: {
          metadata: {
            note: "EagleView orders require manual placement at connect.eagleview.com",
            createdAt: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (error) {
    logger.error("[MEASUREMENTS_CREATE_ERROR]", error);
    return NextResponse.json({ ok: false, message: "Failed to create order" }, { status: 500 });
  }
}
