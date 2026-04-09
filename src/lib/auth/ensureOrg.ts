/**
 * Auto-onboarding helper
 * Creates org + membership for users who don't have one
 */

/* eslint-disable no-restricted-imports */
import { auth, currentUser } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

function makeDefaultOrgName(clerkUser: Awaited<ReturnType<typeof currentUser>>): string {
  if (!clerkUser) return "My Organization";
  const full = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
  return (
    full || clerkUser.username || clerkUser.emailAddresses?.[0]?.emailAddress || "My Organization"
  );
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 50);
}

export async function ensureActiveOrgForUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { ok: false as const, reason: "SIGNED_OUT" };

  // 1) Find DB user record - try both id and clerkUserId
  let dbUser = await prisma.users.findFirst({
    where: {
      OR: [{ id: clerkUserId }, { clerkUserId: clerkUserId }],
    },
    select: { id: true, orgId: true },
  });

  // If no user found, create one
  if (!dbUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) return { ok: false as const, reason: "NO_CLERK_USER" };

    // We need to create the user with an org, so we'll defer user creation until after org creation
    // For now, set dbUser to null and handle in the transaction below
    const tempEmail = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    const tempName = makeDefaultOrgName(clerkUser);

    // Create org + user together in transaction
    const name = makeDefaultOrgName(clerkUser);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.org.create({
        data: {
          id: crypto.randomUUID(),
          clerkOrgId: `auto_${clerkUserId}`,
          name,
          demoMode: false,
          updatedAt: new Date(),
        },
        select: { id: true },
      });

      const newUser = await tx.users.create({
        data: {
          id: clerkUserId,
          clerkUserId: clerkUserId,
          email: tempEmail,
          name: tempName,
          orgId: org.id,
        },
        select: { id: true, orgId: true },
      });

      await tx.user_organizations.create({
        data: {
          userId: newUser.id,
          organizationId: org.id,
          role: "OWNER",
        },
      });

      return { user: newUser, orgId: org.id };
    });

    return { ok: true as const, orgId: result.orgId, userDbId: result.user.id, created: true };
  }

  // 2) If already has an org (legacy field), return it
  if (dbUser.orgId) {
    return { ok: true as const, orgId: dbUser.orgId, userDbId: dbUser.id };
  }

  // 3) If membership exists AND org exists, set orgId and return
  const memberships = await prisma.user_organizations.findMany({
    where: { userId: dbUser.id },
    include: { Org: { select: { id: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Find first membership with a valid org
  const validMembership = memberships.find((m) => m.organizationId && m.Org);
  if (validMembership?.organizationId) {
    await prisma.users.update({
      where: { id: dbUser.id },
      data: { orgId: validMembership.organizationId },
    });
    return { ok: true as const, orgId: validMembership.organizationId, userDbId: dbUser.id };
  }

  // Clean up orphaned memberships
  const orphanedMemberships = memberships.filter((m) => m.organizationId && !m.Org);
  if (orphanedMemberships.length > 0) {
    logger.warn("[ensureOrg] Cleaning up orphaned memberships:", {
      userId: dbUser.id,
      orphanedCount: orphanedMemberships.length,
    });
    await prisma.user_organizations.deleteMany({
      where: {
        userId: dbUser.id,
        organizationId: { in: orphanedMemberships.map((m) => m.organizationId) },
      },
    });
  }

  // 4) Create org + membership
  const clerkUser = await currentUser();
  const name = makeDefaultOrgName(clerkUser);

  const created = await prisma.$transaction(async (tx) => {
    const org = await tx.org.create({
      data: {
        id: crypto.randomUUID(),
        clerkOrgId: `auto_${dbUser!.id}`,
        name,
        demoMode: false,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    await tx.user_organizations.create({
      data: {
        userId: dbUser!.id,
        organizationId: org.id,
        role: "OWNER",
      },
    });

    await tx.users.update({
      where: { id: dbUser!.id },
      data: { orgId: org.id },
    });

    return org.id;
  });

  return { ok: true as const, orgId: created, userDbId: dbUser.id, created: true };
}
