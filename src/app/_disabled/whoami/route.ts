/**
 * Debug current auth state - shows exactly who you're logged in as
 * GET /api/public/whoami
 */
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get Clerk auth state
    const { userId, orgId: clerkOrgId } = await auth();
    const clerkUser = await currentUser();

    if (!userId) {
      return NextResponse.json({
        ok: false,
        error: "NOT_AUTHENTICATED",
        message: "You are not logged in to Clerk",
        solution: "Go to /sign-in to log in",
      });
    }

    // Check memberships for this user
    const memberships = await prisma.user_organizations.findMany({
      where: { userId },
      select: { organizationId: true, role: true, createdAt: true },
    });

    // Check if user exists in users table
    const dbUser = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { id: true, email: true, name: true, orgId: true },
    });

    // Get claims for their orgs
    const orgIds = memberships.map((m) => m.organizationId);
    const claimCount =
      orgIds.length > 0 ? await prisma.claims.count({ where: { orgId: { in: orgIds } } }) : 0;

    return NextResponse.json({
      ok: true,
      clerkAuth: {
        userId,
        clerkOrgId,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" "),
      },
      database: {
        userRecord: dbUser,
        memberships,
        membershipCount: memberships.length,
        claimCount,
      },
      diagnosis:
        memberships.length === 0
          ? "NO_MEMBERSHIPS - Need to run /api/public/db-fix?userId=" + userId
          : "OK - Has " + memberships.length + " org membership(s)",
      fixUrl: `/api/public/db-fix?userId=${userId}`,
    });
  } catch (_error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
