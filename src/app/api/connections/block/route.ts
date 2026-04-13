/**
 * POST /api/connections/block
 * Block a connection - prevents auto-reconnection and hides from network
 *
 * DELETE /api/connections/block
 * Unblock a connection
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

const BlockSchema = z.object({
  blockedId: z.string().min(1, "Blocked ID required"),
  reason: z.string().optional(),
});

/**
 * POST /api/connections/block - Block a connection
 */
export async function POST(req: Request) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = BlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { blockedId, reason } = parsed.data;

    // Check if block record already exists
    const existing = await prisma.trades_blocks.findFirst({
      where: {
        blockerId: ctx.userId,
        blockedId,
      },
    });

    if (existing) {
      return NextResponse.json({ message: "Already blocked", blocked: existing });
    }

    // Create block record
    const blocked = await prisma.trades_blocks.create({
      data: {
        blockerId: ctx.userId,
        blockedId,
        reason: reason || null,
      },
    });

    logger.info("[CONNECTIONS_BLOCK] Blocked connection", {
      blockerId: ctx.userId,
      blockedId,
    });

    return NextResponse.json({ success: true, blocked });
  } catch (error) {
    logger.error("[CONNECTIONS_BLOCK] Error:", error);
    return NextResponse.json({ error: "Failed to block connection" }, { status: 500 });
  }
}

/**
 * DELETE /api/connections/block - Unblock a connection
 */
export async function DELETE(req: Request) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const blockedId = searchParams.get("blockedId");

    if (!blockedId) {
      return NextResponse.json({ error: "blockedId required" }, { status: 400 });
    }

    // Delete block record
    const deleted = await prisma.trades_blocks.deleteMany({
      where: {
        blockerId: ctx.userId,
        blockedId,
      },
    });

    logger.info("[CONNECTIONS_UNBLOCK] Unblocked connection", {
      blockerId: ctx.userId,
      blockedId,
      deleted: deleted.count,
    });

    return NextResponse.json({ success: true, unblocked: deleted.count > 0 });
  } catch (error) {
    logger.error("[CONNECTIONS_UNBLOCK] Error:", error);
    return NextResponse.json({ error: "Failed to unblock connection" }, { status: 500 });
  }
}

/**
 * GET /api/connections/block - List blocked connections
 */
export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blocked = await prisma.trades_blocks.findMany({
      where: { blockerId: ctx.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ blocked });
  } catch (error) {
    logger.error("[CONNECTIONS_BLOCK_LIST] Error:", error);
    return NextResponse.json({ error: "Failed to list blocked connections" }, { status: 500 });
  }
}
