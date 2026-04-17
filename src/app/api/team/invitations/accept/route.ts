export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRole } from "@/lib/auth/roleCompare";
import { prismaMaybeModel } from "@/lib/db/prismaModel";
import { sendWelcomeEmail } from "@/lib/email/invitations";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Use prismaMaybeModel for optional tables that may not be in schema
const Activity = prismaMaybeModel("claim_activities");

/**
 * Team Invitation Acceptance
 *
 * CRITICAL: This route creates BOTH:
 *   1. team_members row (raw SQL table for team features)
 *   2. user_organizations row (Prisma canonical membership — ALL org resolvers depend on this)
 *
 * Without #2, the user will be auto-onboarded into a separate empty org
 * and never actually join the inviting organization.
 *
 * NOTE: We use raw auth() instead of withAuth here because the accepting user
 * may not have any org membership yet (which withAuth/resolveOrg requires).
 */

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth check (raw Clerk — user may have no org yet) ──────────
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // ── 2. Find the pending invitation (raw SQL table) ────────────────
    const invitations = await prisma.$queryRaw<
      Array<{
        id: string;
        org_id: string;
        role: string;
        token: string;
        status: string;
        email: string;
        expires_at: Date;
      }>
    >`
      SELECT id, org_id, role, token, status, email, expires_at
      FROM team_invitations
      WHERE token = ${token} AND status = 'pending' AND expires_at > NOW()
      LIMIT 1
    `;

    const invitation = invitations[0] ?? null;

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });
    }

    // ── 2b. Verify accepting user's email matches the invitation ──────
    const { clerkClient } = await import("@clerk/nextjs/server");
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmails = clerkUser.emailAddresses.map((e) => e.emailAddress.toLowerCase());

    if (!userEmails.includes(invitation.email.toLowerCase())) {
      logger.warn(
        "[INVITE_ACCEPT] Email mismatch — user tried to accept invite for different email",
        {
          userId,
          inviteEmail: invitation.email,
          userEmails,
        }
      );
      return NextResponse.json(
        {
          error:
            "This invitation was sent to a different email address. Please sign in with the correct account.",
        },
        { status: 403 }
      );
    }

    // ── 3. Check if user already has canonical membership ─────────────
    const existingMembership = await prisma.user_organizations.findFirst({
      where: {
        userId: userId,
        organizationId: invitation.org_id,
      },
    });

    if (existingMembership) {
      // Already a member — just mark the invite as accepted and return success
      await prisma.$executeRaw`
        UPDATE team_invitations SET status = 'accepted', accepted_at = NOW(), accepted_by = ${userId}
        WHERE id = ${invitation.id}
      `;
      return NextResponse.json({
        success: true,
        orgId: invitation.org_id,
        role: existingMembership.role || invitation.role,
        message: "You are already a member of this organization",
      });
    }

    // ── 4. Verify the org exists in DB ────────────────────────────────
    const org = await prisma.org.findUnique({
      where: { id: invitation.org_id },
      select: { id: true, name: true, clerkOrgId: true },
    });

    if (!org) {
      logger.error("[INVITE_ACCEPT] Invitation points to non-existent org", {
        invitationId: invitation.id,
        orgId: invitation.org_id,
      });
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const orgName = org.name || "Your Organization";

    // Map invite role to canonical role
    const canonicalRole =
      isAdminRole(invitation.role) || invitation.role === "org:admin" ? "ADMIN" : "MEMBER";

    // ── 5. Create CANONICAL membership (user_organizations) ───────────
    // THIS IS THE CRITICAL FIX: Without this row, safeOrgContext/resolveOrg
    // will never find this user's membership and they'll get auto-onboarded
    // into a separate empty org instead.
    await prisma.user_organizations.create({
      data: {
        id: createId(),
        userId: userId,
        organizationId: org.id,
        role: canonicalRole,
      },
    });

    logger.info("[INVITE_ACCEPT] ✅ Created user_organizations membership", {
      userId,
      orgId: org.id,
      role: canonicalRole,
    });

    // ── 6. Also create team_members row (raw SQL) for team features ───
    await prisma.$executeRaw`
      INSERT INTO team_members (id, org_id, user_id, role, joined_at, updated_at)
      VALUES (${createId()}, ${org.id}, ${userId}, ${invitation.role}, NOW(), NOW())
      ON CONFLICT (org_id, user_id) DO NOTHING
    `;

    // ── 7. Upsert users row + set legacy orgId linkage ───────────────
    // Brand-new signups have no `users` row yet (webhook-populated lazily).
    // Without this upsert, downstream resolvers that read `users.orgId` will
    // miss this user and fall through to auto-creating a phantom org.
    try {
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? invitation.email;
      const displayName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null;
      // Map our role string to the Role enum allowed by prisma schema
      const usersRoleEnum = canonicalRole === "ADMIN" ? "ADMIN" : "USER";
      await prisma.$executeRaw`
        INSERT INTO users ("id", "clerkUserId", "email", "name", "orgId", "role")
        VALUES (${createId()}, ${userId}, ${email}, ${displayName}, ${org.id}, ${usersRoleEnum}::"Role")
        ON CONFLICT ("clerkUserId") DO UPDATE
          SET "orgId" = CASE
                WHEN users."orgId" IS NULL OR users."orgId" = '' OR users."orgId" LIKE 'org_%'
                  THEN EXCLUDED."orgId"
                ELSE users."orgId"
              END,
              "email" = COALESCE(users.email, EXCLUDED.email)
      `;
    } catch (err) {
      logger.warn("[INVITE_ACCEPT] users upsert failed (non-fatal):", err);
    }

    // ── 8. Mark invitation as accepted ────────────────────────────────
    await prisma.$executeRaw`
      UPDATE team_invitations SET status = 'accepted', accepted_at = NOW(), accepted_by = ${userId}
      WHERE id = ${invitation.id}
    `;

    // ── 9. Activity log (soft-fail) ──────────────────────────────────
    if (Activity) {
      try {
        await Activity.create({
          data: {
            org_id: org.id,
            user_id: userId,
            action: "team_member_joined",
            description: `User joined the team via invitation`,
            metadata: { invitationId: invitation.id, role: invitation.role },
          },
        });
      } catch (activityError) {
        logger.warn("Failed to log activity:", activityError);
      }
    }

    // ── 10. Send welcome email (soft-fail) ────────────────────────────
    try {
      // Reuse clerkUser fetched during email verification (step 2b)
      const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
      const userName = clerkUser.firstName
        ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
        : userEmail || "User";

      if (userEmail) {
        await sendWelcomeEmail({
          to: userEmail,
          name: userName,
          orgName,
          role: invitation.role,
        });
        logger.debug(`✅ Welcome email sent to ${userEmail}`);
      }
    } catch (emailError) {
      logger.error("Failed to send welcome email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      orgId: org.id,
      role: canonicalRole,
    });
  } catch (error) {
    logger.error("Failed to accept invitation:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
