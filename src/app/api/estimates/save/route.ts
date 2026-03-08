export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

type SaveEstimateRequest = {
  claimId?: string | null;
  title?: string | null;
  mode: "insurance" | "retail" | "hybrid";
  taxRate: number;
  opPercent: number;
  opEnabled: boolean;
  lineItems: any[];
  meta?: any;
};

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = (await req.json()) as SaveEstimateRequest;

    if (!body.mode) {
      return NextResponse.json({ error: "mode is required." }, { status: 400 });
    }

    // Calculate totals from line items
    let subtotal = 0;
    let taxableAmount = 0;
    let opBase = 0;

    for (const item of body.lineItems) {
      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
      subtotal += lineTotal;
      if (item.taxable) taxableAmount += lineTotal;
      if (body.opEnabled && item.opEligible) opBase += lineTotal;
    }

    const tax = taxableAmount * (body.taxRate / 100);
    const opAmount = opBase * (body.opPercent / 100);
    const grandTotal = subtotal + tax + opAmount;

    const estimates = await prisma.estimates.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        projectId: "default", // Required field
        authorId: userId,
        claim_id: body.claimId || undefined,
        title: body.title ?? "AI Estimate",
        mode: body.mode,
        subtotal,
        tax,
        total: grandTotal,
        grand_total: grandTotal,
        o_and_p_enabled: body.opEnabled,
        overhead_percent: body.opPercent / 100, // Convert to decimal
        profit_percent: body.opPercent / 100, // Same as overhead for now
        overhead_amount: opAmount / 2, // Split O&P
        profit_amount: opAmount / 2,
        tax_amount: tax,
        material_tax_rate: body.taxRate / 100, // Convert to decimal
        labor_tax_rate: body.taxRate / 100,
        scopeItems: {
          lineItems: body.lineItems,
          opEnabled: body.opEnabled,
          ...body.meta,
        } as any,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ estimateId: estimates.id, estimates });
  } catch (err) {
    logger.error("Error in /api/estimates/save:", err);
    return NextResponse.json({ error: "Failed to save estimates." }, { status: 500 });
  }
});
