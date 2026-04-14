// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { FilePlus } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getCurrentUserPermissions } from "@/lib/permissions";

import { ClaimIntakeWizard } from "./ClaimIntakeWizard";

export const metadata: Metadata = {
  title: "New Claim | SkaiScraper",
  description: "Create a new insurance claim",
};

export default async function NewClaimPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { orgId } = await getCurrentUserPermissions();
  if (!orgId) {
    redirect("/onboarding");
  }

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="claims"
        icon={<FilePlus className="h-5 w-5" />}
        title="New Claim"
        subtitle="Complete the intake wizard to create a new insurance claim"
        size="compact"
      />
      <div className="mx-auto max-w-4xl">
        <ClaimIntakeWizard orgId={orgId} />
      </div>
    </PageContainer>
  );
}
