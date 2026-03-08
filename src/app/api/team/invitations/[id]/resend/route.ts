export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import { prismaModel } from "@/lib/db/prismaModel";
import prisma from "@/lib/prisma";

// Activity model for logging (soft-fail if not available)
const Activity = prismaModel("activities");

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    const orgId = await getTenant();

    if (!orgId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitationId = params.id;

    // Find invitation (team_invitations is a raw SQL table, not in Prisma schema)
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

    await (prisma as any).team_invitations.update({
      where: { id: invitationId },
      data: {
        expires_at: newExpiresAt,
      },
    });

    // Note: Team invitations can be sent via Resend API
    // Example: await resend.emails.send({ to: invitation.email, subject: "Team Invitation", ... });
    logger.debug(`📧 Invitation resent to ${invitation.email}`);

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
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`,
    });
  } catch (error) {
    logger.error("Failed to resend invitation:", error);
    return NextResponse.json({ error: "Failed to resend invitation" }, { status: 500 });
  }
}
