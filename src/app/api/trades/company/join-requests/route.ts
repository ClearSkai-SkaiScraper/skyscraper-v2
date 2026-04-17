/**
 * Join Requests API - Handles company join requests
 *
 * GET: List pending join requests for current user's company (admin only)
 * POST: Submit a join request to a company
 * PATCH: Approve or reject a join request (admin only)
 *
 * Uses tradesCompanyMember with status='pending' and pendingCompanyToken to track requests
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAdminRole } from "@/lib/auth/roleCompare";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================================
// GET: List pending join requests (for company admins)
// ============================================================================

export const GET = withAuth(async (req: NextRequest, { userId }) => {
  try {
    // Get user's company (must be admin/owner)
    const membership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: {
        companyId: true,
        role: true,
        isAdmin: true,
        isOwner: true,
      },
    });

    if (!membership?.companyId) {
      return NextResponse.json({ requests: [], message: "No company found" });
    }

    const isAdmin = isAdminRole(membership.role) || membership.isAdmin || membership.isOwner;

    if (!isAdmin) {
      return NextResponse.json({ requests: [], message: "Admin access required" });
    }

    // Find pending join requests
    // pendingCompanyToken format: "join:{companyId}:{random}" for join requests
    const pendingRequests = await prisma.tradesCompanyMember.findMany({
      where: {
        status: "pending",
        pendingCompanyToken: { startsWith: `join:${membership.companyId}:` },
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        title: true,
        avatar: true,
        profilePhoto: true,
        pendingCompanyToken: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: pendingRequests.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Unknown",
        email: r.email,
        jobTitle: r.title,
        avatar: r.avatar || r.profilePhoto,
        requestedAt: r.createdAt,
        token: r.pendingCompanyToken,
      })),
    });
  } catch (error) {
    logger.error("[Join Requests GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

// ============================================================================
// POST: Submit a join request
// ============================================================================

const SubmitRequestSchema = z.object({
  companyId: z.string().uuid(),
  jobTitle: z.string().optional(),
  message: z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const parsed = SubmitRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { companyId, jobTitle } = parsed.data;

    // Check if user already has an active company membership
    const existingMembership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { id: true, companyId: true, status: true, pendingCompanyToken: true, title: true },
    });

    if (existingMembership?.companyId && existingMembership.status === "active") {
      return NextResponse.json(
        { error: "You are already part of a company. Leave first to join another." },
        { status: 400 }
      );
    }

    // Check if user already has a pending request for this company
    // Token format: "join:{companyId}:{random}"
    const existingPendingCompanyId = existingMembership?.pendingCompanyToken?.startsWith("join:")
      ? existingMembership.pendingCompanyToken.split(":")[1]
      : null;

    if (existingPendingCompanyId === companyId && existingMembership?.status === "pending") {
      return NextResponse.json(
        { error: "You already have a pending request for this company." },
        { status: 400 }
      );
    }

    // Verify the target company exists
    const company = await prisma.tradesCompany.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Token format: "join:{companyId}:{randomUUID}" to track which company they're requesting
    const requestToken = `join:${companyId}:${crypto.randomUUID()}`;

    if (existingMembership) {
      // Update existing membership to pending for this company
      await prisma.tradesCompanyMember.update({
        where: { id: existingMembership.id },
        data: {
          pendingCompanyToken: requestToken,
          status: "pending",
          title: jobTitle || existingMembership.title || null,
        },
      });
    } else {
      // Create new membership record as pending
      await prisma.tradesCompanyMember.create({
        data: {
          userId,
          pendingCompanyToken: requestToken,
          status: "pending",
          role: "member",
          title: jobTitle || null,
          onboardingStep: "profile",
          isActive: false,
        },
      });
    }

    logger.info("[Join Request] Submitted", {
      userId,
      companyId,
      companyName: company.name,
      token: requestToken,
    });

    return NextResponse.json({
      success: true,
      message: `Join request sent to ${company.name}`,
      requestToken,
    });
  } catch (error) {
    logger.error("[Join Requests POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

// ============================================================================
// PATCH: Approve or reject a join request (admin only)
// ============================================================================

const HandleRequestSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "reject"]),
  message: z.string().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const parsed = HandleRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { requestId, action } = parsed.data;

    // Get admin's company
    const adminMembership = await prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: {
        companyId: true,
        role: true,
        isAdmin: true,
        isOwner: true,
      },
    });

    if (!adminMembership?.companyId) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const isAdmin =
      isAdminRole(adminMembership.role) || adminMembership.isAdmin || adminMembership.isOwner;

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Find the join request (token format: "join:{companyId}:{random}")
    const request = await prisma.tradesCompanyMember.findFirst({
      where: {
        id: requestId,
        pendingCompanyToken: { startsWith: `join:${adminMembership.companyId}:` },
        status: "pending",
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Approve: Link to company, set active
      await prisma.tradesCompanyMember.update({
        where: { id: requestId },
        data: {
          companyId: adminMembership.companyId,
          pendingCompanyToken: null,
          status: "active",
          isActive: true,
          onboardingStep: "complete",
        },
      });

      logger.info("[Join Request] Approved", {
        requestId,
        userId: request.userId,
        companyId: adminMembership.companyId,
      });

      return NextResponse.json({
        success: true,
        action: "approved",
        message: "Member added to company",
      });
    } else {
      // Reject: Clear pending status, keep member record but unlinked
      await prisma.tradesCompanyMember.update({
        where: { id: requestId },
        data: {
          pendingCompanyToken: null,
          status: "inactive",
        },
      });

      logger.info("[Join Request] Rejected", {
        requestId,
        userId: request.userId,
        companyId: adminMembership.companyId,
      });

      return NextResponse.json({
        success: true,
        action: "rejected",
        message: "Request rejected",
      });
    }
  } catch (error) {
    logger.error("[Join Requests PATCH] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
