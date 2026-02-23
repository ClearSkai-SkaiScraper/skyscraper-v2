/**
 * ============================================================================
 * CLAIM TRADES API
 * ============================================================================
 *
 * GET    /api/claims/[claimId]/trades  — List trade assignments for a claim
 * POST   /api/claims/[claimId]/trades  — Assign a trade to this claim
 * DELETE /api/claims/[claimId]/trades  — Remove a trade assignment
 *
 * Uses raw SQL against the claim_trade_assignments table.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

interface TradeRow {
  id: string;
  claim_id: string;
  org_id: string;
  trade_name: string;
  trade_type: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  estimated_cost: number | null;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/claims/[claimId]/trades
 * List all trade assignments for a claim
 */
export const GET = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      let trades: TradeRow[] = [];
      try {
        trades = await prisma.$queryRaw<TradeRow[]>`
          SELECT * FROM claim_trade_assignments
          WHERE claim_id = ${claimId}
          ORDER BY created_at DESC
        `;
      } catch (dbErr: any) {
        // Table may not exist yet — return empty
        if (dbErr?.code === "42P01" || dbErr?.message?.includes("does not exist")) {
          logger.warn("[Trades GET] claim_trade_assignments table not found, returning empty");
          trades = [];
        } else {
          throw dbErr;
        }
      }

      return NextResponse.json({
        success: true,
        trades: trades.map((t) => ({
          id: t.id,
          tradeName: t.trade_name,
          tradeType: t.trade_type,
          contactName: t.contact_name || "",
          phone: t.phone || "",
          email: t.email || "",
          estimatedCost: t.estimated_cost,
          status: t.status,
          createdAt: t.created_at,
        })),
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Trades GET] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to fetch trades" },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/claims/[claimId]/trades
 * Assign a new trade to this claim
 */
export const POST = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      const body = await req.json();
      const { tradeName, tradeType, contactName, phone, email, estimatedCost } = body;

      if (!tradeName?.trim()) {
        return NextResponse.json({ error: "Trade name is required" }, { status: 400 });
      }

      const costValue = estimatedCost ? Math.round(Number(estimatedCost)) : null;

      await prisma.$executeRaw`
        INSERT INTO claim_trade_assignments (claim_id, org_id, trade_name, trade_type, contact_name, phone, email, estimated_cost)
        VALUES (${claimId}, ${orgId}, ${tradeName}, ${tradeType || "Other"}, ${contactName || null}, ${phone || null}, ${email || null}, ${costValue})
      `;

      return NextResponse.json({ success: true, message: "Trade assigned" }, { status: 201 });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Trades POST] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to add trade" },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/claims/[claimId]/trades
 * Remove a trade assignment. Body: { tradeId }
 */
export const DELETE = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      const body = await req.json();
      const { tradeId } = body;

      if (!tradeId) {
        return NextResponse.json({ error: "tradeId is required" }, { status: 400 });
      }

      await prisma.$executeRaw`
        DELETE FROM claim_trade_assignments
        WHERE id = ${tradeId}::uuid AND claim_id = ${claimId}
      `;

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Trades DELETE] Error:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to delete trade" },
        { status: 500 }
      );
    }
  }
);
