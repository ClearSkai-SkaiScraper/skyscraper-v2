import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Jobs detail page - redirects to the appropriate workspace based on job type
 *
 * - CLAIM jobs with a claimId → redirect to /claims/[claimId]
 * - RETAIL jobs → redirect to /jobs/retail/[id]
 * - Other jobs (leads) → redirect to /leads/[id]
 * - Non-existent jobs → 404
 */
export default async function JobDetailPage({ params }: Props) {
  // SECURITY: Require auth + org context
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgCtx = await safeOrgContext();
  if (!orgCtx.ok) redirect("/onboarding/start");

  const { id } = await params;

  // Fetch the lead/job scoped to this org
  const job = await prisma.leads.findFirst({
    where: { id, orgId: orgCtx.orgId },
    select: {
      id: true,
      jobType: true,
      claimId: true,
    },
  });

  // If job doesn't exist, show 404
  if (!job) {
    notFound();
  }

  // Redirect based on job type
  if (job.claimId) {
    // Claim job - redirect to claims workspace
    redirect(`/claims/${job.claimId}`);
  }

  if (job.jobType === "RETAIL") {
    // Retail job - redirect to retail workspace
    redirect(`/jobs/retail/${job.id}`);
  }

  // Default: redirect to leads workspace
  redirect(`/leads/${job.id}`);
}
