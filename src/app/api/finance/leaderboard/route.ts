// eslint-disable-next-line no-restricted-imports
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── Demo / test user filter ──
// Matches the patterns used in contacts page to filter seed/test data
const DEMO_USER_ID_PREFIXES = ["user_demo_", "user_test_"];
const DEMO_NAME_PATTERNS = [
  "demo admin",
  "demo user",
  "test user",
  "test",
  "demo",
  "seed",
  "sample",
  "placeholder",
];
const DEMO_EMAIL_PATTERNS = [
  "@example.com",
  "@test.com",
  "@demo.com",
  "@fake.com",
  "@placeholder.local",
];

function isDemoUser(user: { name?: string | null; email?: string | null; userId?: string }) {
  const name = (user.name || "").toLowerCase().trim();
  const email = (user.email || "").toLowerCase();
  const uid = (user.userId || "").toLowerCase();
  if (DEMO_USER_ID_PREFIXES.some((p) => uid.startsWith(p))) return true;
  if (DEMO_NAME_PATTERNS.some((p) => name === p)) return true;
  if (DEMO_EMAIL_PATTERNS.some((p) => email.includes(p))) return true;
  return false;
}

/**
 * GET /api/finance/leaderboard — Company leaderboard
 * Hybrid: Uses team_performance table first, then falls back to
 * computing real-time stats from claims + leads + scopes data.
 *
 * Supports ?period=month|3month|6month|year (default: month)
 */
export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    // withAuth guarantees orgId + userId are DB-backed

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const sourceFilter = searchParams.get("source") || null;

    // Calculate date range based on period
    const now = new Date();
    let periodStart: Date;
    switch (period) {
      case "3month":
        periodStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "6month":
        periodStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case "year":
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      case "month":
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Strategy 1: Try team_performance table first
    const perfRecords = await prisma.team_performance.findMany({
      where: {
        orgId: ctx.orgId,
        periodStart: { gte: periodStart },
      },
      orderBy: { totalRevenueGenerated: "desc" },
      take: 25,
    });

    if (perfRecords.length > 0) {
      // Use team_performance data (existing path)
      // Filter out demo/test userIds before processing
      const filteredPerfRecords = perfRecords.filter(
        (r) => !DEMO_USER_ID_PREFIXES.some((p) => r.userId.toLowerCase().startsWith(p))
      );
      const userIds = [...new Set(filteredPerfRecords.map((r) => r.userId))];
      const users = await prisma.users.findMany({
        where: {
          OR: [{ id: { in: userIds } }, { clerkUserId: { in: userIds } }],
        },
        select: { id: true, clerkUserId: true, name: true, email: true, headshot_url: true },
      });
      // Map by both id and clerkUserId so lookups work regardless of which was stored
      const usersMap = new Map<string, (typeof users)[0]>();
      for (const u of users) {
        usersMap.set(u.id, u);
        usersMap.set(u.clerkUserId, u);
      }

      const byRevenue = [...filteredPerfRecords].sort(
        (a, b) => Number(b.totalRevenueGenerated) - Number(a.totalRevenueGenerated)
      );
      const byClaims = [...filteredPerfRecords].sort((a, b) => b.claimsSigned - a.claimsSigned);
      const byDoors = [...filteredPerfRecords].sort((a, b) => b.doorsKnocked - a.doorsKnocked);

      const leaderboard = filteredPerfRecords.map((r) => {
        const user = usersMap.get(r.userId);
        return {
          userId: r.userId,
          name: user?.name || r.userId.slice(0, 12),
          email: user?.email || "",
          avatar: user?.headshot_url || null,
          revenue: Number(r.totalRevenueGenerated),
          claimsSigned: r.claimsSigned,
          claimsApproved: r.claimsApproved,
          doorsKnocked: r.doorsKnocked,
          closeRate: Number(r.closeRate),
          commissionEarned:
            Number(r.commissionPaid) + Number(r.commissionOwed) + Number(r.commissionPending),
          commissionPaid: Number(r.commissionPaid),
          rankRevenue: byRevenue.findIndex((x) => x.userId === r.userId) + 1,
          rankClaims: byClaims.findIndex((x) => x.userId === r.userId) + 1,
          rankDoors: byDoors.findIndex((x) => x.userId === r.userId) + 1,
        };
      });

      // Filter out any remaining demo/test users by resolved name/email
      const cleanLeaderboard = leaderboard.filter((entry) => !isDemoUser(entry));

      const totalRevenue = cleanLeaderboard.reduce((s, r) => s + r.revenue, 0);
      const totalClaims = cleanLeaderboard.reduce((s, r) => s + r.claimsSigned, 0);
      const totalDoors = cleanLeaderboard.reduce((s, r) => s + r.doorsKnocked, 0);

      // Calculate signed claims count from claims table for accurate summary
      const signedClaimsCount = await prisma.claims.count({
        where: {
          orgId: ctx.orgId,
          createdAt: { gte: periodStart },
          signingStatus: "signed",
          isDemo: false,
        },
      });

      const pendingClaimsCount = await prisma.claims.count({
        where: {
          orgId: ctx.orgId,
          createdAt: { gte: periodStart },
          OR: [{ signingStatus: "pending" }, { signingStatus: null }],
          isDemo: false,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          leaderboard: cleanLeaderboard,
          summary: {
            totalRevenue,
            totalClaims,
            totalDoors,
            pendingClaimsCount,
            signedClaimsCount,
            repCount: cleanLeaderboard.length,
            avgCloseRate:
              cleanLeaderboard.length > 0
                ? cleanLeaderboard.reduce((s, r) => s + r.closeRate, 0) / cleanLeaderboard.length
                : 0,
          },
          period,
          source: "team_performance",
        },
      });
    }

    // Strategy 2: Compute leaderboard from real claims/leads/scopes data
    // ── Fetch ALL org members: Clerk API + user_organizations + tradesCompanyMember ──
    let clerkMembers: Array<{
      userId: string;
      firstName: string | null;
      lastName: string | null;
      imageUrl: string;
      email: string | null;
    }> = [];
    try {
      // eslint-disable-next-line @typescript-eslint/await-thenable
      const clerk = await clerkClient();
      const orgMemberList = await clerk.organizations.getOrganizationMembershipList({
        organizationId: ctx.orgId!,
        limit: 100,
      });
      clerkMembers = orgMemberList.data
        .map((m) => ({
          userId: m.publicUserData?.userId || "",
          firstName: m.publicUserData?.firstName || null,
          lastName: m.publicUserData?.lastName || null,
          imageUrl: m.publicUserData?.imageUrl || "",
          email: m.publicUserData?.identifier || null,
        }))
        .filter((m) => m.userId);
    } catch (e) {
      logger.warn("[Leaderboard] Could not fetch Clerk org members:", e);
    }

    const memberships = await prisma.user_organizations.findMany({
      where: { organizationId: ctx.orgId },
      select: { userId: true },
    });

    const tradeMembers = await prisma.tradesCompanyMember
      .findMany({
        where: { companyId: ctx.orgId },
        select: { userId: true },
      })
      .catch(() => []);

    const memberIds = [
      ...new Set([
        ...clerkMembers.map((m) => m.userId),
        ...memberships.map((m) => m.userId),
        ...tradeMembers.map((m) => m.userId),
        ctx.userId!,
      ]),
    ];
    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          leaderboard: [],
          summary: {
            totalRevenue: 0,
            totalClaims: 0,
            totalDoors: 0,
            repCount: 0,
            avgCloseRate: 0,
            allSources: [] as string[],
          },
          period,
          source: "computed",
        },
      });
    }

    const users = await prisma.users.findMany({
      where: {
        OR: [{ clerkUserId: { in: memberIds } }, { id: { in: memberIds } }],
      },
      select: { id: true, clerkUserId: true, name: true, email: true, headshot_url: true },
    });

    // Ensure ALL members are represented, even if not in users table
    // Build a map of found users by both id and clerkUserId
    const foundUserIds = new Set<string>();
    for (const u of users) {
      foundUserIds.add(u.id);
      foundUserIds.add(u.clerkUserId);
    }
    // For any memberId not found, create a synthetic entry from Clerk data
    const syntheticUsers: typeof users = [];
    for (const mid of memberIds) {
      if (!foundUserIds.has(mid)) {
        const cm = clerkMembers.find((c) => c.userId === mid);
        syntheticUsers.push({
          id: mid,
          clerkUserId: mid,
          name: cm
            ? [cm.firstName, cm.lastName].filter(Boolean).join(" ") || cm.email || "Team Member"
            : "Team Member",
          email: cm?.email || "",
          headshot_url: cm?.imageUrl || null,
        });
        foundUserIds.add(mid);
      }
    }
    const allUsers = [...users, ...syntheticUsers];

    // Get ALL claims per user in period — exclude demo claims
    // Count all claims regardless of signingStatus for accurate leaderboard
    const allClaims = await prisma.claims.findMany({
      where: {
        orgId: ctx.orgId,
        createdAt: { gte: periodStart },
        isDemo: false,
      },
      select: {
        id: true,
        estimatedValue: true,
        estimatedJobValue: true,
        jobValueStatus: true,
        status: true,
        signingStatus: true,
        createdAt: true,
        assignedTo: true,
      },
      take: 5000, // Safety limit — bounded by period + org
    });

    // Separate signed claims from all claims for metrics
    const claims = allClaims; // Use all claims for leaderboard attribution
    const signedClaims = allClaims.filter((c) => c.signingStatus === "signed");
    const pendingClaimsCount = allClaims.filter(
      (c) => c.signingStatus === "pending" || c.signingStatus === null
    ).length;

    // Get leads per user (leads created in period), optionally filtered by source
    const leads = await prisma.leads.findMany({
      where: {
        orgId: ctx.orgId,
        createdAt: { gte: periodStart },
        ...(sourceFilter ? { source: sourceFilter } : {}),
      },
      select: {
        id: true,
        value: true,
        stage: true,
        source: true,
        jobCategory: true,
        createdAt: true,
        assignedTo: true,
      },
      take: 5000, // Safety limit — bounded by period + org
    });

    // Collect all unique lead sources for the filter dropdown
    const allSourcesQuery = await prisma.leads.findMany({
      where: { orgId: ctx.orgId, createdAt: { gte: periodStart } },
      select: { source: true },
      distinct: ["source"],
    });
    const allSources = allSourcesQuery.map((s) => s.source).filter(Boolean) as string[];

    // Build leaderboard entries for each member — per-user attribution
    const leaderboard = allUsers.map((user) => {
      // Attribute claims by assignedTo
      const userClaims = claims.filter(
        (c) => c.assignedTo === user.clerkUserId || c.assignedTo === user.id
      );
      const claimsWithCreator = claims.filter((c) => c.assignedTo);
      const effectiveClaims = claimsWithCreator.length > 0 ? userClaims : claims;

      // Attribute leads by assignedTo
      const userLeads = leads.filter(
        (l) => l.assignedTo === user.clerkUserId || l.assignedTo === user.id
      );
      const leadsWithAssigned = leads.filter((l) => l.assignedTo);
      const effectiveLeads = leadsWithAssigned.length > 0 ? userLeads : leads;

      // Source breakdown per user
      const sourceBreakdown: Record<string, number> = {};
      for (const lead of effectiveLeads) {
        const src = lead.source || "unknown";
        sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
      }

      const approvedClaims = effectiveClaims.filter(
        (c) => c.status === "approved" || c.status === "completed"
      ).length;
      // Use approved estimatedJobValue when available, otherwise fall back to estimatedValue
      const claimsRevenue =
        effectiveClaims.reduce((sum, c) => {
          const jobVal =
            c.jobValueStatus === "approved" && c.estimatedJobValue
              ? c.estimatedJobValue
              : c.estimatedValue || 0;
          return sum + jobVal;
        }, 0) / 100;
      const leadsRevenue = effectiveLeads.reduce((sum, l) => sum + (l.value || 0), 0) / 100;
      const totalRevenue = claimsRevenue + leadsRevenue;
      const closeRate =
        effectiveClaims.length > 0 ? (approvedClaims / effectiveClaims.length) * 100 : 0;

      return {
        userId: user.clerkUserId || user.id,
        name: user.name || user.email || "Team Member",
        email: user.email || "",
        avatar: user.headshot_url || null,
        revenue: totalRevenue,
        claimsSigned: effectiveClaims.filter((c) => c.signingStatus === "signed").length,
        claimsApproved: approvedClaims,
        doorsKnocked: effectiveLeads.length,
        closeRate,
        commissionEarned: totalRevenue * 0.1,
        commissionPaid: 0,
        rankRevenue: 0,
        rankClaims: 0,
        rankDoors: 0,
        sourceBreakdown,
      };
    });

    // Filter out demo/test users
    const cleanLeaderboard = leaderboard.filter((entry) => !isDemoUser(entry));

    // Compute rankings
    const byRevenue = [...cleanLeaderboard].sort((a, b) => b.revenue - a.revenue);
    const byClaims = [...cleanLeaderboard].sort((a, b) => b.claimsSigned - a.claimsSigned);
    const byDoors = [...cleanLeaderboard].sort((a, b) => b.doorsKnocked - a.doorsKnocked);

    cleanLeaderboard.forEach((entry) => {
      entry.rankRevenue = byRevenue.findIndex((x) => x.userId === entry.userId) + 1;
      entry.rankClaims = byClaims.findIndex((x) => x.userId === entry.userId) + 1;
      entry.rankDoors = byDoors.findIndex((x) => x.userId === entry.userId) + 1;
    });

    const totalRevenue = cleanLeaderboard.reduce((s, r) => s + r.revenue, 0);
    const totalClaims = cleanLeaderboard.reduce((s, r) => s + r.claimsSigned, 0);
    const totalDoors = cleanLeaderboard.reduce((s, r) => s + r.doorsKnocked, 0);
    const signedClaimsCount = signedClaims.length;

    return NextResponse.json({
      success: true,
      data: {
        leaderboard: byRevenue,
        summary: {
          totalRevenue,
          totalClaims,
          totalDoors,
          pendingClaimsCount,
          signedClaimsCount,
          repCount: cleanLeaderboard.length,
          avgCloseRate:
            cleanLeaderboard.length > 0
              ? cleanLeaderboard.reduce((s, r) => s + r.closeRate, 0) / cleanLeaderboard.length
              : 0,
          allSources,
        },
        period,
        sourceFilter,
        source: "computed",
      },
    });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.digest?.startsWith?.("NEXT_REDIRECT")) throw err;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusCode = (err as any)?.statusCode;
    if (statusCode === 403) {
      return NextResponse.json({ error: (err as Error).message }, { status: 403 });
    }
    logger.error("[API] leaderboard error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
});
