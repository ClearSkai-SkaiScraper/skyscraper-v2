export const dynamic = "force-dynamic";
/**
 * POST /api/materials/estimate
 *
 * Calculate material requirements from roof measurements.
 * Optionally route to ABC Supply for inventory check and ordering.
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthContext } from "@/lib/auth/getAuthContext";
import { logger } from "@/lib/logger";
import {
  calculateMaterials,
  createOrderDraft,
  enrichEstimateWithSKUs,
  estimateFromClaimData,
  routeToABCSupply,
  submitOrder,
  type ClaimRoofData,
  type RoofMeasurements,
  type ShingleSpec,
} from "@/lib/materials/estimator";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// POST - Calculate estimate or submit order
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthContext();
    if (!session?.userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ── Action: Calculate from measurements ──────────────────────────────────
    if (action === "calculate") {
      const { measurements, shingleSpec } = body as {
        measurements: RoofMeasurements;
        shingleSpec: ShingleSpec;
      };

      if (!measurements?.totalArea) {
        return NextResponse.json(
          { ok: false, error: "Missing totalArea in measurements" },
          { status: 400 }
        );
      }

      const estimate = calculateMaterials(measurements, shingleSpec || { type: "ARCHITECTURAL" });

      return NextResponse.json({ ok: true, estimate });
    }

    // ── Action: Quick estimate from claim data ───────────────────────────────
    if (action === "quick-estimate") {
      const { claimData } = body as { claimData: ClaimRoofData };

      const estimate = estimateFromClaimData(claimData || {});

      return NextResponse.json({ ok: true, estimate });
    }

    // ── Action: Route to ABC Supply ──────────────────────────────────────────
    if (action === "route") {
      const { estimate, jobSiteZip } = body;

      if (!estimate || !jobSiteZip) {
        return NextResponse.json(
          { ok: false, error: "Missing estimate or jobSiteZip" },
          { status: 400 }
        );
      }

      const orgId = session.orgId;
      if (!orgId) {
        return NextResponse.json(
          { ok: false, error: "No organization linked to account" },
          { status: 400 }
        );
      }

      // Enrich with SKUs first
      const enrichedEstimate = await enrichEstimateWithSKUs(estimate, orgId);

      // Route to nearest branch
      const routingResult = await routeToABCSupply(enrichedEstimate, jobSiteZip, orgId);

      return NextResponse.json({ ok: true, routing: routingResult });
    }

    // ── Action: Create order draft ───────────────────────────────────────────
    if (action === "draft-order") {
      const { routingResult, deliveryMethod, deliveryAddress, requestedDate } = body;

      if (!routingResult) {
        return NextResponse.json({ ok: false, error: "Missing routingResult" }, { status: 400 });
      }

      const draft = createOrderDraft(
        routingResult,
        deliveryMethod || "pickup",
        deliveryAddress,
        requestedDate
      );

      if (!draft) {
        return NextResponse.json(
          {
            ok: false,
            error: routingResult.orderReady
              ? "No products with SKUs to order"
              : "Some items are unavailable",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true, draft });
    }

    // ── Action: Submit order ─────────────────────────────────────────────────
    if (action === "submit-order") {
      const { draft, poNumber, notes } = body;

      if (!draft) {
        return NextResponse.json({ ok: false, error: "Missing order draft" }, { status: 400 });
      }

      const orgId = session.orgId;
      if (!orgId) {
        return NextResponse.json(
          { ok: false, error: "No organization linked to account" },
          { status: 400 }
        );
      }

      const order = await submitOrder(draft, orgId, poNumber, notes);

      return NextResponse.json({ ok: true, order });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    logger.error("[MATERIALS] Error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - Retrieve estimate by ID (from session storage / cache)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getAuthContext();
  if (!session?.userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const estimateId = req.nextUrl.searchParams.get("id");

  if (!estimateId) {
    // Return empty - estimates are client-side cached
    return NextResponse.json({
      ok: true,
      message: "Estimates are generated client-side. Use POST to calculate.",
    });
  }

  // In production, you'd fetch from database/cache
  return NextResponse.json({
    ok: false,
    error: "Estimate persistence not yet implemented",
  });
}
