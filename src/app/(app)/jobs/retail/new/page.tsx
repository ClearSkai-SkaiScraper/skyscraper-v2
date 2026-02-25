import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";

import { RetailJobWizard } from "./RetailJobWizard";

export const dynamic = "force-dynamic";

export default async function NewRetailJobPage() {
  let orgId = "";
  try {
    const orgResult = await getActiveOrgContext({ required: true });
    if (!orgResult.ok) {
      redirect("/sign-in");
    }
    orgId = orgResult.orgId;
  } catch (error: unknown) {
    // redirect() throws a special error that must be re-thrown
    if (error && typeof error === "object" && "digest" in error) throw error;
    logger.error("[NewRetailJobPage] Org context error:", error);
    redirect("/sign-in");
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
