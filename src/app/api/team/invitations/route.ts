export const dynamic = "force-dynamic";

/**
 * Team Invitations API
 * Sends invitation emails via Resend and stores tokens in DB
 */

import { currentUser } from "@clerk/nextjs/server";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createForbiddenResponse, requirePermission } from "@/lib/auth/rbac";
import { withManager } from "@/lib/auth/withAuth";
import { sendInvitationEmail } from "@/lib/email/invitations";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const invitationSchema = z.object({
  email: z.string().email("A valid email is required"),
  role: z.enum(["org:member", "org:admin", "admin", "member"]).optional().default("org:member"),
  message: z.string().optional(),
});

// Send team invitation email via Resend (NOT Clerk - we control email delivery)
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
    const { email, role = "org:member", message } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Get org details
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, clerkOrgId: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get inviter details
    const user = await currentUser();
    const inviterName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "A team member"
      : "A team member";

    // Check for existing pending invitation
    const existingInvite = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM team_invitations 
      WHERE org_id = ${orgId} AND email = ${normalizedEmail} AND status = 'pending'
      LIMIT 1
    `.catch(() => []);

    if (existingInvite.length > 0) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email address" },
        { status: 409 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store invitation in DB
    await prisma.$executeRaw`
      INSERT INTO team_invitations (id, org_id, email, role, token, status, invited_by, message, expires_at, created_at, updated_at)
      VALUES (
        ${crypto.randomUUID()},
        ${orgId},
        ${normalizedEmail},
        ${role === "admin" || role === "org:admin" ? "admin" : "member"},
        ${token},
        'pending',
        ${userId},
        ${message || null},
        ${expiresAt},
        NOW(),
        NOW()
      )
    `;

    // Send email via Resend
    try {
      await sendInvitationEmail({
        to: normalizedEmail,
        inviterName,
        orgName: org.name || "the team",
        role: role === "admin" || role === "org:admin" ? "Admin" : "Member",
        token,
        message,
      });

      logger.info(`✅ Team invitation email sent to ${normalizedEmail} via Resend`);

      return NextResponse.json({
        success: true,
        invitation: {
          id: token.slice(0, 8), // Return partial token as ID
          email: normalizedEmail,
          role: role === "admin" || role === "org:admin" ? "admin" : "member",
          status: "pending",
        },
      });
    } catch (emailError: any) {
      logger.error("[TEAM_INVITATIONS] Failed to send email:", emailError);

      // Clean up the DB entry if email fails
      await prisma.$executeRaw`
        DELETE FROM team_invitations WHERE token = ${token}
      `.catch((e) => {
        logger.warn(
          `[TEAM_INVITATIONS] Failed to cleanup invitation after email failure: ${e?.message}`
        );
      });

      return NextResponse.json(
        { error: `Failed to send invitation email: ${emailError.message || "Unknown error"}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error("Failed to send invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invitation" },
      { status: 500 }
    );
  }
});

// Get all pending invitations for the org from DB
export const GET = withManager(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    // Get pending invitations from DB
    const invitations = await prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        created_at: Date;
        expires_at: Date;
      }>
    >`
      SELECT id, email, role, status, created_at, expires_at
      FROM team_invitations
      WHERE org_id = ${orgId} AND status = 'pending' AND expires_at > NOW()
      ORDER BY created_at DESC
    `.catch(() => []);

    const formattedInvitations = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      createdAt: inv.created_at,
      expiresAt: inv.expires_at,
    }));

    return NextResponse.json(formattedInvitations);
  } catch (error) {
    logger.error("Failed to fetch invitations:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
});
