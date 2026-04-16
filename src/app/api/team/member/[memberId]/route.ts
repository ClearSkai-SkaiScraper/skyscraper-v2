export const dynamic = "force-dynamic";

/**
 * Team Member Profile API Route
 * Master Prompt #56: Professional Identity and Gamification Framework
 *
 * GET: Fetch member profile data
 * PATCH: Update profile fields
 */

import { NextRequest, NextResponse } from "next/server";

import { isAdminRole } from "@/lib/auth/roleCompare";
import { withAdmin, withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const GET = withAuth(
  async (
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    { userId, orgId, role: authRole },
    params: { params: { memberId: string } }
  ) => {
    try {
      const rl = await checkRateLimit(userId, "API");
      if (!rl.success) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", message: "Too many requests" },
          { status: 429 }
        );
      }

      let member: Record<string, unknown> | null = null;
      try {
        member = await prisma.users.findFirst({
          where: {
            id: params.params.memberId,
            orgId: orgId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            clerkUserId: true,
            headshot_url: true,
            role: true,
          },
        });
      } catch (e) {
        // If column missing in DB, retry without headshotUrl and log
        if (
          typeof e?.message === "string" &&
          (e.message.includes("headshot_url") || e.message.includes("public_skills"))
        ) {
          logger.warn("[GET team member] headshot_url column missing - retrying without select");
          member = await prisma.users.findFirst({
            where: { id: params.params.memberId, orgId: orgId },
            select: {
              id: true,
              name: true,
              email: true,
              clerkUserId: true,
              role: true,
            },
          });
        } else {
          throw e;
        }
      }

      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      return NextResponse.json(member);
    } catch (error) {
      logger.error("GET /api/team/member/[memberId] error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);

export const PATCH = withAuth(
  async (
    req: NextRequest,
    { userId, orgId, role: authRole },
    params: { params: { memberId: string } }
  ) => {
    try {
      const rl = await checkRateLimit(userId, "API");
      if (!rl.success) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", message: "Too many requests" },
          { status: 429 }
        );
      }

      const body = await req.json();
      const { headshot_url, name } = body;

      // Verify member belongs to organization
      const member = await prisma.users.findFirst({
        where: {
          id: params.params.memberId,
          orgId: orgId,
        },
        select: { id: true, clerkUserId: true },
      });

      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      const isSelf = member.clerkUserId === userId;
      const isOrgAdmin = isAdminRole(authRole);
      if (!isSelf && !isOrgAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Update profile
      let updated: Record<string, unknown> | null = null;
      try {
        updated = await prisma.users.update({
          where: { id: params.params.memberId },
          data: {
            ...(headshot_url !== undefined && { headshot_url }),
            ...(name !== undefined && { name }),
          },
          select: {
            id: true,
            name: true,
            email: true,
            headshot_url: true,
            role: true,
          },
        });
      } catch (e) {
        if (typeof e?.message === "string" && e.message.includes("headshot_url")) {
          logger.warn("[PATCH team member] headshot_url column missing - retrying without it");
          updated = await prisma.users.update({
            where: { id: params.params.memberId },
            data: {
              ...(name !== undefined && { name }),
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          });
        } else {
          throw e;
        }
      }
      return NextResponse.json({ success: true, member: updated });
    } catch (error) {
      logger.error("PATCH /api/team/member/[memberId] error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);

/**
 * PUT: Update member role
 */
export const PUT = withAdmin(
  async (
    req: NextRequest,
    { userId, orgId, role: authRole },
    params: { params: { memberId: string } }
  ) => {
    try {
      const rl = await checkRateLimit(userId, "API");
      if (!rl.success) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", message: "Too many requests" },
          { status: 429 }
        );
      }

      // Only admins/owners can change roles
      const isOrgAdmin = isAdminRole(authRole);
      if (!isOrgAdmin) {
        return NextResponse.json({ error: "Only admins can change member roles" }, { status: 403 });
      }

      const body = await req.json();
      const { role: newRole } = body;

      if (
        !newRole ||
        !["ADMIN", "USER", "MANAGER", "PM", "INSPECTOR", "BILLING", "VENDOR"].includes(
          newRole.toUpperCase()
        )
      ) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      // Verify member belongs to organization
      const member = await prisma.users.findFirst({
        where: {
          id: params.params.memberId,
          orgId: orgId,
        },
        select: { id: true, clerkUserId: true },
      });

      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      // Prevent changing own role (safety check)
      if (member.clerkUserId === userId) {
        return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
      }

      // Update role
      const updated = await prisma.users.update({
        where: { id: params.params.memberId },
        data: { role: newRole.toUpperCase() },
        select: { id: true, role: true },
      });

      return NextResponse.json({ success: true, member: updated });
    } catch (error) {
      logger.error("PUT /api/team/member/[memberId] error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);

/**
 * DELETE: Remove member from organization
 */
export const DELETE = withAdmin(
  async (
    req: NextRequest,
    { userId, orgId, role: authRole },
    params: { params: { memberId: string } }
  ) => {
    try {
      const rl = await checkRateLimit(userId, "API");
      if (!rl.success) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", message: "Too many requests" },
          { status: 429 }
        );
      }

      // Only admins/owners can remove members
      const role = typeof authRole === "string" ? authRole.toLowerCase() : "";
      const isOrgAdmin = role === "owner" || role === "admin";
      if (!isOrgAdmin) {
        return NextResponse.json({ error: "Only admins can remove team members" }, { status: 403 });
      }

      // Verify member belongs to organization
      const member = await prisma.users.findFirst({
        where: {
          id: params.params.memberId,
          orgId: orgId,
        },
        select: { id: true, clerkUserId: true, email: true },
      });

      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      // Prevent removing yourself
      if (member.clerkUserId === userId) {
        return NextResponse.json(
          { error: "Cannot remove yourself from the team" },
          { status: 400 }
        );
      }

      // Delete the user from the organization
      await prisma.users.delete({
        where: { id: params.params.memberId },
      });

      return NextResponse.json({
        success: true,
        message: `Member ${member.email} removed from team`,
      });
    } catch (error) {
      logger.error("DELETE /api/team/member/[memberId] error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);
