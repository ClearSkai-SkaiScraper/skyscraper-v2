/**
 * Broken User Repair API
 *
 * POST /api/admin/repair-user
 *
 * Per AI advisor: "Since you've had org-state bugs already, make a small admin action for:
 *   - clear stale active org
 *   - refresh memberships
 *   - clear pending invite cache/state
 *   - resync Clerk/org metadata"
 *
 * Requires admin role.
 */

export const dynamic = "force-dynamic";

import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logCriticalAction } from "@/lib/audit/criticalActions";
import { withAdmin } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface RepairAction {
  action:
    | "clear_active_org"
    | "refresh_memberships"
    | "clear_invites"
    | "resync_metadata"
    | "full_repair";
  targetUserId?: string; // If not provided, repairs current user
}

export const POST = withAdmin(async (req: NextRequest, { orgId, userId: adminUserId }) => {
  try {
    const body = (await req.json()) as RepairAction;
    const { action, targetUserId } = body;

    // Default to current user if no target specified
    const userId = targetUserId || adminUserId;

    logger.info(`[REPAIR_USER] Admin ${adminUserId} initiating ${action} for user ${userId}`);

    const results: Record<string, unknown> = {
      userId,
      action,
      timestamp: new Date().toISOString(),
      repairs: [],
    };

    const repairs: string[] = [];

    // ─── Clear Active Org ───
    if (action === "clear_active_org" || action === "full_repair") {
      try {
        // Try to clear Clerk's active org metadata
        try {
          const client = await clerkClient();
          const clerkUser = await client.users.getUser(userId);
          await client.users.updateUser(userId, {
            publicMetadata: {
              ...clerkUser.publicMetadata,
              activeOrgId: null,
            },
          });
          repairs.push("Cleared activeOrgId in Clerk metadata");
        } catch (clerkErr) {
          logger.warn("[REPAIR_USER] Could not update Clerk metadata:", clerkErr);
          repairs.push("Could not clear Clerk metadata (non-critical)");
        }

        await logCriticalAction("ACTIVE_ORG_CLEARED", userId, orgId, { adminUserId });
      } catch (err) {
        logger.error("[REPAIR_USER] Failed to clear active org:", err);
        repairs.push(`Error clearing active org: ${err}`);
      }
    }

    // ─── Refresh Memberships ───
    if (action === "refresh_memberships" || action === "full_repair") {
      try {
        // Fetch current memberships from Clerk
        const client = await clerkClient();
        const clerkMemberships = await client.users.getOrganizationMembershipList({
          userId,
        });

        const clerkOrgIds = new Set(clerkMemberships.data.map((m) => m.organization.id));

        // Get DB memberships
        const dbMemberships = await prisma.user_organizations.findMany({
          where: { userId },
          select: { organizationId: true },
        });
        const dbOrgIds = new Set(dbMemberships.map((m) => m.organizationId));

        // Remove stale DB memberships (not in Clerk)
        const staleOrgIds = [...dbOrgIds].filter((id) => !clerkOrgIds.has(id));
        if (staleOrgIds.length > 0) {
          await prisma.user_organizations.deleteMany({
            where: { userId, organizationId: { in: staleOrgIds } },
          });
          repairs.push(`Removed ${staleOrgIds.length} stale memberships from DB`);
        }

        // Add missing DB memberships (in Clerk but not DB)
        const missingOrgIds = [...clerkOrgIds].filter((id) => !dbOrgIds.has(id));
        for (const orgIdToAdd of missingOrgIds) {
          const membership = clerkMemberships.data.find((m) => m.organization.id === orgIdToAdd);
          if (membership) {
            await prisma.user_organizations.upsert({
              where: { userId_organizationId: { userId, organizationId: orgIdToAdd } },
              create: {
                userId,
                organizationId: orgIdToAdd,
                role: membership.role === "org:admin" ? "admin" : "member",
              },
              update: {
                role: membership.role === "org:admin" ? "admin" : "member",
              },
            });
          }
        }
        if (missingOrgIds.length > 0) {
          repairs.push(`Added ${missingOrgIds.length} missing memberships to DB`);
        }

        repairs.push(`Synced ${clerkOrgIds.size} memberships total`);
        await logCriticalAction("MEMBERSHIP_CLEARED", userId, orgId, {
          adminUserId,
          staleRemoved: staleOrgIds.length,
          missingAdded: missingOrgIds.length,
        });
      } catch (err) {
        logger.error("[REPAIR_USER] Failed to refresh memberships:", err);
        repairs.push(`Error refreshing memberships: ${err}`);
      }
    }

    // ─── Clear Pending Invites ───
    if (action === "clear_invites" || action === "full_repair") {
      try {
        // Get user email
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const email = user.primaryEmailAddress?.emailAddress;

        if (email) {
          // Revoke Clerk invitations (if any)
          try {
            const invitations = await client.invitations.getInvitationList();
            const userInvites = invitations.data.filter(
              (inv) => inv.emailAddress === email && inv.status === "pending"
            );
            for (const inv of userInvites) {
              await client.invitations.revokeInvitation(inv.id);
            }
            if (userInvites.length > 0) {
              repairs.push(`Revoked ${userInvites.length} Clerk invitations`);
            }
          } catch {
            repairs.push("Could not access Clerk invitations (non-critical)");
          }
        }
      } catch (err) {
        logger.error("[REPAIR_USER] Failed to clear invites:", err);
        repairs.push(`Error clearing invites: ${err}`);
      }
    }

    // ─── Resync Metadata ───
    if (action === "resync_metadata" || action === "full_repair") {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);

        // Get actual org membership from Clerk
        const memberships = await client.users.getOrganizationMembershipList({ userId });
        const firstMembership = memberships.data[0];

        // Update Clerk metadata with correct state
        await client.users.updateUser(userId, {
          publicMetadata: {
            ...user.publicMetadata,
            activeOrgId: firstMembership?.organization.id || null,
            role: firstMembership?.role || null,
            lastRepaired: new Date().toISOString(),
          },
        });
        repairs.push("Resynced Clerk publicMetadata");

        await logCriticalAction("USER_REPAIRED", userId, orgId, { adminUserId, action });
      } catch (err) {
        logger.error("[REPAIR_USER] Failed to resync metadata:", err);
        repairs.push(`Error resyncing metadata: ${err}`);
      }
    }

    results.repairs = repairs;
    results.success = true;

    logger.info("[REPAIR_USER] Completed:", results);

    return NextResponse.json(results);
  } catch (error) {
    logger.error("[REPAIR_USER] Error:", error);
    return NextResponse.json(
      { error: "Failed to repair user", details: String(error) },
      { status: 500 }
    );
  }
});

/**
 * GET /api/admin/repair-user?userId=xxx
 *
 * Diagnose user state without making changes
 */
export const GET = withAdmin(async (req: NextRequest, { userId: adminUserId }) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const targetUserId = searchParams.get("userId") || adminUserId;

    const client = await clerkClient();

    // Fetch from Clerk
    const clerkUser = await client.users.getUser(targetUserId);
    const clerkMemberships = await client.users.getOrganizationMembershipList({
      userId: targetUserId,
    });

    // Fetch from DB
    const dbMemberships = await prisma.user_organizations.findMany({
      where: { userId: targetUserId },
      include: { Org: { select: { name: true } } },
    });

    return NextResponse.json({
      userId: targetUserId,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      clerk: {
        id: clerkUser.id,
        publicMetadata: clerkUser.publicMetadata,
        memberships: clerkMemberships.data.map((m) => ({
          orgId: m.organization.id,
          orgName: m.organization.name,
          role: m.role,
        })),
      },
      database: {
        memberships: dbMemberships.map((m) => ({
          orgId: m.organizationId,
          orgName: m.Org?.name,
          role: m.role,
        })),
      },
      diagnosis: {
        hasClerkMemberships: clerkMemberships.data.length > 0,
        hasDbMemberships: dbMemberships.length > 0,
        clerkDbMismatch: clerkMemberships.data.length !== dbMemberships.length,
      },
    });
  } catch (error) {
    logger.error("[REPAIR_USER_DIAGNOSE] Error:", error);
    return NextResponse.json(
      { error: "Failed to diagnose user", details: String(error) },
      { status: 500 }
    );
  }
});
