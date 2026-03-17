export const dynamic = "force-dynamic";

/**
 * PHASE 40: Priced Estimate API Route
 * POST /api/estimate/priced
 *
 * Applies pricing to estimate with:
 * - Base pricing
 * - Waste factor
 * - Region multiplier
 * - Labor burden
 * - Sales tax
 * - O&P
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildEstimateSummary,
  buildSymbilityJson,
  buildXactimateXml,
  parseScope,
} from "@/lib/ai/estimatorEngine";
import { priceScope, PricingProfile } from "@/lib/ai/pricingEngine";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit, getRateLimitError } from "@/lib/ratelimit";
import { track } from "@/lib/track";

// Input validation schema
const EstimatePricedSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  city: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  wasteFactor: z.number().min(0).max(1).optional(),
  regionMultiplier: z.number().min(0).optional(),
  laborBurden: z.number().min(0).optional(),
  overheadProfit: z.number().min(0).max(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Rate limiting
    const rateLimit = await checkRateLimit(userId, "API");
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: getRateLimitError(rateLimit.reset),
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate request
    const body = await request.json();
    const parsed = EstimatePricedSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { leadId, city, taxRate, wasteFactor, regionMultiplier, laborBurden, overheadProfit } =
      parsed.data;

    // 3. Get user's org
    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "User organization not found" }, { status: 404 });
    }

    const orgId = user.orgId;

    // 4. Load lead
    const lead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        orgId: orgId,
      },
      include: {
        contacts: true,
        claims: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 5. Load or create PricingProfile
    let pricingProfile = await prisma.pricingProfile.findUnique({
      where: { orgId },
    });

    if (!pricingProfile) {
      // Create default pricing profile
      pricingProfile = await prisma.pricingProfile.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          taxRate: 0.089, // 8.9% default for AZ
          opPercent: 0.2, // 20% O&P
          wasteFactor: 0.15, // 15% waste
          laborFactor: 1.0,
          regionFactor: 1.0,
        },
      });
    }

    // 6. Load ClaimWriter record for scope
    const claimWriter = await prisma.claimWriter.findFirst({
      where: {
        leadId,
        orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!claimWriter || !claimWriter.scopeJson) {
      return NextResponse.json(
        { error: "No scope found. Generate claim draft first." },
        { status: 400 }
      );
    }

    // 8. Parse scope
    logger.debug("[estimate/priced] Parsing scope...");
    const parsedScope = parseScope(claimWriter.scopeJson);

    // 9. Apply pricing
    logger.debug("[estimate/priced] Applying pricing...");
    const profile: PricingProfile = {
      taxRate: pricingProfile.taxRate,
      opPercent: pricingProfile.opPercent,
      wasteFactor: pricingProfile.wasteFactor,
      laborFactor: pricingProfile.laborFactor,
      regionFactor: pricingProfile.regionFactor,
    };

    const { pricedItems, totals, unpricedItems } = priceScope(parsedScope.items, profile);

    // 10. Build priced XML
    logger.debug("[estimate/priced] Building priced Xactimate XML...");
    const pricingInfo = pricedItems.map((item) => ({
      code: item.code,
      unitPrice: item.unitPrice,
      tax: item.tax,
      op: item.op,
      total: item.total,
    }));

    const primaryContact = lead.contacts?.[0];
    const metadata = {
      id: lead.id,
      name: primaryContact
        ? `${primaryContact.firstName || ""} ${primaryContact.lastName || ""}`.trim()
        : lead.title,
      address: primaryContact?.street || undefined,
      dateOfLoss: lead.claims?.dateOfLoss?.toISOString() || undefined,
      claimNumber: lead.claimId || undefined,
    };
    const xml = buildXactimateXml(parsedScope, metadata, pricingInfo);

    // 11. Build priced Symbility JSON
    logger.debug("[estimate/priced] Building priced Symbility JSON...");
    const symbility = buildSymbilityJson(parsedScope, metadata, pricingInfo);

    // 12. Build summary
    const summary = buildEstimateSummary(parsedScope);

    // 13. Update EstimateExport record
    const existingExport = await prisma.estimateExport.findFirst({
      where: {
        leadId,
        orgId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingExport) {
      await prisma.estimateExport.update({
        where: { id: existingExport.id },
        data: {
          xml,
          symbility,
          summary,
        },
      });
    } else {
      await prisma.estimateExport.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          leadId,
          claimId: lead.claimId || undefined,
          xml,
          symbility,
          summary,
        },
      });
    }

    // 14. Track analytics
    await track("estimate_priced", {
      props: {
        leadId,
        orgId: user.orgId,
        city: city || "unknown",
        taxRate: pricingProfile.taxRate,
        totalAmount: totals.total,
        lineItemCount: pricedItems.length,
      },
    }).catch(logger.error);

    // 15. Return success
    return NextResponse.json({
      success: true,
      xml,
      symbility,
      summary,
      totals,
      pricedItems: pricedItems.map((item) => ({
        code: item.code,
        description: item.description,
        quantity: item.qty,
        quantityWithWaste: item.quantityWithWaste,
        unit: item.units,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        tax: item.tax,
        op: item.op,
        total: item.total,
      })),
      unpricedItems: unpricedItems.map((item) => ({
        code: item.code,
        description: item.description,
      })),
    });
  } catch (error) {
    logger.error("[estimate/priced] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate priced estimate",
        details: "Unknown error",
      },
      { status: 500 }
    );
  }
}
