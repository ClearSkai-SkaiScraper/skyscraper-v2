export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/estimates/[id]
 * Get a single estimates with all line items
 */
export const GET = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id } = await routeParams.params;
  try {
    const estimates = await prisma.estimates.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        estimate_line_items: {
          orderBy: { created_at: "asc" },
        },
        projects: true,
        claims: true,
        users: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!estimates) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // Reconstruct sections from line items
    const sectionsMap = new Map<
      string,
      {
        name: string;
        trade: string | null;
        areaRef: string | null;
        items: typeof estimates.estimate_line_items;
      }
    >();

    for (const item of estimates.estimate_line_items) {
      const sectionName = item.section_name || "Uncategorized";

      if (!sectionsMap.has(sectionName)) {
        sectionsMap.set(sectionName, {
          name: sectionName,
          trade: item.trade,
          areaRef: item.area_ref,
          items: [],
        });
      }

      sectionsMap.get(sectionName)!.items.push(item);
    }

    const sections = Array.from(sectionsMap.values());

    return NextResponse.json({
      success: true,
      estimates: {
        ...estimates,
        sections,
      },
    });
  } catch (error) {
    logger.error("[API] Get estimates error:", error);
    return NextResponse.json({ error: "Failed to fetch estimates" }, { status: 500 });
  }
});

/**
 * PUT /api/estimates/[id]
 * Update an estimates
 */
export const PUT = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id } = await routeParams.params;
  try {
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.estimates.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    const estimates = await prisma.estimates.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        mode: body.mode,
        loss_type: body.lossType,
        carrier: body.carrier,
        o_and_p_enabled: body.oAndPEnabled,
        overhead_percent: body.overheadPercent,
        profit_percent: body.profitPercent,
        material_tax_rate: body.materialTaxRate,
        labor_tax_rate: body.laborTaxRate,
        subtotal: body.subtotal,
        overhead_amount: body.overheadAmount,
        profit_amount: body.profitAmount,
        tax_amount: body.taxAmount,
        grand_total: body.grandTotal,
        tax: body.taxAmount,
        total: body.grandTotal,
        notes: body.notes,
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
    logger.error("[API] Update estimates error:", error);
    return NextResponse.json({ error: "Failed to update estimates" }, { status: 500 });
  }
});

/**
 * DELETE /api/estimates/[id]
 * Delete an estimates
 */
export const DELETE = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id } = await routeParams.params;
  try {
    // Verify ownership
    const existing = await prisma.estimates.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    await prisma.estimates.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      description: "Estimate deleted",
    });
  } catch (error) {
    logger.error("[API] Delete estimates error:", error);
    return NextResponse.json({ error: "Failed to delete estimates" }, { status: 500 });
  }
});
