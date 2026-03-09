import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { createId } from "@paralleldrive/cuid2";

export const dynamic = "force-dynamic";

const createPinSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  ownerName: z.string().optional(),
  outcome: z.enum([
    "no_answer",
    "interested",
    "signed",
    "come_back",
    "not_interested",
    "not_home",
  ]).default("no_answer"),
  notes: z.string().optional(),
  followUpDate: z.string().datetime().optional(),
  areaTag: z.string().optional(),
});

const updatePinSchema = createPinSchema.partial().extend({
  id: z.string(),
});

/**
 * GET /api/canvass-pins — List all canvass pins for the org
 * Query params: ?area=xxx&outcome=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const area = url.searchParams.get("area");
    const outcome = url.searchParams.get("outcome");

    const where: any = { orgId: ctx.orgId };
    if (area) where.areaTag = area;
    if (outcome) where.outcome = outcome;

    const pins = await prisma.canvass_pins.findMany({
      where,
      orderBy: { knockedAt: "desc" },
      take: 500,
    });

    // Also get unique area tags for the filter UI
    const areaTags = await prisma.canvass_pins.findMany({
      where: { orgId: ctx.orgId },
      select: { areaTag: true },
      distinct: ["areaTag"],
    });

    // Get outcome counts
    const stats = await prisma.canvass_pins.groupBy({
      by: ["outcome"],
      where: { orgId: ctx.orgId },
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        pins: pins.map((p) => ({
          ...p,
          lat: Number(p.lat),
          lng: Number(p.lng),
        })),
        areaTags: areaTags.map((t) => t.areaTag).filter(Boolean),
        stats: stats.reduce(
          (acc, s) => {
            acc[s.outcome] = s._count.id;
            return acc;
          },
          {} as Record<string, number>
        ),
        total: pins.length,
      },
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] canvass-pins GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/canvass-pins — Create a new canvass pin
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createPinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const pin = await prisma.canvass_pins.create({
      data: {
        id: createId(),
        orgId: ctx.orgId,
        userId: ctx.userId,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        zipCode: parsed.data.zipCode,
        ownerName: parsed.data.ownerName,
        outcome: parsed.data.outcome,
        notes: parsed.data.notes,
        followUpDate: parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null,
        areaTag: parsed.data.areaTag,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...pin, lat: Number(pin.lat), lng: Number(pin.lng) },
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] canvass-pins POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * PATCH /api/canvass-pins — Update an existing canvass pin
 */
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updatePinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id, ...updates } = parsed.data;

    // Verify ownership
    const existing = await prisma.canvass_pins.findFirst({
      where: { id, orgId: ctx.orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    const pin = await prisma.canvass_pins.update({
      where: { id },
      data: {
        ...updates,
        followUpDate: updates.followUpDate ? new Date(updates.followUpDate) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: { ...pin, lat: Number(pin.lat), lng: Number(pin.lng) },
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] canvass-pins PATCH error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/canvass-pins — Delete a canvass pin
 */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing pin id" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.canvass_pins.findFirst({
      where: { id, orgId: ctx.orgId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    await prisma.canvass_pins.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] canvass-pins DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
