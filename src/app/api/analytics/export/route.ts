export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

import prisma from "@/lib/prisma";

/**
 * GET /api/analytics/export — Export analytics data as CSV
 *
 * Query params:
 *   type: "claims" | "team" | "summary"
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const type = req.nextUrl.searchParams.get("type") || "summary";
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    let csv = "";
    let filename = "";

    if (type === "claims") {
      const claims = await prisma.claims.findMany({
        where: { orgId },
        select: {
          id: true,
          claimNumber: true,
          status: true,
          damageType: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });

      csv = "Claim ID,Claim Number,Status,Damage Type,Created,Updated\n";
      csv += claims
        .map(
          (c) =>
            `"${c.id}","${c.claimNumber || ""}","${c.status || ""}","${c.damageType || ""}","${c.createdAt.toISOString()}","${c.updatedAt.toISOString()}"`
        )
        .join("\n");

      filename = `claims-export-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (type === "team") {
      const activities = await prisma.activities.groupBy({
        by: ["userId", "type"],
        where: {
          orgId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
        orderBy: { _count: { userId: "desc" } },
      });

      csv = "User ID,Event Type,Count\n";
      csv += activities.map((a) => `"${a.userId}","${a.type}","${a._count}"`).join("\n");

      filename = `team-activity-export-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      // Summary export
      const [totalClaims, closedClaims, activitiesCount] = await Promise.all([
        prisma.claims.count({ where: { orgId } }),
        prisma.claims.count({
          where: { orgId, status: { in: ["closed", "settled", "completed"] } },
        }),
        prisma.activities.count({
          where: { orgId, createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

      csv = "Metric,Value\n";
      csv += `"Total Claims","${totalClaims}"\n`;
      csv += `"Closed Claims","${closedClaims}"\n`;
      csv += `"Close Rate","${totalClaims > 0 ? Math.round((closedClaims / totalClaims) * 100) : 0}%"\n`;
      csv += `"Activities (30d)","${activitiesCount}"\n`;
      csv += `"Generated","${new Date().toISOString()}"`;

      filename = `summary-export-${new Date().toISOString().split("T")[0]}.csv`;
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("[ANALYTICS_EXPORT_FAILED]", { error });
    return NextResponse.json({ ok: false, error: "Failed to export analytics" }, { status: 500 });
  }
}
