export const dynamic = "force-dynamic";

/**
 * Team Invitations API
 * Uses Clerk's native organization invitation system
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
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

/**
 * Helper to get the Clerk organization ID from the DB org ID.
 * If the org doesn't have a real Clerk org yet (i.e., clerkOrgId is a deterministic ID),
 * create one and update the DB.
 */
async function getOrCreateClerkOrg(dbOrgId: string, userId: string): Promise<string | null> {
  const org = await prisma.org.findUnique({
    where: { id: dbOrgId },
    select: { id: true, name: true, clerkOrgId: true },
  });

  if (!org) return null;

  const clerkOrgId = org.clerkOrgId;

  // If clerkOrgId looks like a real Clerk org (starts with "org_" and is longer than 20 chars),
  // verify it exists in Clerk. Real Clerk org IDs are like "org_2abc..." (28+ chars)
  if (clerkOrgId && clerkOrgId.startsWith("org_") && clerkOrgId.length > 20) {
    try {
      const client = await clerkClient();
      await client.organizations.getOrganization({ organizationId: clerkOrgId });
      return clerkOrgId; // Verified to exist
    } catch (e: any) {
      // Org doesn't exist in Clerk - fall through to create
      logger.warn("[TEAM_INVITATIONS] Clerk org not found, will create:", clerkOrgId);
    }
  }

  // Either no clerkOrgId, or it's a deterministic ID, or the Clerk org doesn't exist
  // Create a new Clerk organization
  try {
    const client = await clerkClient();
    const newClerkOrg = await client.organizations.createOrganization({
      name: org.name || "My Organization",
      createdBy: userId,
    });

    // Update DB with the real Clerk org ID
    await prisma.org.update({
      where: { id: dbOrgId },
      data: { clerkOrgId: newClerkOrg.id },
    });

    logger.info("[TEAM_INVITATIONS] Created Clerk org for team invites:", newClerkOrg.id);
    return newClerkOrg.id;
  } catch (createError: any) {
    logger.error("[TEAM_INVITATIONS] Failed to create Clerk org:", createError);
    return null;
  }
}

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

    // CRITICAL: Get or create the Clerk org for team invites
    const clerkOrgId = await getOrCreateClerkOrg(orgId, userId);
    if (!clerkOrgId) {
      logger.error("[TEAM_INVITATIONS] Failed to get/create Clerk org for DB org:", orgId);
      return NextResponse.json(
        { error: "Unable to set up team invitations. Please try again or contact support." },
        { status: 500 }
      );
    }

    const client = await clerkClient();

    // Use Clerk's native invitation system
    try {
      const invitation = await client.organizations.createOrganizationInvitation({
        organizationId: clerkOrgId, // Use Clerk org ID, not DB UUID
        emailAddress: email.toLowerCase(),
        role: role === "admin" ? "org:admin" : "org:member",
        inviterUserId: userId,
      });

      logger.debug(`✅ Invitation sent to ${email} via Clerk (clerkOrgId: ${clerkOrgId})`);

      return NextResponse.json({
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.emailAddress,
          role: invitation.role,
          status: invitation.status,
        },
      });
    } catch (clerkError: any) {
      logger.error("Clerk invitation error:", clerkError);

      // Handle duplicate invitation
      if (clerkError.errors?.[0]?.code === "duplicate_record") {
        return NextResponse.json(
          { error: "Invitation already sent to this email" },
          { status: 409 }
        );
      }

      // Handle organization not found in Clerk
      if (clerkError.errors?.[0]?.code === "resource_not_found") {
        logger.error("[TEAM_INVITATIONS] Clerk org not found:", clerkOrgId);
        return NextResponse.json(
          {
            error:
              "Organization not found in authentication system. Please complete company setup first.",
          },
          { status: 400 }
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

    // Get the Clerk org ID - don't create if it doesn't exist (just listing)
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { clerkOrgId: true },
    });
    const clerkOrgId = org?.clerkOrgId;

    // If no real Clerk org, return empty array
    if (!clerkOrgId || !clerkOrgId.startsWith("org_") || clerkOrgId.length <= 20) {
      return NextResponse.json([]); // No real Clerk org yet
    }

    const client = await clerkClient();

    // Get pending invitations from Clerk
    try {
      const invitations = await client.organizations.getOrganizationInvitationList({
        organizationId: clerkOrgId, // Use Clerk org ID
      });

      const formattedInvitations = invitations.data.map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
      }));

      return NextResponse.json(formattedInvitations);
    } catch (clerkError: any) {
      // Handle organization not found - return empty array
      if (clerkError.errors?.[0]?.code === "resource_not_found") {
        return NextResponse.json([]);
      }
      throw clerkError;
    }
  } catch (error) {
    logger.error("Failed to fetch invitations:", error);
    return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
  }
});
