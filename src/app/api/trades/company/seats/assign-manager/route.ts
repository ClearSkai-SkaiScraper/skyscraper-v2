import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────
// Cycle Detection: walk up the manager chain from `startId` to see if
// assigning `managerId` would create a loop (A→B→C→A).
// Max depth of 20 prevents infinite loops on corrupt data.
// ──────────────────────────────────────────────────────────────────────
async function wouldCreateCycle(
  memberId: string,
  proposedManagerId: string,
  companyId: string
): Promise<boolean> {
  const MAX_DEPTH = 20;
  let currentId: string | null = proposedManagerId;
  const visited = new Set<string>();

  for (let i = 0; i < MAX_DEPTH && currentId; i++) {
    if (currentId === memberId) return true; // cycle detected
    if (visited.has(currentId)) return false; // already visited, no cycle to us
    visited.add(currentId);

    const node = await prisma.tradesCompanyMember.findFirst({
      where: { id: currentId },
      select: { managerId: true, companyId: true },
    });

    // If node doesn't exist or left the company, chain is broken — no cycle
    if (!node || node.companyId !== companyId) return false;
    currentId = node.managerId;
  }

  return false; // exhausted depth — treat as no cycle
}

/**
 * POST /api/trades/company/seats/assign-manager
 * Assigns a manager to a team member or promotes a member to manager
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();

    if (ctx.status === "unauthenticated" || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { memberId, managerId, makeManager } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // Get the current user's membership
    const currentMember = await prisma.tradesCompanyMember.findFirst({
      where: { userId: ctx.userId },
      select: { companyId: true, isAdmin: true, isOwner: true },
    });

    if (!currentMember?.companyId) {
      return NextResponse.json({ error: "No company found" }, { status: 403 });
    }

    // Only admins/owners can manage hierarchy
    if (!currentMember.isAdmin && !currentMember.isOwner) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Verify the target member belongs to the same company
    const targetMember = await prisma.tradesCompanyMember.findFirst({
      where: { id: memberId },
      select: { companyId: true, firstName: true, lastName: true },
    });

    if (!targetMember || targetMember.companyId !== currentMember.companyId) {
      return NextResponse.json({ error: "Member not found in your company" }, { status: 404 });
    }

    // If promoting to manager
    if (makeManager !== undefined) {
      await prisma.tradesCompanyMember.update({
        where: { id: memberId },
        data: {
          isManager: makeManager,
          role: makeManager ? "manager" : "member",
          updatedAt: new Date(),
        },
      });

      logger.info("[assign-manager] Updated manager status", {
        memberId,
        isManager: makeManager,
      });

      return NextResponse.json({
        success: true,
        message: makeManager ? "Member promoted to manager" : "Manager role removed",
      });
    }

    // If assigning to a manager
    if (managerId !== undefined) {
      // Validate manager exists and is a manager
      if (managerId) {
        const manager = await prisma.tradesCompanyMember.findFirst({
          where: { id: managerId },
          select: { companyId: true, isManager: true, firstName: true, lastName: true },
        });

        if (!manager || manager.companyId !== currentMember.companyId) {
          return NextResponse.json({ error: "Manager not found in your company" }, { status: 404 });
        }

        // Prevent self-assignment
        if (managerId === memberId) {
          return NextResponse.json(
            { error: "Cannot assign member as their own manager" },
            { status: 400 }
          );
        }

        // Prevent manager cycles (A→B→A, A→B→C→A, etc.)
        const cycleDetected = await wouldCreateCycle(memberId, managerId, currentMember.companyId);
        if (cycleDetected) {
          return NextResponse.json(
            { error: "Cannot assign this manager — it would create a circular reporting chain" },
            { status: 400 }
          );
        }

        // Auto-promote to manager if not already
        if (!manager.isManager) {
          await prisma.tradesCompanyMember.update({
            where: { id: managerId },
            data: { isManager: true, role: "manager", updatedAt: new Date() },
          });
        }
      }

      await prisma.tradesCompanyMember.update({
        where: { id: memberId },
        data: {
          managerId: managerId || null,
          updatedAt: new Date(),
        },
      });

      logger.info("[assign-manager] Updated manager assignment", {
        memberId,
        managerId,
      });

      return NextResponse.json({
        success: true,
        message: managerId ? "Manager assigned successfully" : "Manager removed",
      });
    }

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[assign-manager] Error:", error);
    return NextResponse.json(
      { error: "Failed to update manager assignment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trades/company/seats/assign-manager
 * Gets the org chart / manager hierarchy for the company
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();

    if (ctx.status === "unauthenticated" || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentMember = await prisma.tradesCompanyMember.findFirst({
      where: { userId: ctx.userId },
      select: { companyId: true },
    });

    if (!currentMember?.companyId) {
      return NextResponse.json({ error: "No company found" }, { status: 403 });
    }

    // Fetch all members with their manager relationships
    const members = await prisma.tradesCompanyMember.findMany({
      where: {
        companyId: currentMember.companyId,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        role: true,
        isAdmin: true,
        isOwner: true,
        isManager: true,
        managerId: true,
        avatar: true,
        profilePhoto: true,
      },
      orderBy: [
        { isOwner: "desc" },
        { isAdmin: "desc" },
        { isManager: "desc" },
        { firstName: "asc" },
      ],
    });

    // Build hierarchy structure
    const managers = members.filter((m) => m.isManager || m.isAdmin || m.isOwner);
    const hierarchy = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Unknown",
      email: m.email,
      title: m.title || m.role || "Member",
      isAdmin: m.isAdmin,
      isOwner: m.isOwner,
      isManager: m.isManager,
      managerId: m.managerId,
      avatarUrl: m.avatar || m.profilePhoto,
      directReports: members.filter((d) => d.managerId === m.id).map((d) => d.id),
    }));

    return NextResponse.json({
      success: true,
      members: hierarchy,
      managers: managers.map((m) => ({
        id: m.id,
        name: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "Unknown",
      })),
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error("[assign-manager] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch hierarchy" },
      { status: 500 }
    );
  }
}
