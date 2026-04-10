import { auth } from "@clerk/nextjs/server";
import { Settings } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { PageHero } from "@/components/layout/PageHero";
import { checkRole } from "@/lib/auth/rbac";
import { getOrCreateCurrentOrganization } from "@/lib/organizations";
import { getCurrentUserPermissions } from "@/lib/permissions";

import LeadsSettingsClient from "./LeadsSettingsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads Settings | SkaiScraper",
  description: "Configure lead pipeline routing and automation.",
};

export default async function LeadsSettingsPage() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/leads/settings");
  }

  // Require manager role (admins implicitly pass)
  const { hasAccess, role } = await checkRole("manager");

  const permissions = await getCurrentUserPermissions();
  const org = await getOrCreateCurrentOrganization({ requireOrg: false, bootstrapIfMissing: true });
  const orgId = org?.id || permissions.orgId;
  const needsInitialization = permissions.needsInitialization ?? false;

  if (needsInitialization || !orgId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Initialize Lead Pipeline</h1>
        <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">
          We need to finish organization setup before configuring lead intake.
        </p>
        <a
          href="/onboarding/start"
          className="inline-block rounded bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white"
        >
          🚀 Complete Onboarding
        </a>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied requiredRole="manager" currentRole={role} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <PageHero
        section="jobs"
        title="Lead Pipeline Configuration"
        subtitle="Fine‑tune how prospects enter, advance, and convert inside your organization."
        icon={<Settings className="h-6 w-6" />}
      />
      <LeadsSettingsClient orgId={orgId} />
    </div>
  );
}
