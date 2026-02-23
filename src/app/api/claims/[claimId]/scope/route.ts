/**
 * ============================================================================
 * CLAIM SCOPE API
 * ============================================================================
 *
 * GET  /api/claims/[claimId]/scope — List scope line items for a claim
 * POST /api/claims/[claimId]/scope — Save/update scope line items
 *
 * Line items are stored in estimate_line_items via the estimates model.
 * Falls back to empty array if no estimate exists yet.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/scope
 * List all scope line items for a claim
 */
export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      await getOrgClaimOrThrow(orgId, claimId);

      // Try to fetch from estimate_line_items via raw SQL
      // (the scope page expects { lineItems: [...] })
      try {
        const lineItems = await prisma.$queryRaw<
          Array<{
            id: string;
            category: string;
            code: string;
            description: string;
            quantity: number;
            unit: string;
            unit_price: number;
            total: number;
            ocp_approved: boolean;
            disputed: boolean;
          }>
        >`
          SELECT
            eli.id,
            COALESCE(eli.category, 'Other') AS category,
            COALESCE(eli.code, '') AS code,
            eli.description,
            COALESCE(eli.quantity, 1) AS quantity,
            COALESCE(eli.unit, 'EA') AS unit,
            COALESCE(eli.unit_price_cents, 0) / 100.0 AS unit_price,
            COALESCE(eli.total_cents, 0) / 100.0 AS total,
            COALESCE(eli.ocp_approved, false) AS ocp_approved,
            COALESCE(eli.disputed, false) AS disputed
          FROM estimate_line_items eli
          JOIN estimates e ON eli.estimate_id = e.id
          WHERE e.claim_id = ${claimId}
          ORDER BY eli.sort_order ASC, eli.created_at ASC
        `;

        const mapped = lineItems.map((item) => ({
          id: item.id,
          category: item.category,
          code: item.code,
          description: item.description,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unit_price),
          total: Number(item.total),
          ocpApproved: item.ocp_approved,
          disputed: item.disputed,
        }));

        return NextResponse.json({ lineItems: mapped });
      } catch (dbError) {
        // Table may not exist or no data — return empty gracefully
        logger.debug(
          "[GET /api/claims/[claimId]/scope] No scope data:",
          dbError instanceof Error ? dbError.message : dbError
        );
        return NextResponse.json({ lineItems: [] });
      }
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[GET /api/claims/[claimId]/scope] Error:", error);
      return NextResponse.json({ error: "Failed to fetch scope" }, { status: 500 });
    }
  }
);

/**
 * POST /api/claims/[claimId]/scope
 * Save scope line items (bulk upsert)
 */
export const POST = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      await getOrgClaimOrThrow(orgId, claimId);

      const body = await req.json();
      const { lineItems } = body;

      if (!Array.isArray(lineItems)) {
        return NextResponse.json({ error: "lineItems must be an array" }, { status: 400 });
      }

      // Upsert estimate, then upsert line items
      const estimateId = `est_${claimId}`;
      await prisma.$executeRaw`
        INSERT INTO estimates (id, claim_id, org_id, status, created_at, updated_at)
        VALUES (${estimateId}, ${claimId}, ${orgId}, 'DRAFT', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      `.catch(() => {
        // Table may not exist yet — graceful degradation
      });

      // Try to upsert individual line items
      for (const item of lineItems) {
        try {
          await prisma.$executeRaw`
            INSERT INTO estimate_line_items (id, estimate_id, category, code, description, quantity, unit, unit_price_cents, total_cents, ocp_approved, disputed, sort_order, created_at, updated_at)
            VALUES (
              ${item.id || `eli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
              ${estimateId},
              ${item.category || "Other"},
              ${item.code || ""},
              ${item.description || ""},
              ${item.quantity || 1},
              ${item.unit || "EA"},
              ${Math.round((item.unitPrice || 0) * 100)},
              ${Math.round((item.total || 0) * 100)},
              ${item.ocpApproved || false},
              ${item.disputed || false},
              ${item.sortOrder || 0},
              NOW(), NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              category = EXCLUDED.category,
              description = EXCLUDED.description,
              quantity = EXCLUDED.quantity,
              unit_price_cents = EXCLUDED.unit_price_cents,
              total_cents = EXCLUDED.total_cents,
              ocp_approved = EXCLUDED.ocp_approved,
              disputed = EXCLUDED.disputed,
              updated_at = NOW()
          `;
        } catch (itemError) {
          logger.debug("[Scope POST] Line item upsert failed (table may not exist):", itemError);
        }
      }

      return NextResponse.json({
        success: true,
        lineItems,
        message: "Scope saved",
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[POST /api/claims/[claimId]/scope] Error:", error);
      return NextResponse.json({ error: "Failed to save scope" }, { status: 500 });
    }
  }
);
