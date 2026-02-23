/**
 * GET  /api/integrations/quickbooks/status  — connection status
 * POST /api/integrations/quickbooks/status  — disconnect
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET — connection status                                            */
/* ------------------------------------------------------------------ */

export async function GET() {
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

    const conn = await prisma.quickbooks_connections.findUnique({
      where: { org_id: user.orgId },
      select: {
        id: true,
        company_name: true,
        is_active: true,
        last_sync_at: true,
        sync_errors: true,
        token_expires: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!conn) {
      return NextResponse.json({
        ok: true,
        connected: false,
        connection: null,
      });
    }

    return NextResponse.json({
      ok: true,
      connected: conn.is_active,
      connection: {
        id: conn.id,
        companyName: conn.company_name,
        isActive: conn.is_active,
        lastSyncAt: conn.last_sync_at,
        syncErrors: conn.sync_errors,
        tokenExpires: conn.token_expires,
        connectedAt: conn.created_at,
        updatedAt: conn.updated_at,
      },
    });
  } catch (error) {
    logger.error("[QB_STATUS_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  POST — disconnect                                                  */
/* ------------------------------------------------------------------ */

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

    const body = await req.json();

    if (body.action === "disconnect") {
      await prisma.quickbooks_connections.update({
        where: { org_id: user.orgId },
        data: { is_active: false },
      });

      return NextResponse.json({ ok: true, message: "QuickBooks disconnected" });
    }

    return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
  } catch (error) {
    logger.error("[QB_DISCONNECT_ERROR]", error);
    return NextResponse.json(
      { ok: false, message: "Failed" },
      { status: 500 }
    );
  }
}
