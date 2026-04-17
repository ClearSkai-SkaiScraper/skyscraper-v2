export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { roleIn } from "@/lib/auth/roleCompare";
import { withAuth } from "@/lib/auth/withAuth";
import { prismaModel } from "@/lib/db/prismaModel";
import { sendInvitationEmail } from "@/lib/email/invitations";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Activity model for logging (soft-fail if not available)
const Activity = prismaModel("activities");

export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const { id: invitationId } = await routeParams.params;

    // Find invitation (team_invitations is a raw SQL table, not in Prisma schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invitation = await (prisma as any).team_invitations.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Verify it belongs to this org
    if (invitation.org_id !== orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if already accepted or revoked
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot resend invitation with status: ${invitation.status}` },
        { status: 400 }
      );
    }

    // Extend expiration by 7 more days
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).team_invitations.update({
      where: { id: invitationId },
      data: {
        expires_at: newExpiresAt,
      },
    });

    // Actually resend the invitation email via Resend
    try {
      await sendInvitationEmail({
        to: invitation.email,
        inviterName: "Your team admin",
        orgName: "the team",
        role: roleIn(invitation.role, ["admin", "org:admin", "owner", "ADMIN", "OWNER"]) ? "Admin" : "Member",
        token: invitation.token,
      });
      logger.info(`📧 Invitation resent to ${invitation.email} via Resend`);
    } catch (emailErr) {
      logger.error(`[INVITE_RESEND] Failed to send email to ${invitation.email}:`, emailErr);
      return NextResponse.json({ error: "Failed to send invitation email" }, { status: 500 });
    }

    // Log activity (soft-fail if audit table missing)
    if (Activity) {
      try {
        await Activity.create({
          data: {
            id: crypto.randomUUID(),
            orgId: orgId,
            userId: userId,
            userName: "System",
            type: "team",
            title: "Invitation Resent",
            description: `Resent invitation to ${invitation.email}`,
            metadata: { invitationId, email: invitation.email },
            updatedAt: new Date(),
          },
        });
      } catch {
        // Ignore activity log failures
      }
    }

    return NextResponse.json({
      success: true,
      // eslint-disable-next-line no-restricted-syntax
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`,
    });
  } catch (error) {
    logger.error("Failed to resend invitation:", error);
    return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 });
  }
});
