export const dynamic = "force-dynamic";

import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { compose, withRateLimit, withSentryApi } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/rbac";
import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";

const TeamInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "basic_member", "org:member"]).default("basic_member"),
});

/**
 * POST /api/teams/invite — Send a Clerk organization invitation
 * Requires manager+ role.
 */
const basePOST = async (req: Request) => {
  const roleCheck = await requireRole("MANAGER");
  if (roleCheck instanceof NextResponse) return roleCheck;
  const { orgId, userId } = roleCheck;

  const body = await req.json();
  const { email, role } = TeamInviteSchema.parse(body);

  try {
    const clerk = await clerkClient();
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role,
      inviterUserId: userId,
    });

    logger.info("[TEAMS_INVITE] Invitation sent", { orgId, email, role });
    return NextResponse.json(
      {
        id: invitation.id,
        email: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status,
        createdAt: invitation.createdAt,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send invitation";
    logger.error("[TEAMS_INVITE] Error", { orgId, email, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

/**
 * GET /api/teams/invite — List pending Clerk organization invitations
 */
const baseGET = async () => {
  const roleCheck = await requireRole("MANAGER");
  if (roleCheck instanceof NextResponse) return roleCheck;
  const { orgId } = roleCheck;

  try {
    const clerk = await clerkClient();
    const { data: invitations } = await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list invitations";
    logger.error("[TEAMS_INVITE_LIST] Error", { orgId, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

const wrap = compose(withSentryApi, withRateLimit);
export const POST = withOrgScope(wrap(basePOST));
export const GET = withOrgScope(wrap(baseGET));
