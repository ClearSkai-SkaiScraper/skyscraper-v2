export const dynamic = "force-dynamic";

/**
 * GET /api/claims/pending-approvals
 * Returns all claims with jobValueStatus = "pending" for the org.
 * Used by the bulk approvals page.
 */
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import prisma from "@/lib/prisma";

export async function GET() {
  const authResult = await requireApiAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { orgId } = authResult;
  if (!orgId) {
    return NextResponse.json({ error: "Organization required" }, { status: 400 });
  }

  try {
    const claims = await prisma.claims.findMany({
      where: {
        orgId,
        jobValueStatus: "pending",
      },
      select: {
        id: true,
        title: true,
        claimNumber: true,
        insured_name: true,
        estimatedJobValue: true,
        jobValueStatus: true,
        signingStatus: true,
        jobValueSubmittedAt: true,
        jobValueSubmittedBy: true,
      },
      orderBy: { jobValueSubmittedAt: "desc" },
    });

    // Batch resolve submitter names (N+1 → 2 queries)
    const submitterIds = [
      ...new Set(claims.map((c) => c.jobValueSubmittedBy).filter(Boolean) as string[]),
    ];

    const submitters = submitterIds.length
      ? await prisma.users.findMany({
          where: { clerkUserId: { in: submitterIds } },
          select: { clerkUserId: true, name: true },
        })
      : [];

    const submitterMap = new Map(submitters.map((u) => [u.clerkUserId, u.name]));

    const claimsWithNames = claims.map((claim) => ({
      ...claim,
      submittedBy: submitterMap.get(claim.jobValueSubmittedBy ?? "") || "",
    }));

    return NextResponse.json({ claims: claimsWithNames });
  } catch (error) {
    logger.error("[PENDING_APPROVALS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
