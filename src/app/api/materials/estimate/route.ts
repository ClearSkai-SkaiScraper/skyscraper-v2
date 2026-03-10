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

let _openai: any = null;
async function getOpenAI() {
  if (!_openai) {
    const { default: OpenAI } = await import("openai");
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

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

    // ── Action: AI-powered estimate for non-roofing trades ──────────────────
    if (action === "ai-estimate") {
      const { trade, tradeLabel, measurements, measurementSummary } = body as {
        trade: string;
        tradeLabel: string;
        measurements: Record<string, string>;
        measurementSummary: string;
      };

      if (!trade || !measurementSummary) {
        return NextResponse.json(
          { ok: false, error: "Missing trade or measurements" },
          { status: 400 }
        );
      }

      try {
        const openai = await getOpenAI();

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a senior construction estimator with 20+ years experience. Generate a detailed material list for a ${tradeLabel} project based on measurements. Return ONLY a valid JSON array with NO markdown formatting, NO code fences.

Each item in the array must have these exact fields:
- "category": string (material category)
- "productName": string (specific product name)
- "quantity": number (quantity needed, rounded up)
- "unit": string (unit of measure: "ea", "sq ft", "lin ft", "gal", "box", "roll", "bundle", etc.)
- "unitPrice": number (estimated retail unit price in USD)
- "totalPrice": number (quantity × unitPrice)
- "coverage": string (optional coverage note)

Include ALL materials needed including fasteners, adhesives, underlayments, transition pieces, trim, and accessories. Use realistic 2024 Home Depot / Lowe's retail pricing. Add 10% waste factor to quantities. Include at least 6-15 line items for a thorough estimate.`,
            },
            {
              role: "user",
              content: `Generate a complete material list for this ${tradeLabel} project:\n${measurementSummary}\n\nReturn ONLY the JSON array, no explanation.`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content || "[]";
        // Strip any markdown code fences
        const cleaned = content
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        const materials = JSON.parse(cleaned);

        const totalCost = materials.reduce(
          (sum: number, m: { totalPrice: number }) => sum + (m.totalPrice || 0),
          0
        );

        const estimate = {
          id: `ai-${Date.now()}`,
          materials,
          totalCost: Math.round(totalCost * 100) / 100,
          wasteFactor: 1.1,
          measurements: {
            totalArea: Number(measurements.area || measurements.sqft || measurements.linearFt || 0),
            pitch: "N/A",
          },
          trade,
          tradeLabel,
          method: "AI-Powered Estimate",
        };

        logger.info(
          `[MATERIALS] AI estimate for ${trade}: ${materials.length} items, $${totalCost}`
        );

        return NextResponse.json({ ok: true, estimate });
      } catch (aiErr) {
        logger.error("[MATERIALS] AI estimate error:", aiErr);
        return NextResponse.json(
          { ok: false, error: "AI estimation failed — check OpenAI API key" },
          { status: 500 }
        );
      }
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
