/**
 * ============================================================================
 * CLAIM TRADES API
 * ============================================================================
 *
 * GET    /api/claims/[claimId]/trades  — List trade assignments for a claim
 * POST   /api/claims/[claimId]/trades  — Assign a trade to this claim
 * DELETE /api/claims/[claimId]/trades  — Remove a trade assignment
 *
 * Uses Prisma model claim_trade_assignments.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const createTradeSchema = z.object({
  tradeName: z.string().min(1, "Trade name is required").max(200),
  tradeType: z.string().max(100).optional().default("Other"),
  contactName: z.string().max(200).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  estimatedCost: z.union([z.number(), z.string()]).optional(),
});

const deleteTradeSchema = z.object({
  tradeId: z.string().min(1, "tradeId is required"),
});

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

      const trades = await prisma.claim_trade_assignments.findMany({
        where: { claim_id: claimId, org_id: orgId },
        orderBy: { created_at: "desc" },
      });

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
      return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 });
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

      const raw = await req.json();
      const parsed = createTradeSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const { tradeName, tradeType, contactName, phone, email, estimatedCost } = parsed.data;

      const costValue = estimatedCost ? Math.round(Number(estimatedCost)) : null;

      const trade = await prisma.claim_trade_assignments.create({
        data: {
          claim_id: claimId,
          org_id: orgId,
          trade_name: tradeName.trim(),
          trade_type: tradeType || "Other",
          contact_name: contactName || null,
          phone: phone || null,
          email: email || null,
          estimated_cost: costValue,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Trade assigned",
          trade: {
            id: trade.id,
            tradeName: trade.trade_name,
            tradeType: trade.trade_type,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Trades POST] Error:", error);
      return NextResponse.json({ error: "Failed to add trade" }, { status: 500 });
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

      const raw = await req.json();
      const parsed = deleteTradeSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const { tradeId } = parsed.data;

      await prisma.claim_trade_assignments.deleteMany({
        where: { id: tradeId, claim_id: claimId, org_id: orgId },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Trades DELETE] Error:", error);
      return NextResponse.json({ error: "Failed to delete trade" }, { status: 500 });
    }
  }
);
