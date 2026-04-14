export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { toPlainJSON } from "@/lib/serialize";

/** Wraps a promise so a single failure won't crash the entire Promise.all */
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (err) {
    logger.warn("[DASHBOARD_STATS] query failed, using fallback:", err);
    return fallback;
  }
}

export const GET = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    // withAuth provides DB-backed orgId — no more fallback chains needed

    // Also resolve tradesCompanyMember.companyId — some data may be keyed on
    // companyId rather than orgId (e.g., client-portal threads, network posts)
    let companyId: string | null = null;
    try {
      const membership = await prisma.tradesCompanyMember.findFirst({
        where: { userId },
        select: { companyId: true },
      });
      companyId = membership?.companyId || null;
    } catch {
      // Non-critical — companyId is optional enhancement
    }

    // Build OR condition: match on orgId OR companyId for broader coverage
    const orgFilter =
      companyId && companyId !== orgId ? { OR: [{ orgId }, { orgId: companyId }] } : { orgId };

    logger.info("[DASHBOARD_STATS] resolved", { orgId, companyId, userId });

    // Calculate date ranges for trends (30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Each query is individually resilient — one failure won't zero-out everything
    const [
      claimsCount,
      leadsCount,
      unreadMessagesCount,
      retailJobsCount,
      recentClaims,
      recentLeads,
      claimsLast30,
      claimsPrior30,
      leadsLast30,
      leadsPrior30,
      retailJobsLast30,
      retailJobsPrior30,
      messagesLast30,
      messagesPrior30,
      // Report Analytics (Phase 5)
      pdfReportsLast30,
      videoReportsLast30,
      uniqueClaimsWithReportsData,
    ] = await Promise.all([
      safe(prisma.claims.count({ where: { ...orgFilter, archivedAt: null } }), 0),
      safe(
        prisma.leads.count({
          where: {
            ...orgFilter,
            archivedAt: null,
            // Exclude retail-category leads — those show under "Retail Jobs" card
            NOT: { jobCategory: { in: ["out_of_pocket", "financed", "repair"] } },
          },
        }),
        0
      ),
      // Unread messages count — threads where org has unread messages
      safe(
        prisma.message.count({
          where: {
            read: false,
            NOT: { senderUserId: userId },
            MessageThread: { orgId },
          },
        }),
        0
      ),
      safe(
        prisma.leads.count({
          where: {
            ...orgFilter,
            archivedAt: null,
            jobCategory: { in: ["out_of_pocket", "financed", "repair"] },
            stage: { notIn: ["closed", "lost"] },
          },
        }),
        0
      ),
      safe(
        prisma.claims.findMany({
          where: orgFilter,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            claimNumber: true,
            status: true,
            createdAt: true,
            damageType: true,
          },
        }),
        []
      ),
      safe(
        prisma.leads.findMany({
          where: orgFilter,
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            stage: true,
            createdAt: true,
            contactId: true,
          },
        }),
        []
      ),
      // Trends - last 30 days
      safe(prisma.claims.count({ where: { ...orgFilter, createdAt: { gte: thirtyDaysAgo } } }), 0),
      safe(
        prisma.claims.count({
          where: { ...orgFilter, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        }),
        0
      ),
      safe(
        prisma.leads.count({
          where: {
            ...orgFilter,
            createdAt: { gte: thirtyDaysAgo },
            NOT: { jobCategory: { in: ["out_of_pocket", "financed", "repair"] } },
          },
        }),
        0
      ),
      safe(
        prisma.leads.count({
          where: {
            ...orgFilter,
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
            NOT: { jobCategory: { in: ["out_of_pocket", "financed", "repair"] } },
          },
        }),
        0
      ),
      safe(
        prisma.leads.count({
          where: {
            ...orgFilter,
            jobCategory: { in: ["out_of_pocket", "financed", "repair"] },
            stage: { notIn: ["closed", "lost"] },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        0
      ),
      safe(
        prisma.leads.count({
          where: {
            ...orgFilter,
            jobCategory: { in: ["out_of_pocket", "financed", "repair"] },
            stage: { notIn: ["closed", "lost"] },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        }),
        0
      ),
      // Messages trends (replaces network posts)
      safe(
        prisma.message.count({
          where: {
            read: false,
            NOT: { senderUserId: userId },
            MessageThread: { orgId },
            createdAt: { gte: thirtyDaysAgo },
          },
        }),
        0
      ),
      safe(
        prisma.message.count({
          where: {
            read: false,
            NOT: { senderUserId: userId },
            MessageThread: { orgId },
            createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
          },
        }),
        0
      ),
      // Report Analytics - Phase 5
      safe(
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM "reports" 
          WHERE "orgId" = ${orgId} AND "createdAt" >= ${thirtyDaysAgo}
        `.then((rows) => Number(rows[0]?.count || 0)),
        0
      ),
      // VideoReport table doesn't exist - return 0
      Promise.resolve(0),
      safe(
        prisma.$queryRaw<Array<{ claimId: string }>>`
          SELECT DISTINCT "claimId" FROM "reports" 
          WHERE "orgId" = ${orgId} AND "createdAt" >= ${thirtyDaysAgo}
        `,
        []
      ),
    ]);

    // Calculate percentage trends
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? "+100%" : "--";
      const percent = ((current - previous) / previous) * 100;
      return `${percent >= 0 ? "+" : ""}${Math.round(percent)}%`;
    };

    const uniqueClaimsWithReports = uniqueClaimsWithReportsData.length;

    const payload = toPlainJSON({
      ok: true,
      stats: {
        claimsCount,
        leadsCount,
        unreadMessagesCount,
        jobsCount: retailJobsCount,
        recentClaims,
        recentLeads,
        claimsTrend: calculateTrend(claimsLast30, claimsPrior30),
        leadsTrend: calculateTrend(leadsLast30, leadsPrior30),
        jobsTrend: calculateTrend(retailJobsLast30, retailJobsPrior30),
        messagesTrend: calculateTrend(messagesLast30, messagesPrior30),
        // Report Analytics - Phase 5
        pdfReportsCount: pdfReportsLast30,
        videoReportsCount: videoReportsLast30,
        uniqueClaimsWithReports,
        totalReportsGenerated: pdfReportsLast30 + videoReportsLast30,
      },
    });

    return NextResponse.json(payload);
  } catch (error) {
    logger.error("[GET /api/dashboard/stats] error:", error);
    return NextResponse.json({ ok: false, error: "Unknown error" }, { status: 500 });
  }
});
