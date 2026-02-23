import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate real metrics from claims and transactions — parallel fetch
    let mtdRevenue = 0;
    let claims30d = 0;
    let closedClaims30d = 0;
    let activeClaims = 0;

    const [paymentsResult, claimsResult] = await Promise.all([
      // MTD Revenue from payments
      prisma.payments
        .findMany({
          where: {
            org_id: orgId,
            created_at: { gte: startOfMonth },
            type: "credit",
          },
          select: { amount: true },
        })
        .catch((err) => {
          logger.error("[KPI] MTD revenue calculation failed:", err);
          return [] as { amount: any }[];
        }),
      // Claims metrics
      prisma.claims
        .findMany({
          where: { orgId },
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        })
        .catch((err) => {
          logger.error("[KPI] Claims metrics calculation failed:", err);
          return [] as { id: string; status: string | null; createdAt: Date; updatedAt: Date }[];
        }),
    ]);

    mtdRevenue = paymentsResult.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    if (claimsResult.length > 0) {
      claims30d = claimsResult.filter((c) => c.createdAt >= thirtyDaysAgo).length;
      closedClaims30d = claimsResult.filter(
        (c) => c.updatedAt >= thirtyDaysAgo && (c.status === "closed" || c.status === "completed")
      ).length;
      activeClaims = claimsResult.filter(
        (c) => c.status !== "closed" && c.status !== "completed"
      ).length;
    }

    const kpis = [
      {
        id: "mtd-revenue",
        label: "MTD Revenue",
        value: `$${(mtdRevenue / 100).toLocaleString()}`,
        change: "+0%", // Can calculate vs last month later
        trend: "up" as const,
      },
      {
        id: "claims-30d",
        label: "Claims (30d)",
        value: claims30d.toString(),
        change: "+0%",
        trend: "neutral" as const,
      },
      {
        id: "closed-30d",
        label: "Closed (30d)",
        value: closedClaims30d.toString(),
        change: "+0%",
        trend: "up" as const,
      },
      {
        id: "active-claims",
        label: "Active Claims",
        value: activeClaims.toString(),
        change: "+0%",
        trend: "neutral" as const,
      },
    ];

    return NextResponse.json(kpis);
  } catch (err) {
    logger.error("[KPI_ERROR]", err);
    return NextResponse.json({ error: "Failed to load KPIs" }, { status: 500 });
  }
});
