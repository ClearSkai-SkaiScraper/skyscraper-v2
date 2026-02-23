import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/reports
 * Fetch all reports for a claim from ai_reports table
 */
export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org (uses DB-backed orgId)
      await getOrgClaimOrThrow(orgId, claimId);

      const artifacts = await prisma.ai_reports.findMany({
        where: { claimId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          createdAt: true,
          attachments: true,
          userId: true,
          userName: true,
        },
      });

      // Transform to match expected format
      const reports = artifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.type.toLowerCase(),
        title: artifact.title,
        subtitle: `${artifact.status}`,
        createdAt: artifact.createdAt.toISOString(),
        createdBy: {
          name: artifact.userName || "System",
          email: "",
        },
        pdfUrl: null,
      }));

      return NextResponse.json({ reports });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      // Graceful fallback for DB errors
      logger.warn(
        "[GET /api/claims/[claimId]/reports] Error (returning empty):",
        "Failed to fetch reports"
      );
      return NextResponse.json({ reports: [], message: "Reports system not yet initialized" });
    }
  }
);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
