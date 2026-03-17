/**
 * POST /api/integrations/quickbooks/connect
 * Start OAuth flow — returns authorization URL for QuickBooks
 *
 * This is the clean entry point for connecting QuickBooks.
 * The callback route handles the OAuth response.
 */

import { NextResponse } from "next/server";

import { getAuthorizationUrl } from "@/lib/integrations/quickbooks";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already connected
    const existing = await prisma.quickbooks_connections.findUnique({
      where: { org_id: ctx.orgId },
      select: { is_active: true, company_name: true },
    });

    if (existing?.is_active) {
      return NextResponse.json(
        {
          error: "Already connected",
          companyName: existing.company_name,
          message: "Disconnect first to reconnect",
        },
        { status: 400 }
      );
    }

    // Generate OAuth URL with orgId as state parameter
    const authUrl = getAuthorizationUrl(ctx.orgId);

    logger.info(`[QB] OAuth flow started for org ${ctx.orgId}`);

    return NextResponse.json({
      success: true,
      authUrl,
      message: "Redirect user to authUrl to complete QuickBooks connection",
    });
  } catch (err) {
    logger.error("[QB] Connect error:", err);
    return NextResponse.json({ error: "Failed to start QuickBooks connection" }, { status: 500 });
  }
}
