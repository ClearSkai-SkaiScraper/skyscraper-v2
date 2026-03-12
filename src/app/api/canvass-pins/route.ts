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
  outcome: z
    .enum(["no_answer", "interested", "signed", "come_back", "not_interested", "not_home"])
    .default("no_answer"),
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

    // Auto-create appointment when follow-up date is set
    if (parsed.data.followUpDate) {
      try {
        const followUp = new Date(parsed.data.followUpDate);
        const endTime = new Date(followUp.getTime() + 60 * 60 * 1000); // 1 hour
        await prisma.appointments.create({
          data: {
            title: `Door Knock Follow-Up: ${parsed.data.address || parsed.data.ownerName || "Pin"}`,
            description: `Follow-up from door knocking${parsed.data.notes ? ` — ${parsed.data.notes}` : ""}`,
            startTime: followUp,
            endTime,
            location:
              [parsed.data.address, parsed.data.city, parsed.data.state, parsed.data.zipCode]
                .filter(Boolean)
                .join(", ") || null,
            orgId: ctx.orgId,
            assignedTo: ctx.userId || null,
            status: "scheduled",
            notes: parsed.data.notes || null,
          },
        });
        logger.info("[CANVASS_PIN] Auto-created follow-up appointment", {
          pinId: pin.id,
          date: parsed.data.followUpDate,
        });
      } catch (apptErr) {
        logger.error("[CANVASS_PIN] Failed to create follow-up appointment:", apptErr);
        // Non-critical — pin was saved successfully
      }
    }

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

    // Atomic find+update in transaction to prevent TOCTOU race
    const pin = await prisma.$transaction(async (tx) => {
      const check = await tx.canvass_pins.findFirst({ where: { id, orgId: ctx.orgId } });
      if (!check) return null;
      return tx.canvass_pins.update({
        where: { id },
        data: {
          ...updates,
          followUpDate: updates.followUpDate ? new Date(updates.followUpDate) : undefined,
        },
      });
    });
    if (!pin) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    // Auto-create appointment when follow-up date is set or changed
    if (updates.followUpDate) {
      try {
        const followUp = new Date(updates.followUpDate);
        const endTime = new Date(followUp.getTime() + 60 * 60 * 1000);
        const address = pin.address || updates.address || "";
        const ownerName = pin.ownerName || updates.ownerName || "";
        await prisma.appointments.create({
          data: {
            title: `Door Knock Follow-Up: ${address || ownerName || "Pin"}`,
            description: `Follow-up from door knocking${pin.notes ? ` — ${pin.notes}` : ""}`,
            startTime: followUp,
            endTime,
            location:
              [pin.address, pin.city, pin.state, pin.zipCode].filter(Boolean).join(", ") || null,
            orgId: ctx.orgId,
            assignedTo: ctx.userId || null,
            status: "scheduled",
            notes: typeof pin.notes === "string" ? pin.notes : null,
          },
        });
        logger.info("[CANVASS_PIN] Auto-created follow-up appointment on update", {
          pinId: id,
          date: updates.followUpDate,
        });
      } catch (apptErr) {
        logger.error("[CANVASS_PIN] Failed to create follow-up appointment on update:", apptErr);
      }
    }

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

    // Atomic org-scoped delete
    const result = await prisma.canvass_pins.deleteMany({ where: { id, orgId: ctx.orgId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Pin not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    logger.error("[API] canvass-pins DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
