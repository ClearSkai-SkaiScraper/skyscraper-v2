import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { RetailJobWizard } from "./RetailJobWizard";

export const dynamic = "force-dynamic";

export default async function NewRetailJobPage() {
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

  return (
    <PageContainer maxWidth="5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Retail Job</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Set up a new out-of-pocket, financed, or repair job
        </p>
      </div>
      <RetailJobWizard orgId={orgId} />
    </PageContainer>
  );
}
