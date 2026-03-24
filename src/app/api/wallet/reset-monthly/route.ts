export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/cron/verifyCronSecret";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * POST /api/wallet/reset-monthly
 * CRON-01: Monthly wallet token reset
 * Called by Vercel Cron on the 1st of each month
 *
 * NOTE: The token_ledger model has been deprecated.
 * The AI token system (src/modules/ai/core/tokens.ts) is currently stubbed.
 * This endpoint remains as a safe no-op to prevent Vercel cron 404 errors.
 * When the token system is re-enabled, wire this to the new usage model.
 */
// S1-07: Vercel crons send GET requests — support both GET and POST
export async function GET(req: Request) {
  return handleReset(req);
}

export async function POST(req: Request) {
  return handleReset(req);
}

async function handleReset(req: Request) {
  try {
    // 🔒 SECURITY FIX: Use verifyCronSecret (fail-closed when CRON_SECRET is unset)
    const authError = verifyCronSecret(req);
    if (authError) return authError;

    logger.info("[WALLET_RESET] Monthly token reset cron fired (token system currently disabled)");

    // Count active orgs for observability
    const activeOrgCount = await prisma.org.count({
      where: {
        subscriptionStatus: { in: ["active", "trialing"] },
      },
    });

    logger.info("[WALLET_RESET] Monthly reset complete (no-op — token ledger deprecated)", {
      activeOrgs: activeOrgCount,
    });

    return NextResponse.json({
      success: true,
      activeOrgs: activeOrgCount,
      note: "Token ledger deprecated — no-op reset",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[WALLET_RESET] Monthly reset failed:", error);
    return NextResponse.json({ error: "Monthly wallet reset failed" }, { status: 500 });
  }
}
