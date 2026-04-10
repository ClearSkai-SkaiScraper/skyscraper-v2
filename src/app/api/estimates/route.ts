export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const CreateEstimateSchema = z.object({
  projectId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  mode: z.string().optional(),
  lossType: z.string().optional(),
  dol: z.string().optional(),
  carrier: z.string().optional(),
  claimId: z.string().optional(),
  oAndP: z
    .object({
      enabled: z.boolean(),
      overheadPercent: z.number(),
      profitPercent: z.number(),
    })
    .optional(),
  tax: z
    .object({
      materialTaxRate: z.number(),
      laborTaxRate: z.number(),
    })
    .optional(),
  sections: z.array(
    z.object({
      name: z.string(),
      trade: z.string().optional(),
      areaRef: z.string().optional(),
      items: z.array(
        z.object({
          code: z.string().optional(),
          name: z.string(),
          scopeNote: z.string().optional(),
          unit: z.string().optional(),
          quantity: z.number(),
          unitPrice: z.number().optional(),
          category: z.string().optional(),
          source: z.string().optional(),
          changeType: z.string().optional(),
          justification: z.string().optional(),
          grouping: z.any().optional(),
        })
      ),
    })
  ),
  totals: z
    .object({
      subtotal: z.number().optional(),
      overheadAmount: z.number().optional(),
      profitAmount: z.number().optional(),
      taxAmount: z.number().optional(),
      grandTotal: z.number().optional(),
    })
    .optional(),
  source: z.any().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/estimates
 * Create a new estimates from structured data
 */
export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const body = await req.json();
    const data = CreateEstimateSchema.parse(body);

    // Calculate totals if not provided
    let subtotal = data.totals?.subtotal || 0;
    const items: any[] = [];

    // Flatten sections into line items
    for (const section of data.sections) {
      for (const item of section.items) {
        const lineTotal = item.unitPrice ? item.quantity * item.unitPrice : null;
        if (lineTotal) {
          subtotal += lineTotal;
        }

        items.push({
          sectionName: section.name,
          trade: section.trade,
          areaRef: section.areaRef,
          code: item.code,
          name: item.name,
          scopeNote: item.scopeNote,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal,
          category: item.category,
          source: item.source,
          changeType: item.changeType,
          grouping: item.grouping,
          justification: item.justification,
        });
      }
    }

    const oAndPEnabled = data.oAndP?.enabled || false;
    const overheadPercent = data.oAndP?.overheadPercent || 0;
    const profitPercent = data.oAndP?.profitPercent || 0;
    const materialTaxRate = data.tax?.materialTaxRate || 0;
    const laborTaxRate = data.tax?.laborTaxRate || 0;

    const overheadAmount = oAndPEnabled ? subtotal * (overheadPercent / 100) : 0;
    const profitAmount = oAndPEnabled ? subtotal * (profitPercent / 100) : 0;
    const taxAmount = (subtotal + overheadAmount + profitAmount) * materialTaxRate;
    const grandTotal = subtotal + overheadAmount + profitAmount + taxAmount;

    // Create estimates with line items
    const estimates = await prisma.estimates.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        projectId: data.projectId,
        authorId: userId,
        title: data.title,
        description: data.description,
        mode: data.mode,
        loss_type: data.lossType,
        dol: data.dol ? new Date(data.dol) : null,
        carrier: data.carrier,
        claim_id: data.claimId,
        o_and_p_enabled: oAndPEnabled,
        overhead_percent: overheadPercent,
        profit_percent: profitPercent,
        material_tax_rate: materialTaxRate,
        labor_tax_rate: laborTaxRate,
        subtotal,
        overhead_amount: overheadAmount,
        profit_amount: profitAmount,
        tax: data.totals?.taxAmount || taxAmount,
        total: data.totals?.grandTotal || grandTotal,
        grand_total: data.totals?.grandTotal || grandTotal,
        source: data.source,
        notes: data.notes,
        status: "DRAFT",
        updatedAt: new Date(),
        estimate_line_items: {
          create: items,
        },
      },
      include: {
        estimate_line_items: true,
      },
    });

    return NextResponse.json({
      success: true,
      estimates,
    });
  } catch (error) {
    logger.error("[API] Create estimates error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create estimates" },
      { status: 500 }
    );
  }
});

/**
 * GET /api/estimates
 * List all estimates for the organization
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");
    const projectId = searchParams.get("projectId");

    const estimates = await prisma.estimates.findMany({
      where: {
        orgId,
        ...(claimId ? { claim_id: claimId } : {}),
        ...(projectId ? { projectId } : {}),
      },
      include: {
        projects: {
          select: {
            id: true,
            title: true,
          },
        },
        claims: {
          select: {
            id: true,
            claimNumber: true,
            title: true,
          },
        },
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        estimate_line_items: {
          take: 10,
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      estimates,
    });
  } catch (error) {
    logger.error("[API] List estimates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch estimates" },
      { status: 500 }
    );
  }
});
