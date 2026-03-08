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

    // Resolve submitter names
    const claimsWithNames = await Promise.all(
      claims.map(async (claim) => {
        let submittedBy = "";
        if (claim.jobValueSubmittedBy) {
          const user = await prisma.users
            .findFirst({
              where: { clerkUserId: claim.jobValueSubmittedBy },
              select: { name: true },
            })
            .catch(() => null);
          submittedBy = user?.name || "";
        }
        return { ...claim, submittedBy };
      })
    );

    return NextResponse.json({ claims: claimsWithNames });
  } catch (error) {
    logger.error("[PENDING_APPROVALS] Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
