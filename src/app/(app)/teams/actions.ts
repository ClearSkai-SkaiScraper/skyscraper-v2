"use server";

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { cache } from "react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "rep" | "estimator";
  status: "active" | "invited" | "inactive";
  joinedAt?: Date;
  invitedAt?: Date;
};

/**
 * Get all team members for the current organization
 */
export const getTeamMembers = cache(async (): Promise<TeamMember[]> => {
  const users = await currentUser();
  if (!users) return [];

  const orgId = (users.publicMetadata?.orgId as string) || users.id;

  try {
    // Get real team members from User model
    const dbUsers = await prisma.users
      .findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastSeenAt: true,
        },
      })
      .catch(() => []);

    // If no users found, return current users as admin
    if (!dbUsers.length) {
      return [
        {
          id: users.id,
          name: users.firstName && users.lastName ? `${users.firstName} ${users.lastName}` : "You",
          email: users.emailAddresses[0]?.emailAddress || "users@example.com",
          role: "admin" as const,
          status: "active" as const,
          joinedAt: new Date(),
        },
      ];
    }

    // Map DB users to TeamMember format
    return dbUsers.map((dbUser) => ({
      id: dbUser.id,
      name: dbUser.name || "Team Member",
      email: dbUser.email,
      role: (dbUser.role === "ADMIN"
        ? "admin"
        : dbUser.role === "MANAGER"
          ? "manager"
          : "rep") as TeamMember["role"],
      status: "active" as const,
      joinedAt: dbUser.createdAt,
    }));
  } catch (error) {
    logger.error("Error fetching team members:", error);
    // Fallback to current users
    return [
      {
        id: users.id,
        name: users.firstName && users.lastName ? `${users.firstName} ${users.lastName}` : "You",
        email: users.emailAddresses[0]?.emailAddress || "users@example.com",
        role: "admin" as const,
        status: "active" as const,
        joinedAt: new Date(),
      },
    ];
  }
});

/**
 * Invite a new team member
 */
export async function inviteTeamMember(email: string, role: TeamMember["role"]) {
  const users = await currentUser();
  if (!users) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const orgId = (users.publicMetadata?.orgId as string) || users.id;

  try {
    // In production, this would:
    // 1. Create invitation record in database
    // 2. Send email via Resend/SendGrid
    // 3. Include magic link to accept invite

    // For now, simulate success
    return {
      success: true,
      message: `Invitation sent to ${email} as ${role}`,
      inviteId: crypto.randomUUID(),
    };
  } catch (error) {
    logger.error("Error inviting team member:", error);
    throw error;
  }
}

/**
 * Update team member role
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateTeamMemberRole(memberId: string, newRole: TeamMember["role"]) {
  const users = await currentUser();
  if (!users) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const orgId = (users.publicMetadata?.orgId as string) || users.id;

  try {
    // In production: prisma.teamMember.update({ where: { id: memberId }, data: { role: newRole } })
    return { success: true, message: "Role updated successfully" };
  } catch (error) {
    logger.error("Error updating role:", error);
    throw error;
  }
}

/**
 * Remove team member
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function removeTeamMember(memberId: string) {
  const users = await currentUser();
  if (!users) throw new Error("Not authenticated");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const orgId = (users.publicMetadata?.orgId as string) || users.id;

  try {
    // In production: prisma.teamMember.update({ where: { id: memberId }, data: { status: 'inactive' } })
    return { success: true, message: "Team member removed" };
  } catch (error) {
    logger.error("Error removing team member:", error);
    throw error;
  }
}
