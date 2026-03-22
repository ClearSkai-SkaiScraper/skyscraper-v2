export const dynamic = "force-dynamic";

// MODULE 4: Approvals - List approvals for claim
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const claimId = params.id;

  try {
    // B-18: Verify access — use org-scoped query to avoid timing side-channel
    if (orgId) {
      // Pro user — verify claim belongs to org directly (no TOCTOU)
      const claim = await prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: { claimNumber: true },
      });

      if (!claim) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Get job for this claim using claim_number
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
    } else {
      // Client user — verify claim access via email
      const user = await currentUser();
      const userEmail = user?.emailAddresses?.[0]?.emailAddress;
      if (!userEmail) {
        return NextResponse.json({ error: "No email found" }, { status: 400 });
      }

      const clientAccess = await prisma.client_access.findFirst({
        where: { email: userEmail, claimId },
      });

      if (!clientAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

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
    }
  } catch (error) {
    logger.error("[APPROVALS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
