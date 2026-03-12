export const dynamic = "force-dynamic";

/**
 * Team Invitations API
 * Uses Clerk's native organization invitation system
 */

import { logger } from "@/lib/logger";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createForbiddenResponse, requirePermission } from "@/lib/auth/rbac";
import { withManager } from "@/lib/auth/withAuth";
import { checkRateLimit } from "@/lib/rate-limit";

const invitationSchema = z.object({
  email: z.string().email("A valid email is required"),
  role: z.enum(["org:member", "org:admin", "admin", "member"]).optional().default("org:member"),
});

// Send team invitation email via Clerk
// 🛡️ MASTER PROMPT #66: RBAC Protection - requires "team:invite" permission
export const POST = withManager(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    // 🛡️ RBAC: Check permission to invite team members
    try {
      await requirePermission("team:invite");
    } catch (error) {
      logger.warn("[TEAM_INVITATIONS] Permission denied", {
        userId,
        orgId,
        requiredPermission: "team:invite",
      });
      return createForbiddenResponse("You don't have permission to invite team members");
    }

    const body = await req.json();
    const parsed = invitationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { email, role = "org:member" } = parsed.data;

    const client = await clerkClient();

    // Use Clerk's native invitation system
    try {
      const invitation = await client.organizations.createOrganizationInvitation({
        organizationId: orgId,
        emailAddress: email.toLowerCase(),
        role: role === "admin" ? "org:admin" : "org:member",
        inviterUserId: userId,
      });

      logger.debug(`✅ Invitation sent to ${email} via Clerk`);

      return NextResponse.json({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.emailAddress,
          role: invitation.role,
          status: invitation.status,
        },
      });
    } catch (clerkError) {
      logger.error("Clerk invitation error:", clerkError);

      // Handle duplicate invitation
      if (clerkError.errors?.[0]?.code === "duplicate_record") {
        return NextResponse.json(
          { error: "Invitation already sent to this email" },
          { status: 409 }
        );
      }

      throw clerkError;
    }
  } catch (error) {
    logger.error("Failed to send invitation:", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
});

// Get all pending invitations for the org via Clerk
export const GET = withManager(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const client = await clerkClient();

    // Get pending invitations from Clerk
    const invitations = await client.organizations.getOrganizationInvitationList({
      organizationId: orgId,
    });

    const formattedInvitations = invitations.data.map((inv) => ({
      id: inv.id,
      email: inv.emailAddress,
      role: inv.role,
      status: inv.status,
      createdAt: inv.createdAt,
    }));

    return NextResponse.json(formattedInvitations);
  } catch (error) {
    logger.error("Failed to fetch invitations:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
});
