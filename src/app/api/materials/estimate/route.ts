export const dynamic = "force-dynamic";
/**
 * POST /api/materials/estimate
 *
 * Calculate material requirements from roof measurements.
 * Optionally route to ABC Supply for inventory check and ordering.
 */

import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
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

// Use canonical AI client singleton

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
      const {
        trade,
        tradeLabel,
        measurements,
        measurementSummary,
        jobContextType,
        jobContextLabel,
        userNotes,
      } = body as {
        trade: string;
        tradeLabel: string;
        measurements: Record<string, string>;
        measurementSummary: string;
        jobContextType?: string;
        jobContextLabel?: string;
        userNotes?: string;
      };

      if (!trade || !measurementSummary) {
        return NextResponse.json(
          { ok: false, error: "Missing trade or measurements" },
          { status: 400 }
        );
      }

      // Build job-context-aware output instructions
      const contextInstructions: Record<string, string> = {
        claim: `OUTPUT FORMAT: Insurance Claim Estimate
- Include Xactimate line codes where applicable (e.g., RFG LAMI, DRY HNGT)
- Include O&P (Overhead & Profit) at 20% as a separate line item
- Add supplement notes for any items that may be missed in initial adjuster scope
- Include depreciation-eligible vs non-depreciable breakdown
- Use carrier-friendly language and itemization`,
        retail: `OUTPUT FORMAT: Retail / Out-of-Pocket Estimate
- Present Good / Better / Best tiers for key materials where applicable
- Show clear per-unit and total pricing
- Include labor-friendly notes (e.g., "DIY savings" vs "contractor installed")
- Add value-engineering suggestions where possible
- Professional homeowner-facing language`,
        lead: `OUTPUT FORMAT: Sales / Lead Estimate
- Present pricing for proposals and bids
- Include competitive pricing notes
- Show estimated project timeline
- Add upsell opportunities (upgrades, add-ons)
- Professional sales-ready language`,
        repair: `OUTPUT FORMAT: Repair / Service Estimate  
- Include diagnostic assessment items
- Break down parts vs labor materials
- Add minimum service/trip charge note
- Include warranty replacement vs standard pricing where applicable
- Concise service-oriented language`,
      };

      const outputFormat =
        contextInstructions[jobContextType || "claim"] || contextInstructions.claim;

      try {
        const openai = getOpenAI();

        const systemPrompt = `You are SkaiScraper's Universal Trade-Modular AI Estimating Assistant — a senior construction estimator with 25+ years experience across all residential and commercial trades.

CORE CAPABILITIES:
- Generate detailed, trade-specific material lists with accurate quantities and realistic 2024 retail pricing
- Support 30+ trades: Roofing, Siding, Gutters, Windows, Doors, Flooring, Painting, Electrical, Plumbing, HVAC, Drywall, Insulation, Fencing, Decking, Concrete, Tile, Countertops, Framing, Finish Carpentry, Cabinets, Demolition, Mitigation, Masonry, Solar, Landscaping, Garage Doors, Appliances, Fire Sprinkler, Low Voltage, and more
- Adapt output based on job context (Insurance Claim, Retail, Lead, Repair)

ESTIMATION RULES:
1. Include ALL materials needed — main products PLUS fasteners, adhesives, underlayments, transition pieces, trim, accessories, cleanup supplies
2. Use realistic 2024 Home Depot / Lowe's / local supplier retail pricing
3. Add appropriate waste factor to quantities (varies by trade: 10% standard, 15% for tile/stone, 5% for electrical)
4. Round quantities UP to nearest purchasable unit (can't buy 0.3 of a box)
5. Include at least 8-20 line items for a thorough professional estimate
6. Group items by category for clear organization

TRADE-SPECIFIC BRAND RULES:
- PAINTING: Always use Sherwin-Williams products exclusively. Reference real SW product lines:
  • Interior: SW Duration Home, SW Emerald, SW SuperPaint, SW ProClassic (trim/cabinets), SW Harmony (low-VOC)
  • Exterior: SW Duration Exterior, SW Emerald Exterior, SW SuperPaint Exterior, SW Resilience
  • Primers: SW PrimeRx Peel Bonding, SW PrepRite ProBlock, SW Extreme Bond Primer
  • Stains: SW WoodScapes, SW DeckScapes
  • Include SW-specific sundries: Purdy brushes, Wooster roller covers, SW painter's tape
  • Price at current Sherwin-Williams contractor/retail pricing (not big-box store pricing)

${outputFormat}

CURRENT TRADE: ${tradeLabel}
JOB CONTEXT: ${jobContextLabel || "General Estimate"}

Return ONLY a valid JSON array with NO markdown formatting, NO code fences, NO explanatory text.

Each item in the array must have these exact fields:
- "category": string (material category group, e.g., "Main Materials", "Fasteners & Hardware", "Adhesives & Sealants", "Trim & Accessories", "Safety & Cleanup")
- "productName": string (specific product name with brand where relevant)
- "quantity": number (quantity needed, rounded up to purchasable unit)
- "unit": string (unit of measure: "ea", "sq ft", "lin ft", "gal", "box", "roll", "bundle", "bag", "tube", "pair", etc.)
- "unitPrice": number (estimated retail unit price in USD, 2 decimal places)
- "totalPrice": number (quantity × unitPrice, 2 decimal places)
- "coverage": string (optional coverage/sizing note, e.g., "Covers 100 sq ft/bundle" or "3.5\" x 80\"")`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate a complete material list for this ${tradeLabel} project:\n\n${measurementSummary}\n\nJob Context: ${jobContextLabel || "General Estimate"}${userNotes ? `\n\nADDITIONAL NOTES FROM USER (important — follow these instructions):\n${userNotes}` : ""}\n\nReturn ONLY the JSON array.`,
            },
          ],
          max_tokens: 3000,
          temperature: 0.2,
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

        // ── Generate AI Summary (parallel-safe, non-blocking) ──
        let aiSummary = "";
        try {
          const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a senior construction estimator writing a brief professional summary for a material estimate report. Be concise, helpful, and specific. Write in 3-5 short paragraphs. Include:
1. Project overview and scope summary
2. Key material selections and why they were chosen
3. Cost breakdown highlights (largest cost drivers)
4. Pro tips, potential savings, or watch-outs for this specific trade
5. If this is an insurance claim: mention documentation tips. If retail: mention upgrade options. If lead: mention competitive positioning.

Job Context: ${jobContextLabel || "General Estimate"}
Trade: ${tradeLabel}`,
              },
              {
                role: "user",
                content: `Summarize this ${tradeLabel} estimate:\n\nMeasurements: ${measurementSummary}\nTotal Cost: $${totalCost.toFixed(2)}\nItems: ${materials.length}\n\nMaterials:\n${materials
                  .map(
                    (m: {
                      productName: string;
                      quantity: number;
                      unit: string;
                      totalPrice: number;
                    }) => `- ${m.productName}: ${m.quantity} ${m.unit} ($${m.totalPrice})`
                  )
                  .join("\n")}`,
              },
            ],
            max_tokens: 800,
            temperature: 0.3,
          });
          aiSummary = summaryResponse.choices[0]?.message?.content || "";
        } catch (summaryErr) {
          logger.warn("[MATERIALS] AI summary generation failed (non-critical):", summaryErr);
        }

        const estimate = {
          id: `ai-${Date.now()}`,
          materials,
          totalCost: Math.round(totalCost * 100) / 100,
          wasteFactor: 1.1,
          measurements: {
            totalArea: Number(
              measurements.area ||
                measurements.sqft ||
                measurements.linearFt ||
                measurements.drops ||
                measurements.heads ||
                measurements.count ||
                0
            ),
            pitch: "N/A",
          },
          trade,
          tradeLabel,
          method: "AI-Powered Estimate (GPT-4o)",
          jobContextType: jobContextType || "claim",
          aiSummary,
        };

        logger.info(
          `[MATERIALS] AI estimate for ${trade} (${jobContextType}): ${materials.length} items, $${totalCost.toFixed(2)}`
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

    // ── Action: AI Chat — conversational assistant for estimates ──────────
    if (action === "ai-chat") {
      const {
        trade,
        tradeLabel,
        jobContextType: ctxType,
        jobContextLabel: ctxLabel,
        userMessage,
        chatHistory,
      } = body as {
        trade: string;
        tradeLabel: string;
        jobContextType?: string;
        jobContextLabel?: string;
        userMessage: string;
        chatHistory?: Array<{ role: string; text: string }>;
      };

      if (!userMessage) {
        return NextResponse.json({ ok: false, error: "Missing message" }, { status: 400 });
      }

      try {
        const openai = getOpenAI();

        // Build conversation history
        const history = (chatHistory || []).map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.text,
        }));

        const chatResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are SkaiScraper's AI estimating assistant helping a contractor prepare a material estimate. You are chatting with the user BEFORE they generate the estimate.

Current context:
- Trade: ${tradeLabel || trade}
- Job Context: ${ctxLabel || ctxType || "General"}

Your role:
1. Answer questions about materials, brands, quantities, best practices
2. Help them decide what to include or exclude
3. Suggest upgrades, alternatives, or code requirements
4. Note any special instructions they give — these will be passed to the estimate generator
5. Be concise (2-4 sentences max), friendly, and professional
6. If they mention specific brands, materials, or preferences, acknowledge them and confirm they'll be included

Do NOT generate material lists or prices — that happens when they click "Calculate Materials". Just advise and note their preferences.`,
            },
            ...history,
            { role: "user", content: userMessage },
          ],
          max_tokens: 300,
          temperature: 0.4,
        });

        const reply =
          chatResponse.choices[0]?.message?.content ||
          "I'm here to help — could you rephrase that?";

        return NextResponse.json({ ok: true, reply });
      } catch (chatErr) {
        logger.error("[MATERIALS] AI chat error:", chatErr);
        return NextResponse.json({ ok: false, error: "AI chat failed" }, { status: 500 });
      }
    }

    // ── Action: Parse insurance scope of work document ────────────────────────
    if (action === "parse-scope") {
      const { scopeText } = body as { scopeText: string };

      if (!scopeText || scopeText.trim().length < 20) {
        return NextResponse.json(
          { ok: false, error: "Scope document text is too short or missing" },
          { status: 400 }
        );
      }

      try {
        const openai = getOpenAI();

        const parseResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a construction insurance scope parser. Extract structured data from an insurance-approved scope of work document.

Parse the document and return a JSON object with:
{
  "trade": string (best matching trade from: roofing, siding, gutters, windows, doors, flooring, painting, electrical, plumbing, hvac, drywall, insulation, fencing, decking, concrete, tile, countertops, framing, finish_carpentry, cabinets, demolition, mitigation, masonry, solar, landscaping, garage_doors, appliances, fire_sprinkler, low_voltage),
  "measurements": { key-value pairs of measurements found (e.g., "area": "2400", "linearFt": "120") },
  "lineItems": [
    {
      "description": string,
      "quantity": string,
      "unit": string,
      "xactimateCode": string (if found, e.g., "RFG LAMI"),
      "approvedAmount": number (if found)
    }
  ],
  "carrierName": string (insurance carrier if mentioned),
  "claimNumber": string (if found),
  "totalApproved": number (total approved amount if found),
  "notes": string (any special instructions, code upgrades, or supplements noted)
}

Return ONLY valid JSON. No markdown, no code fences, no explanatory text.`,
            },
            {
              role: "user",
              content: `Parse this insurance scope of work document:\n\n${scopeText.slice(0, 6000)}`,
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        });

        const parsed = parseResponse.choices[0]?.message?.content || "{}";
        const cleaned = parsed
          .replace(/```json?\n?/g, "")
          .replace(/```/g, "")
          .trim();
        const scopeData = JSON.parse(cleaned);

        logger.info(
          `[MATERIALS] Parsed scope of work: trade=${scopeData.trade}, items=${scopeData.lineItems?.length || 0}`
        );

        return NextResponse.json({ ok: true, scopeData });
      } catch (parseErr) {
        logger.error("[MATERIALS] Scope parsing error:", parseErr);
        return NextResponse.json(
          { ok: false, error: "Failed to parse scope document" },
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
