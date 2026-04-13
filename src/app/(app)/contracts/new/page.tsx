// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, FileSignature } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { getCurrentUserPermissions } from "@/lib/permissions";

import { ContractBuilderClient } from "./ContractBuilderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Contract | SkaiScraper",
  description: "Upload and manage a new contract document",
};

export default async function NewContractPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();

  if (!orgId) {
    return <NoOrgMembershipBanner title="New Contract" />;
  }

  return (
    <PageContainer maxWidth="5xl">
      <div className="mb-6">
        <Link
          href="/contracts"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contracts
        </Link>
      </div>

      <PageHero
        section="reports"
        title="New Contract"
        subtitle="Upload a contract document and send for e-signature"
        icon={<FileSignature className="h-6 w-6" />}
      />

      <div className="mt-8">
        <ContractBuilderClient orgId={orgId} userId={user.id} />
      </div>
    </PageContainer>
  );
}
