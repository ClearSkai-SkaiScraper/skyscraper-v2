export const dynamic = "force-dynamic";

// src/app/api/estimates/[id]/export/json/route.ts
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  const { id: estimateId } = await routeParams.params;
  try {
    const estimates = await prisma.estimates.findFirst({
      where: {
        id: estimateId,
        orgId,
      },
    });

    if (!estimates) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ai = (estimates as any).aiEstimateJson ?? {};
    const items = Array.isArray(ai.lineItems) ? ai.lineItems : [];

    const payload = {
      version: "1.0",
      type: "estimates",
      estimateId: estimates.id,
      claim_id: estimates.claim_id,
      orgId: estimates.orgId,
      title: estimates.title,
      mode: estimates.mode, // "insurance" | "retail" | "hybrid"
      materialTaxRate: estimates.material_tax_rate,
      laborTaxRate: estimates.labor_tax_rate,
      overheadPercent: estimates.overhead_percent,
      profitPercent: estimates.profit_percent,
      oAndPEnabled: estimates.o_and_p_enabled,
      createdAt: estimates.createdAt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lineItems: items.map((it: any, idx: number) => ({
        index: idx + 1,
        code: it.code ?? "",
        description: it.description ?? "",
        category: it.category ?? "",
        area: it.roomArea ?? it.area ?? "",
        quantity: Number(it.quantity ?? 0),
        unit: it.unit ?? "EA",
        unitPrice: Number(it.unitPrice ?? 0),
        taxable: it.taxable ?? true,
        opEligible: it.opEligible ?? true,
      })),
      meta: ai.meta ?? {},
    };

    const fileName = `estimates-${estimates.id}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    logger.error("Error exporting estimates JSON:", err);
    return NextResponse.json({ error: "Failed to export estimates." }, { status: 500 });
  }
});
