export const dynamic = "force-dynamic";

/**
 * POST /api/trades/company/seats/accept
 *
 * Accept a company seat invitation using a token.
 * - Links the user to the company member record
 * - Auto-creates a network connection between the new employee and the company owner
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find the pending invite by token
    const member = await prisma.tradesCompanyMember.findFirst({
      where: { pendingCompanyToken: token },
      include: { company: true },
    });

    if (!member) {
      // Check if already accepted (user might refresh the page)
      const existingMember = await prisma.tradesCompanyMember.findFirst({
        where: { userId, status: "active" },
        include: { company: true },
      });

      if (existingMember) {
        return NextResponse.json({
          success: true,
          message: "Already a team member",
          companyName: existingMember.company?.name || "your company",
        });
      }

      return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });
    }

    // Accept the seat — link user to the member record
    await prisma.tradesCompanyMember.update({
      where: { id: member.id },
      data: {
        userId,
        status: "active",
        pendingCompanyToken: null,
      },
    });

    const companyName = member.company?.name || "your company";

    // Ensure user has a user_organizations record for the company's org
    // This is critical for safeOrgContext / RBAC / Remote View to work
    if (member.company?.orgId) {
      try {
        const existingUo = await prisma.user_organizations.findFirst({
          where: { userId, organizationId: member.company.orgId },
        });
        if (!existingUo) {
          await prisma.user_organizations.create({
            data: {
              userId,
              organizationId: member.company.orgId,
              role: "MEMBER",
            },
          });
          logger.info("[Seats] Created user_organizations record for new member", {
            userId,
            orgId: member.company.orgId,
          });
        }
      } catch (uoErr) {
        logger.warn("[Seats] user_organizations upsert failed (non-blocking):", uoErr);
      }
    }

    // Find the company owner (via isOwner flag on tradesCompanyMember)
    const ownerMember = await prisma.tradesCompanyMember.findFirst({
      where: { companyId: member.companyId, isOwner: true },
      select: { userId: true },
    });
    const ownerId = ownerMember?.userId;

    // Auto-connect: create a network connection between new employee and company owner
    if (ownerId && ownerId !== userId) {
      try {
        // Use the lowercase tradesConnection model (the active one)

        // Check if connection already exists
        const existing = await prisma.tradesConnection.findFirst({
          where: {
            OR: [
              { requesterId: userId, addresseeId: ownerId },
              { requesterId: ownerId, addresseeId: userId },
            ],
          },
        });

        if (!existing) {
          await prisma.tradesConnection.create({
            data: {
              requesterId: userId,
              addresseeId: ownerId,
              status: "accepted",
              message: `Auto-connected when joining ${companyName}`,
              connectedAt: new Date(),
            },
          });

          logger.info("[Seats] Auto-connected new employee to company owner", {
            userId,
            ownerId,
            companyId: member.companyId,
          });
        }
      } catch (connErr) {
        // Don't fail the whole accept if auto-connect fails
        logger.warn("[Seats] Auto-connect failed (non-blocking):", connErr);
      }
    }

    // Also auto-connect with all other active employees in the company
    try {
      const otherMembers = await prisma.tradesCompanyMember.findMany({
        where: {
          companyId: member.companyId,
          status: "active",
          userId: { not: userId, notIn: [ownerId || ""] },
        },
        select: { userId: true },
      });

      for (const otherMember of otherMembers) {
        if (!otherMember.userId) continue;
        try {
          const existing = await prisma.tradesConnection.findFirst({
            where: {
              OR: [
                { requesterId: userId, addresseeId: otherMember.userId },
                { requesterId: otherMember.userId, addresseeId: userId },
              ],
            },
          });

          if (!existing) {
            await prisma.tradesConnection.create({
              data: {
                requesterId: userId,
                addresseeId: otherMember.userId,
                status: "accepted",
                message: `Auto-connected as ${companyName} teammates`,
                connectedAt: new Date(),
              },
            });
          }
        } catch {
          // Skip individual connection errors
        }
      }

      logger.info("[Seats] Auto-connected with team members", {
        userId,
        teamSize: otherMembers.length,
        companyId: member.companyId,
      });
    } catch (teamConnErr) {
      logger.warn("[Seats] Team auto-connect failed (non-blocking):", teamConnErr);
    }

    logger.info("[Seats] Seat accepted", {
      userId,
      memberId: member.id,
      companyId: member.companyId,
      companyName,
    });

    return NextResponse.json({
      success: true,
      message: `Welcome to ${companyName}!`,
      companyName,
    });
  } catch (error: unknown) {
    logger.error("[Seats] Accept seat error:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
});
