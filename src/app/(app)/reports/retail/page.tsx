import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { safeRetailContext } from "@/lib/db/safeRetailContext";
import { safeOrgContext } from "@/lib/safeOrgContext";

import RetailProposalClient from "./RetailProposalClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RetailProposalPage({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated" || !ctx.orgId) {
    return <NoOrgMembershipBanner title="Retail Proposals" />;
  }
  const orgId = ctx.orgId;
  const { leads, claims } = await safeRetailContext(orgId);

  return <RetailProposalClient leads={leads as any} claims={claims as any} />;
}

// End of file
