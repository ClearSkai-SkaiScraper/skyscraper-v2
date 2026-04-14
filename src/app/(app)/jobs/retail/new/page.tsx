import { Hammer } from "lucide-react";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { RetailJobWizard } from "./RetailJobWizard";

export const dynamic = "force-dynamic";

type JobCategory = "out_of_pocket" | "financed" | "repair";
const VALID_CATEGORIES: JobCategory[] = ["out_of_pocket", "financed", "repair"];

export default async function NewRetailJobPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  let orgId = "";
  try {
    const orgResult = await safeOrgContext();
    if (!orgResult.ok) {
      return <NoOrgMembershipBanner title="Create Retail Job" />;
    }
    orgId = orgResult.orgId;
  } catch (error: unknown) {
    // redirect() throws a special error that must be re-thrown
    if (error && typeof error === "object" && "digest" in error) throw error;
    logger.error("[NewRetailJobPage] Org context error:", error);
    return <NoOrgMembershipBanner title="Create Retail Job" />;
  }

  const params = await searchParams;
  const initialCategory =
    params.category && VALID_CATEGORIES.includes(params.category as JobCategory)
      ? (params.category as JobCategory)
      : undefined;

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="jobs"
        title="Create Retail Job"
        subtitle="Set up a new out-of-pocket, financed, or repair job"
        icon={<Hammer className="h-5 w-5" />}
        size="compact"
      />
      <div className="mx-auto max-w-4xl">
        <RetailJobWizard orgId={orgId} initialCategory={initialCategory} />
      </div>
    </PageContainer>
  );
}
