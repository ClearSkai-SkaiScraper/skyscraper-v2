/**
 * Diagnose org resolution - step by step
 * GET /api/public/diag-org?clerkUserId=xxx
 */
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clerkUserId =
    req.nextUrl.searchParams.get("clerkUserId") || req.nextUrl.searchParams.get("userId");

  if (!clerkUserId) {
    return NextResponse.json({
      ok: false,
      error: "Missing clerkUserId query param",
      usage: "/api/public/diag-org?clerkUserId=user_xxx",
    });
  }

  const steps: any[] = [];

  try {
    // Step 1: Check user_organizations by userId (Clerk user ID)
    const membership = await prisma.user_organizations.findFirst({
      where: { userId: clerkUserId },
      select: { id: true, userId: true, organizationId: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    steps.push({
      step: "1_findMembership",
      query: { where: { userId: clerkUserId } },
      result: membership,
    });

    // Step 2: If membership found, verify org exists
    if (membership?.organizationId) {
      const org = await prisma.org.findUnique({
        where: { id: membership.organizationId },
        select: { id: true, name: true, clerkOrgId: true },
      });

      steps.push({
        step: "2_verifyOrg",
        orgId: membership.organizationId,
        exists: !!org,
        org,
      });
    }

    // Step 3: Check users table
    const user = await prisma.users.findFirst({
      where: {
        OR: [{ id: clerkUserId }, { clerkUserId: clerkUserId }],
      },
      select: { id: true, clerkUserId: true, orgId: true, email: true },
    });

    steps.push({
      step: "3_findUser",
      result: user,
    });

    // Step 4: List all memberships for comparison
    const allMemberships = await prisma.user_organizations.findMany({
      where: { userId: { startsWith: "user_" } },
      select: { userId: true, organizationId: true, role: true },
      take: 10,
    });

    steps.push({
      step: "4_allMemberships",
      count: allMemberships.length,
      sample: allMemberships.slice(0, 5),
    });

    return NextResponse.json({
      ok: true,
      clerkUserId,
      resolution: membership?.organizationId
        ? { ok: true, orgId: membership.organizationId, source: "membership" }
        : { ok: false, reason: "NO_MEMBERSHIP" },
      steps,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Internal server error", steps }, { status: 500 });
  }
}
