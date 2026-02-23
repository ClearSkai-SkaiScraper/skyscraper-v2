import prisma from "@/lib/db/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClaimAppealClient from "./ClaimAppealClient";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadClaims(orgId: string) {
  return prisma.claims.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    select: { id: true, claimNumber: true, damageType: true, dateOfLoss: true },
    take: 50,
  });
}

export default async function AppealBuilderPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const ctx = await safeOrgContext();
  if (ctx.status !== "ok" || !ctx.orgId) redirect("/sign-in");
  const orgId = ctx.orgId;
  const claims = await loadClaims(orgId);
  const initialClaimId =
    searchParams.claimId && claims.find((c) => c.id === searchParams.claimId)
      ? searchParams.claimId
      : undefined;
  return (
    <Suspense fallback={<div className="p-6">Loading appeal builder...</div>}>
      <ClaimAppealClient claims={claims as any} initialClaimId={initialClaimId} />
    </Suspense>
  );
}
