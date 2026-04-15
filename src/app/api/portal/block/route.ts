export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * POST /api/portal/block
 * Client blocks a pro — prevents the pro from appearing in search and disables messaging.
 *
 * Body: { contractorId, reason? }
 */
export async function POST(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contractorId, proId, reason } = body;
    const targetId = contractorId || proId;

    if (!targetId) {
      return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
    }

    const clientId = orgCtx.userId || "";

    // Check for existing connection
    const existing = await prisma.clientProConnection.findFirst({
      where: { clientId, contractorId: targetId },
    });

    if (existing) {
      await prisma.clientProConnection.update({
        where: { id: existing.id },
        data: { status: "blocked" },
      });
    } else {
      // Create a blocked connection record even if none existed
      await prisma.clientProConnection.create({
        data: {
          id: createId(),
          clientId,
          contractorId: targetId,
          status: "blocked",
          notes: reason || "Blocked by client",
        },
      });
    }

    logger.info("[PORTAL_BLOCK] Client blocked pro", {
      clientId,
      contractorId: targetId,
      reason: reason || "No reason given",
    });

    return NextResponse.json({ ok: true, blocked: true });
  } catch (error) {
    logger.error("[PORTAL_BLOCK] Error", error);
    return NextResponse.json({ error: "Failed to block" }, { status: 500 });
  }
}

/**
 * DELETE /api/portal/block
 * Client unblocks a pro.
 *
 * Body: { contractorId } or query param ?contractorId=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Support both query params and body
    const { searchParams } = new URL(req.url);
    let contractorId = searchParams.get("contractorId");

    if (!contractorId) {
      try {
        const body = await req.json();
        contractorId = body.contractorId || body.proId;
      } catch {
        // no body
      }
    }

    if (!contractorId) {
      return NextResponse.json({ error: "contractorId is required" }, { status: 400 });
    }

    const existing = await prisma.clientProConnection.findFirst({
      where: {
        clientId: orgCtx.userId || "",
        contractorId,
        status: "blocked",
      },
    });

    if (existing) {
      await prisma.clientProConnection.delete({
        where: { id: existing.id },
      });
    }

    logger.info("[PORTAL_UNBLOCK] Client unblocked pro", {
      clientId: orgCtx.userId,
      contractorId,
    });

    return NextResponse.json({ ok: true, blocked: false });
  } catch (error) {
    logger.error("[PORTAL_UNBLOCK] Error", error);
    return NextResponse.json({ error: "Failed to unblock" }, { status: 500 });
  }
}
