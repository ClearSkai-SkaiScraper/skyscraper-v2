/**
 * GET /api/trades/company/seats
 *
 * Returns seat allocation info for the current user's company:
 * - Total seats (from subscription or beta default)
 * - Used seats (active + pending members)
 * - Available seats
 * - Pending invites list
 * - Company info
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user's company membership
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId, status: "active" },
      include: { company: true },
    });

    if (!membership || !membership.company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const company = membership.company;
    const isOwner = membership.isOwner === true;
    const isAdmin = membership.isAdmin || isOwner;

    // Count members
    const [activeMembers, pendingMembers] = await Promise.all([
      prisma.tradesCompanyMember.count({
        where: { companyId: company.id, status: "active" },
      }),
      prisma.tradesCompanyMember.findMany({
        where: { companyId: company.id, status: "pending" },
        select: {
          id: true,
          email: true,
          createdAt: true,
          pendingCompanyToken: true,
        },
      }),
    ]);

    // Default to generous beta limits
    const totalSeats = 500; // Beta: unlimited essentially
    const usedSeats = activeMembers;
    const available = Math.max(0, totalSeats - usedSeats);

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
      },
      seats: {
        total: totalSeats,
        used: usedSeats,
        available,
      },
      pendingInvites: pendingMembers.map((m) => ({
        id: m.id,
        email: m.email,
        createdAt: m.createdAt,
      })),
      canManageSeats: isAdmin,
      isOwner,
    });
  } catch (error) {
    logger.error("[Seats] GET error:", error);
    return NextResponse.json({ error: "Failed to load seat data" }, { status: 500 });
  }
}
