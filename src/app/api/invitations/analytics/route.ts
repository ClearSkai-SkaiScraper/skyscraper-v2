export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";

    // Calculate date range based on period
    const days =
      period === "7d"
        ? 7
        : period === "30d"
          ? 30
          : period === "90d"
            ? 90
            : period === "1y"
              ? 365
              : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Find the user's company — this is the source of truth for team seat invites
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { companyId: true, isOwner: true, isAdmin: true },
    });

    if (!membership?.companyId) {
      return NextResponse.json({ stats: [], timeline: [] });
    }

    // Fetch ALL company seat members (both active and pending) for this company
    // Scoped by membership.companyId (derived from userId) — no cross-tenant risk
    const companyMembers = await prisma.tradesCompanyMember.findMany({
      where: {
        companyId: membership.companyId,
        isOwner: false, // Exclude the owner — they didn't "accept an invite"
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats from real company seat data
    const sent = companyMembers.length;
    const accepted = companyMembers.filter(
      (m) => m.status === "active" && m.isActive && !m.userId.startsWith("pending_")
    ).length;
    const pending = companyMembers.filter(
      (m) => m.status === "pending" || m.userId.startsWith("pending_")
    ).length;
    const expired = companyMembers.filter((m) => m.status === "expired").length;
    // "Viewed" = accepted (they saw and clicked the invite)
    const viewed = accepted;

    const viewRate = sent > 0 ? Math.round((viewed / sent) * 100) : 0;
    const acceptanceRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;

    const stats = [
      {
        period: new Date().toISOString().split("T")[0],
        sent,
        viewed,
        accepted,
        expired,
        pending,
        viewRate,
        acceptanceRate,
      },
    ];

    // Build timeline from real seat invitation events
    const timeline = companyMembers.slice(0, 10).map((m) => {
      const name = [m.firstName, m.lastName].filter(Boolean).join(" ") || undefined;
      let type: "sent" | "viewed" | "accepted" | "expired" = "sent";
      if (m.status === "active" && m.isActive && !m.userId.startsWith("pending_")) {
        type = "accepted";
      } else if (m.status === "expired") {
        type = "expired";
      } else if (m.status === "pending" || m.userId.startsWith("pending_")) {
        type = "sent";
      }

      return {
        id: m.id,
        type,
        email: m.email || "",
        name,
        timestamp:
          m.updatedAt?.toISOString() || m.createdAt?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      stats,
      timeline,
    });
  } catch (error: unknown) {
    logger.error("Error fetching invitation analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
