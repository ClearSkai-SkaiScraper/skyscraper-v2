// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { CompanySettingsClient } from "./CompanySettingsClient";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const ctx = await safeOrgContext();
  if (!ctx.orgId || ctx.status !== "ok") {
    redirect("/");
  }

  const org = await prisma.org.findUnique({ where: { id: ctx.orgId } });
  if (!org) redirect("/");

  // Get the user's trades profile scoped to current org context
  const profile = await prisma.tradesCompanyMember.findFirst({
    where: { userId, company: { orgId: ctx.orgId } },
  });

  return (
    <div className="container max-w-4xl py-8">
      <div className="space-y-6">
        <PageHero
          section="settings"
          title="Company Settings"
          subtitle="Manage your company profile and public information"
          icon={<Building2 className="h-6 w-6" />}
        />

        <CompanySettingsClient org={org} profile={profile} />
      </div>
    </div>
  );
}
