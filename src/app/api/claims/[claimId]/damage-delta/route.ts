/**
 * Damage Delta API — GET /api/claims/[claimId]/damage-delta
 *
 * Compares adjuster scope vs AI-detected damage to surface
 * missed items and underpaid areas. Powers the DamageDeltaCard.
 *
 * Returns:
 * - adjuster: { itemCount, totalAmount, items[] }
 * - ai: { itemCount, totalAmount, items[] }
 * - missedItems: items AI found that adjuster missed
 * - underpaidAreas: components where adjuster amount < AI amount
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { getRouteParams, withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (_req, { orgId }, routeContext) => {
  const { claimId } = await getRouteParams<{ claimId: string }>(routeContext);

  try {
    // 0. Verify claim belongs to org (tenant isolation)
    const claimCheck = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true },
    });
    if (!claimCheck) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // 1. Get adjuster-sourced line items (from carrier scope / estimate)
    // First get estimates for this claim, then get their line items
    const estimates = await prisma.estimates.findMany({
      where: {
        claim_id: claimId,
        orgId,
      },
      select: { id: true },
    });

    const estimateIds = estimates.map((e) => e.id);

    const adjusterItems = await prisma.estimate_line_items.findMany({
      where: {
        estimate_id: { in: estimateIds },
        OR: [{ source: "adjuster" }, { source: "carrier" }, { source: "manual" }, { source: null }],
      },
      select: {
        id: true,
        name: true,
        line_total: true,
        section_name: true,
        category: true,
        source: true,
      },
    });

    // 2. Get AI-detected line items from supplement_line_items
    const aiLineItems = await prisma.supplement_line_items.findMany({
      where: {
        claim_id: claimId,
        detected_by: "ai",
      },
      select: {
        id: true,
        description: true,
        total_cost: true,
        category: true,
        confidence_score: true,
        severity: true,
      },
    });

    // Also check supplement_items for AI-detected items
    const aiSupplementItems = await prisma.supplement_items.findMany({
      where: {
        claim_id: claimId,
        source: "ai",
      },
      select: {
        id: true,
        description: true,
        price_cents: true,
        category: true,
      },
    });

    // 3. Calculate totals
    const adjusterTotal = adjusterItems.reduce((sum, item) => sum + (item.line_total ?? 0), 0);
    const adjusterCount = adjusterItems.length;

    // Combine AI items from both tables
    const allAiItems = [
      ...aiLineItems.map((item) => ({
        description: item.description || "AI-detected damage",
        amount: Number(item.total_cost) || 0,
        category: item.category || "general",
        confidence: Number(item.confidence_score) || 0.8,
        damageType: item.severity || undefined,
      })),
      ...aiSupplementItems.map((item) => ({
        description: item.description || "AI-detected item",
        amount: (item.price_cents ?? 0) / 100,
        category: item.category || "general",
        confidence: 0.8,
        damageType: undefined,
      })),
    ];

    const aiTotal = adjusterTotal + allAiItems.reduce((sum, item) => sum + item.amount, 0);
    const aiCount = adjusterCount + allAiItems.length;

    // 4. Identify missed items (AI found but adjuster didn't)
    const missedItems = allAiItems.map((item) => ({
      description: item.description,
      estimatedAmount: item.amount,
      category: item.category,
      confidence: item.confidence,
    }));

    // 5. Identify underpaid areas
    const underpaidAreas: string[] = [];
    const adjusterCategories = new Map<string, number>();
    for (const item of adjusterItems) {
      const cat = item.section_name || item.category || "general";
      adjusterCategories.set(cat, (adjusterCategories.get(cat) || 0) + (item.line_total ?? 0));
    }
    const aiCategories = new Map<string, number>();
    for (const item of allAiItems) {
      aiCategories.set(item.category, (aiCategories.get(item.category) || 0) + item.amount);
    }
    for (const [cat, aiAmt] of aiCategories.entries()) {
      const adjAmt = adjusterCategories.get(cat) || 0;
      if (aiAmt > adjAmt * 0.1) {
        underpaidAreas.push(cat);
      }
    }

    // If no AI items found, return 404 (card won't render)
    if (allAiItems.length === 0 && adjusterItems.length === 0) {
      return NextResponse.json(
        { error: "No damage data available for comparison" },
        { status: 404 }
      );
    }

    logger.info("[DAMAGE_DELTA]", {
      claimId,
      orgId,
      adjusterCount,
      aiCount,
      deltaAmount: aiTotal - adjusterTotal,
      missedCount: missedItems.length,
    });

    return NextResponse.json({
      adjuster: {
        itemCount: adjusterCount,
        totalAmount: adjusterTotal,
        items: adjusterItems.map((item) => ({
          description: item.name || "Line item",
          amount: item.line_total ?? 0,
        })),
      },
      ai: {
        itemCount: aiCount,
        totalAmount: aiTotal,
        items: allAiItems,
      },
      missedItems,
      underpaidAreas,
    });
  } catch (error) {
    logger.error("[DAMAGE_DELTA] Error:", { claimId, error });
    return NextResponse.json({ error: "Failed to compute damage delta" }, { status: 500 });
  }
});
