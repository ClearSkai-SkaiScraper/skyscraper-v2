import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/trades/company/employees
 * Returns all employees for the current user's company.
 * Used by /trades/company/employees page ("Manage Team").
 */
export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    // Find the user's company membership
    const membership = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
      select: { companyId: true, isAdmin: true, isOwner: true },
    });

    if (!membership?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Only admins/owners can manage employees
    const isAdmin = membership.isAdmin || membership.isOwner;

    // Fetch all company members
    const employees = await prisma.tradesCompanyMember.findMany({
      where: {
        companyId: membership.companyId,
        OR: [{ isActive: true }, { status: "pending" }],
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        role: true,
        avatar: true,
        profilePhoto: true,
        isAdmin: true,
        isOwner: true,
        canEditCompany: true,
        isActive: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const formatted = employees.map((e) => ({
      id: e.id,
      userId: e.userId,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      jobTitle: e.title,
      role: e.isOwner ? "owner" : e.isAdmin ? "admin" : e.role || "member",
      avatar: e.avatar || e.profilePhoto || null,
      isAdmin: e.isAdmin || e.isOwner,
      canEditCompany: e.canEditCompany ?? false,
      status: e.status || "active",
      createdAt: e.createdAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      employees: formatted,
      isAdmin,
      currentUserId: userId,
    });
  } catch (error) {
    logger.error("[GET /api/trades/company/employees] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch employees" },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/trades/company/employees
 * Update an employee's permissions (admin status, edit access, role).
 */
export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const { employeeId, isAdmin, canEditCompany, role } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    // Verify the current user is an admin of the same company
    const currentMember = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
      select: { companyId: true, isAdmin: true, isOwner: true },
    });

    if (!currentMember?.companyId || (!currentMember.isAdmin && !currentMember.isOwner)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Verify the target employee belongs to the same company
    const target = await prisma.tradesCompanyMember.findUnique({
      where: { id: employeeId },
      select: { companyId: true, isOwner: true },
    });

    if (!target || target.companyId !== currentMember.companyId) {
      return NextResponse.json({ error: "Employee not found in your company" }, { status: 404 });
    }

    // Prevent demoting the owner
    if (target.isOwner && isAdmin === false) {
      return NextResponse.json({ error: "Cannot remove admin from company owner" }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (typeof isAdmin === "boolean") updateData.isAdmin = isAdmin;
    if (typeof canEditCompany === "boolean") updateData.canEditCompany = canEditCompany;
    if (role) updateData.role = role;

    await prisma.tradesCompanyMember.update({
      where: { id: employeeId },
      data: updateData,
    });

    logger.info(
      `[PATCH /api/trades/company/employees] User ${userId} updated employee ${employeeId}: ${JSON.stringify(updateData)}`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[PATCH /api/trades/company/employees] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update employee" },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/trades/company/employees?employeeId=xxx
 * Remove an employee from the company.
 */
export const DELETE = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    // Verify the current user is an admin of the same company
    const currentMember = await prisma.tradesCompanyMember.findUnique({
      where: { userId },
      select: { companyId: true, isAdmin: true, isOwner: true },
    });

    if (!currentMember?.companyId || (!currentMember.isAdmin && !currentMember.isOwner)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Verify the target employee belongs to the same company
    const target = await prisma.tradesCompanyMember.findUnique({
      where: { id: employeeId },
      select: { companyId: true, isOwner: true, userId: true },
    });

    if (!target || target.companyId !== currentMember.companyId) {
      return NextResponse.json({ error: "Employee not found in your company" }, { status: 404 });
    }

    // Prevent removing yourself or the owner
    if (target.userId === userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }
    if (target.isOwner) {
      return NextResponse.json({ error: "Cannot remove the company owner" }, { status: 400 });
    }

    // Soft-delete: mark as inactive
    await prisma.tradesCompanyMember.update({
      where: { id: employeeId },
      data: { isActive: false, status: "removed" },
    });

    logger.info(
      `[DELETE /api/trades/company/employees] User ${userId} removed employee ${employeeId}`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[DELETE /api/trades/company/employees] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove employee" },
      { status: 500 }
    );
  }
});
