import { NextResponse } from "next/server";

import {
  exchangeCodeForTokens,
  getAuthorizationUrl,
  saveConnection,
} from "@/lib/integrations/quickbooks";
import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/quickbooks/callback
 * Handles OAuth callback from QuickBooks
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const realmId = url.searchParams.get("realmId");
    const state = url.searchParams.get("state"); // orgId encoded as state
    const error = url.searchParams.get("error");

    if (error) {
      logger.error("[QB] OAuth error:", error);
      return NextResponse.redirect(
        new URL("/settings/integrations?qb=error&reason=" + error, req.url)
      );
    }

    if (!code || !realmId || !state) {
      return NextResponse.redirect(
        new URL("/settings/integrations?qb=error&reason=missing_params", req.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Save connection
    await saveConnection(
      state, // orgId
      realmId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn
    );

    return NextResponse.redirect(new URL("/settings/integrations?qb=success", req.url));
  } catch (err) {
    logger.error("[QB] Callback error:", err);
    return NextResponse.redirect(
      new URL("/settings/integrations?qb=error&reason=exchange_failed", req.url)
    );
  }
}

/**
 * POST /api/integrations/quickbooks/callback
 * Generate auth URL to start OAuth flow
 */
export async function POST() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const authUrl = getAuthorizationUrl(ctx.orgId);
    return NextResponse.json({ success: true, authUrl });
  } catch (err) {
    logger.error("[QB] Auth URL error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
