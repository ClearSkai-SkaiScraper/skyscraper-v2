export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { prismaModel } from "@/lib/db/prismaModel";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Activity model for logging (soft-fail if not available)
const Activity = prismaModel("activities");

export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { id: invitationId } = await routeParams.params;

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

    // Update status to revoked
    await (prisma as any).team_invitations.update({
      where: { id: invitationId },
      data: {
        status: "revoked",
      },
    });

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
            title: "Invitation Revoked",
            description: `Revoked invitation for ${invitation.email}`,
            metadata: { invitationId, email: invitation.email },
            updatedAt: new Date(),
          },
        });
      } catch {
        // Ignore activity log failures
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to revoke invitation:", error);
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
  }
});
