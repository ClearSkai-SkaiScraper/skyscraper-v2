export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Session 9: Added Zod schema. Previously used TypeScript `as` cast
 * with no runtime validation and spread body.meta into JSON column.
 */
const lineItemSchema = z.object({
  description: z.string().max(500).optional(),
  quantity: z.number().min(0).max(999999).default(0),
  unitPrice: z.number().min(0).max(999999).default(0),
  unit: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  taxable: z.boolean().optional(),
  opEligible: z.boolean().optional(),
});

const estimateSaveSchema = z.object({
  claimId: z.string().max(100).nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  mode: z.enum(["insurance", "retail", "hybrid"]),
  taxRate: z.number().min(0).max(100),
  opPercent: z.number().min(0).max(100),
  opEnabled: z.boolean(),
  lineItems: z.array(lineItemSchema).max(500),
  meta: z.record(z.unknown()).optional(),
});

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = await req.json();
    const parsed = estimateSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid estimate data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { mode, taxRate, opPercent, opEnabled, lineItems, claimId, title, meta } = parsed.data;

    // Calculate totals from line items
    let subtotal = 0;
    let taxableAmount = 0;
    let opBase = 0;

    for (const item of lineItems) {
      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
      subtotal += lineTotal;
      if (item.taxable) taxableAmount += lineTotal;
      if (opEnabled && item.opEligible) opBase += lineTotal;
    }

    const tax = taxableAmount * (taxRate / 100);
    const opAmount = opBase * (opPercent / 100);
    const grandTotal = subtotal + tax + opAmount;

    const estimates = await prisma.estimates.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        projectId: "default",
        authorId: userId,
        claim_id: claimId || undefined,
        title: title ?? "AI Estimate",
        mode,
        subtotal,
        tax,
        total: grandTotal,
        grand_total: grandTotal,
        o_and_p_enabled: opEnabled,
        overhead_percent: opPercent / 100,
        profit_percent: opPercent / 100,
        overhead_amount: opAmount / 2,
        profit_amount: opAmount / 2,
        tax_amount: tax,
        material_tax_rate: taxRate / 100,
        labor_tax_rate: taxRate / 100,
        scopeItems: {
          lineItems,
          opEnabled,
          ...(meta ?? {}),
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
