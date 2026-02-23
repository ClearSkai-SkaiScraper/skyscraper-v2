export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/reports
 * Fetch claim reports for the authenticated org
 * Optionally filter by claimId
 */
export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const claimId = searchParams.get("claimId");

    // Fetch reports using Prisma (ai_reports table)
    const reports = await prisma.ai_reports.findMany({
      where: {
        orgId,
        ...(claimId ? { claimId } : {}),
      },
      include: {
        claims: {
          select: {
            id: true,
            claimNumber: true,
            insured_name: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      reports: reports || [],
      count: reports.length,
    });
  } catch (error) {
    logger.error("[API /reports] Error fetching reports:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch reports",
        reports: [],
      },
      { status: 500 }
    );
  }
});
