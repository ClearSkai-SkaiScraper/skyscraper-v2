import { auth } from "@clerk/nextjs/server";
import { Settings } from "lucide-react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { PageHero } from "@/components/layout/PageHero";
import { checkRole } from "@/lib/auth/rbac";
import { getOrCreateCurrentOrganization } from "@/lib/organizations";
import { getCurrentUserPermissions } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads Settings | PreLoss Vision",
  description: "Placeholder for lead pipeline configuration.",
};

export default async function LeadsSettingsPage() {
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

  const sections: Array<{ title: string; description: string; items: string[] }> = [
    {
      title: "Lead Sources",
      description: "Manage inbound channels and attribution tracking.",
      items: ["Webform embeds", "Manual entry", "CSV import", "Partner referrals"],
    },
    {
      title: "Pipeline Stages",
      description: "Customize progression for qualification and conversion.",
      items: ["New", "Contacted", "Qualified", "Estimate Sent", "Won / Lost"],
    },
    {
      title: "Routing & Automation",
      description: "Rules that auto-assign leads and trigger notifications.",
      items: [
        "Geo-based assignment",
        "Service type routing",
        "Idle lead reminders",
        "Escalation thresholds",
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <PageHero
        section="jobs"
        title="Lead Pipeline Configuration"
        subtitle="Fine‑tune how prospects enter, advance, and convert inside your organization."
        icon={<Settings className="h-6 w-6" />}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-5 shadow-sm transition-shadow hover:shadow"
          >
            <h2 className="mb-1 text-lg font-semibold">{s.title}</h2>
            <p className="mb-3 text-xs text-slate-700 dark:text-slate-300">{s.description}</p>
            <ul className="ml-4 list-disc space-y-1 text-xs">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <div className="mt-4 text-right">
              <button className="rounded bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white">
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-[color:var(--border)] p-6 text-center">
        <p className="mb-2 text-sm">Advanced features coming soon:</p>
        <p className="text-xs text-slate-700 dark:text-slate-300">
          Custom SLA timers • Duplicate detection • Multi-touch attribution • AI qualification
          scoring
        </p>
      </div>
    </div>
  );
}
