export const dynamic = "force-dynamic";

// MODULE 4: Approvals - List approvals for claim
import { auth, currentUser } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claimId = params.id;

  try {
    // Verify access (pro or client)
    const proUser = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (proUser) {
      // Pro user - verify claim ownership
      const claim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: { orgId: true },
      });

      if (!claim || claim.orgId !== proUser.orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // Client user - verify claim access via email
      const user = await currentUser();
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      if (!userEmail) {
        return NextResponse.json({ error: "No email found" }, { status: 400 });
      }

      const clientAccess = await prisma.client_access.findFirst({
        where: {
          email: userEmail,
          claimId,
        },
      });

      if (!clientAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get job for this claim (crm_jobs uses claim_number, not claim_id)
    // First we need to get the claim's claim_number
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { claimNumber: true },
    });

    if (!claim) {
      return NextResponse.json({ approvals: [] });
    }

    const job = await prisma.crm_jobs.findFirst({
      where: { claim_number: claim.claimNumber },
      select: { id: true },
    });

    if (!job) {
      return NextResponse.json({ approvals: [] });
    }

    const approvals = await prisma.carrier_approvals.findMany({
      where: { job_id: job.id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    logger.error("[APPROVALS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
