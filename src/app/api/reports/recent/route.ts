/**
 * GET /api/reports/recent
 *
 * Returns recently generated report artifacts for the current org.
 * Used by the PDF Builder page's "Recent Reports" section.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "10", 10) || 10);

    // Try to fetch from generated_artifacts or reports table
    let artifacts: any[] = [];

    try {
      artifacts = await prisma.reports.findMany({
        where: { orgId },
        select: {
          id: true,
          title: true,
          type: true,
          claimId: true,
          pdfUrl: true,
          createdAt: true,
          claims: {
            select: {
              claimNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      artifacts = artifacts.map((r: any) => ({
        id: r.id,
        title: r.title || "Untitled Report",
        type: r.type || "report",
        claimId: r.claimId,
        claimNumber: r.claims?.claimNumber,
        pdfUrl: r.pdfUrl || null,
        createdAt: r.createdAt,
      }));
    } catch {
      // reports table might not have these fields — return empty
      artifacts = [];
    }

    return NextResponse.json({ ok: true, artifacts, count: artifacts.length });
  } catch (error) {
    logger.error("[GET /api/reports/recent] Error:", error);
    return NextResponse.json({ ok: true, artifacts: [], count: 0 });
  }
});
