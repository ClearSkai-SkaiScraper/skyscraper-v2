export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/leaderboard/export
 *
 * Exports leaderboard data as CSV.
 * Manager+ role required.
 */

import { NextRequest, NextResponse } from "next/server";

import { withManager } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withManager(async (req: NextRequest, { orgId }) => {
  try {
    // Fetch team members via raw SQL (user_organizations join)
    const members = await prisma.$queryRaw<{ id: string; name: string; email: string }[]>`
      SELECT u.id, u.name, u.email
      FROM users u
      JOIN user_organizations uo ON uo."userId" = u.id
      WHERE uo."organizationId" = ${orgId}
      ORDER BY u.name ASC
    `;

    // Gather claim metrics per user
    const rows: string[] = [];
    rows.push(
      "Name,Email,Claims Assigned,Claims Signed,Total Job Value,Leads Created,Conversion Rate"
    );

    for (const member of members) {
      const claimsAssigned = await prisma.claims.count({
        where: { orgId, assignedTo: member.id },
      });

      const claimsSigned = await prisma.claims.count({
        where: { orgId, assignedTo: member.id, signingStatus: "signed" },
      });

      const jobValueResult = await prisma.claims.aggregate({
        where: { orgId, assignedTo: member.id, jobValueStatus: "approved" },
        _sum: { estimatedJobValue: true },
      });

      const leadsGenerated = await prisma.leads.count({
        where: { orgId, createdBy: member.id },
      });

      const leadsConverted = await prisma.leads.count({
        where: { orgId, createdBy: member.id, stage: "converted" },
      });

      const conversionRate =
        leadsGenerated > 0 ? ((leadsConverted / leadsGenerated) * 100).toFixed(1) : "0.0";

      const totalJobValue = jobValueResult._sum?.estimatedJobValue || 0;

      rows.push(
        [
          `"${member.name || "Unknown"}"`,
          `"${member.email}"`,
          claimsAssigned,
          claimsSigned,
          totalJobValue,
          leadsGenerated,
          `${conversionRate}%`,
        ].join(",")
      );
    }

    const csv = rows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leaderboard-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    logger.error("[LEADERBOARD_EXPORT] Error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
});
