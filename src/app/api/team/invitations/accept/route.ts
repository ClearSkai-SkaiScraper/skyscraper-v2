export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { prismaMaybeModel } from "@/lib/db/prismaModel";
import { sendWelcomeEmail } from "@/lib/email/invitations";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Use prismaMaybeModel for optional tables that may not be in schema
const Activity = prismaMaybeModel("claim_activities");

/** Typed shape for team_invitations (raw SQL table, not in Prisma schema) */
interface TeamInvitation {
  id: string;
  org_id: string;
  role: string;
  token: string;
  status: string;
  expires_at: Date;
}

/** Typed shape for team_members (raw SQL table, not in Prisma schema) */
interface TeamMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
}

/** Extended Prisma client with non-schema team tables */
interface PrismaWithTeamTables {
  team_invitations: {
    findFirst(args: { where: Record<string, unknown> }): Promise<TeamInvitation | null>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<TeamInvitation>;
  };
  team_members: {
    findFirst(args: { where: Record<string, unknown> }): Promise<TeamMember | null>;
    create(args: { data: Record<string, unknown> }): Promise<TeamMember>;
  };
}

const db = prisma as unknown as typeof prisma & PrismaWithTeamTables;

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
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

    // Find invitation (team_invitations is a raw SQL table, not in Prisma schema)
    const invitation = await db.team_invitations.findFirst({
      where: {
        token,
        status: "pending",
        expires_at: { gte: new Date() },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });
    }

    // Check if user is already a member (team_members is a raw SQL table, not in Prisma schema)
    const existingMember = await db.team_members.findFirst({
      where: {
        org_id: invitation.org_id,
        user_id: userId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 409 }
      );
    }

    // Get user and org details
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const org = await client.organizations.getOrganization({
      organizationId: invitation.org_id,
    });

    const userName = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : user.emailAddresses[0]?.emailAddress || "User";
    const orgName = org.name || "Your Organization";
    const userEmail = user.emailAddresses[0]?.emailAddress;

    // Add user to team
    // Create team member
    await db.team_members.create({
      data: {
        id: crypto.randomUUID(),
        org_id: invitation.org_id,
        user_id: userId,
        role: invitation.role,
        joined_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Update invitation status
    await db.team_invitations.update({
      where: { id: invitation.id },
      data: {
        status: "accepted",
        accepted_at: new Date(),
        accepted_by: userId,
      },
    });

    // Create activity log (soft-fail if audit table missing)
    if (Activity) {
      try {
        await Activity.create({
          data: {
            org_id: invitation.org_id,
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

    // Send welcome email
    if (userEmail) {
      try {
        await sendWelcomeEmail({
          to: userEmail,
          name: userName,
          orgName,
          role: invitation.role,
        });
        logger.debug(`✅ Welcome email sent to ${userEmail}`);
      } catch (emailError) {
        logger.error("Failed to send welcome email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      orgId: invitation.org_id,
      role: invitation.role,
    });
  } catch (error) {
    logger.error("Failed to accept invitation:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
});
