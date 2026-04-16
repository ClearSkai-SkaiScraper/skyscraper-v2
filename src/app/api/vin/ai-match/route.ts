/**
 * VIN — AI Vendor Matching & Recommendations API
 * POST /api/vin/ai-match — Get AI-powered vendor suggestions
 */

import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import type { AiVendorSuggestion } from "@/lib/vendors/vin-types";

export const dynamic = "force-dynamic";

export const POST = withOrgScope(async (request, { userId, orgId }) => {
  try {
    const body = await request.json();
    const {
      tradeType,
      zip,
      urgency,
      materialCategory,
      budget,
      claimId,
      jobId,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      context: userContext,
    } = body;

    // 1) Find matching vendors
    const vendorWhere: Record<string, unknown> = { isActive: true };
    if (tradeType) {
      vendorWhere.tradeTypes = { has: tradeType };
    }

    const vendors = await prisma.vendor.findMany({
      where: vendorWhere,
      include: {
        VendorLocation: {
          where: { isActive: true },
          select: {
            city: true,
            state: true,
            zip: true,
            deliveryRadiusMi: true,
            deliveryCutoffTime: true,
          },
        },
        vendor_programs: {
          where: { isActive: true },
          select: { programType: true, name: true, amount: true, percentOff: true },
        },
        vendor_products_v2: {
          where: { isActive: true, ...(materialCategory ? { category: materialCategory } : {}) },
          select: {
            name: true,
            priceRangeLow: true,
            priceRangeHigh: true,
            inStock: true,
            leadTimeDays: true,
          },
          take: 5,
        },
      },
      orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
      take: 10,
    });

    // 2) Score vendors
    const scored = vendors.map((v) => {
      let score = 50;

      // Featured / verified bonus
      if (v.isFeatured) score += 15;
      if (v.isVerified) score += 10;

      // Rating bonus
      if (v.rating) score += Number(v.rating) * 5;

      // Location proximity (basic ZIP match)
      if (zip) {
        const matchingLocation = v.VendorLocation.find((loc) => loc.zip === zip);
        if (matchingLocation) score += 20;
        else if (v.VendorLocation.length > 0) score += 5;
      }

      // In-stock products bonus
      const inStockProducts = v.vendor_products_v2.filter((p) => p.inStock);
      score += inStockProducts.length * 3;

      // Programs bonus
      if (v.vendor_programs.length > 0) score += 5;
      const hasRebate = v.vendor_programs.some((p) => p.programType === "rebate");
      if (hasRebate) score += 10;

      // Budget consideration
      if (budget === "economy") {
        const cheapProducts = v.vendor_products_v2.filter(
          (p) => p.priceRangeLow && Number(p.priceRangeLow) < 100
        );
        score += cheapProducts.length * 5;
      }

      // Urgency bonus for fast lead times
      if (urgency === "high") {
        const fastProducts = v.vendor_products_v2.filter(
          (p) => p.leadTimeDays !== null && p.leadTimeDays <= 2
        );
        score += fastProducts.length * 8;
      }

      return { vendor: v, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // 3) Generate AI suggestions
    const suggestions: AiVendorSuggestion[] = [];

    const topVendor = scored[0];
    if (topVendor) {
      suggestions.push({
        type: "vendor",
        title: `Best match: ${topVendor.vendor.name}`,
        description: `Highest scored vendor for ${tradeType || "your needs"} with ${topVendor.vendor.VendorLocation.length} locations nearby. Score: ${topVendor.score}/100.`,
        actionLabel: "View Vendor",
        actionUrl: `/vendors/${topVendor.vendor.slug}`,
        priority: "high",
        metadata: { vendorId: topVendor.vendor.id, score: topVendor.score },
      });
    }

    // Rebate suggestion
    const vendorWithRebate = scored.find((s) =>
      s.vendor.vendor_programs.some((p) => p.programType === "rebate")
    );
    if (vendorWithRebate) {
      const rebate = vendorWithRebate.vendor.vendor_programs.find(
        (p) => p.programType === "rebate"
      );
      suggestions.push({
        type: "material",
        title: `Manufacturer rebate available`,
        description: `${vendorWithRebate.vendor.name} offers "${rebate?.name}" — save ${rebate?.percentOff ? `${Number(rebate.percentOff)}%` : `$${Number(rebate?.amount || 0)}`}.`,
        actionLabel: "View Program",
        actionUrl: `/vendors/${vendorWithRebate.vendor.slug}`,
        priority: "medium",
      });
    }

    // Schedule suggestion after order
    if (claimId || jobId) {
      suggestions.push({
        type: "schedule",
        title: "Schedule build day after delivery?",
        description:
          "Once materials are ordered, we recommend scheduling the build day 2-3 days after the delivery ETA.",
        actionLabel: "Open Calendar",
        actionUrl: "/appointments",
        priority: "medium",
      });

      suggestions.push({
        type: "inspection",
        title: "Add site inspection before delivery?",
        description: "A pre-delivery inspection helps ensure the site is prepared for materials.",
        actionLabel: "Schedule Inspection",
        actionUrl: "/appointments",
        priority: "low",
      });

      suggestions.push({
        type: "notification",
        title: "Notify client of materials ETA?",
        description:
          "Keep the homeowner informed about upcoming material deliveries and build schedule.",
        actionLabel: "Send Notification",
        priority: "medium",
      });
    }

    // Cheapest option
    if (budget === "economy") {
      const cheapest = scored.find((s) =>
        s.vendor.vendor_products_v2.some((p) => p.priceRangeLow && Number(p.priceRangeLow) < 80)
      );
      if (cheapest) {
        suggestions.push({
          type: "material",
          title: `Budget-friendly option: ${cheapest.vendor.name}`,
          description: `Products starting at $${Math.min(...cheapest.vendor.vendor_products_v2.filter((p) => p.priceRangeLow).map((p) => Number(p.priceRangeLow)))} — good for cost-conscious projects.`,
          actionLabel: "Compare Prices",
          actionUrl: `/vendors/${cheapest.vendor.slug}`,
          priority: "medium",
        });
      }
    }

    // Create workflow event for AI suggestion
    await prisma.vendor_workflow_events.create({
      data: {
        orgId,
        eventType: "ai_suggestion",
        entityType: "vendor",
        entityId: topVendor?.vendor.id || "none",
        claimId,
        jobId,
        payload: {
          tradeType,
          zip,
          urgency,
          matchCount: scored.length,
          topScore: topVendor?.score || 0,
          suggestionCount: suggestions.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      matches: scored.slice(0, 5).map((s) => ({
        vendor: {
          id: s.vendor.id,
          slug: s.vendor.slug,
          name: s.vendor.name,
          logo: s.vendor.logo,
          primaryPhone: s.vendor.primaryPhone,
          tradeTypes: s.vendor.tradeTypes,
          vendorTypes: s.vendor.vendorTypes,
          rating: s.vendor.rating ? Number(s.vendor.rating) : null,
          locationCount: s.vendor.VendorLocation.length,
          programCount: s.vendor.vendor_programs.length,
          productsInStock: s.vendor.vendor_products_v2.filter((p) => p.inStock).length,
        },
        score: s.score,
      })),
      suggestions,
    });
  } catch (error) {
    logger.error("[VIN AI Match] Error:", error);
    return NextResponse.json({ error: "Failed to generate vendor matches" }, { status: 500 });
  }
});
