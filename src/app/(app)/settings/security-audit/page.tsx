/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
import { Shield } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

async function runAudit(orgId: string) {
  try {
    const res = await fetch(`/api/agents/security-audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, windowHours: 24 }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function SecurityAuditPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") {
    redirect("/sign-in");
  }
  // HOTFIX: Disable Safe Mode in development
  // eslint-disable-next-line no-restricted-syntax
  const isDev = process.env.NODE_ENV !== "production";
  const safeMode = isDev ? false : ctx.status !== "ok" || !ctx.orgId;
  if (safeMode && !ctx.orgId) logger.warn("[SecurityAuditPage] Safe mode due to missing orgId");
  const audit = safeMode ? null : await runAudit(ctx.orgId!);
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <PageHero
        section="settings"
        title="Security Audit"
        subtitle={
          safeMode
            ? "Workspace not initialized – audit engine disabled."
            : "Automated snapshot of recent security posture."
        }
        icon={<Shield className="h-6 w-6" />}
      />
      {safeMode && (
        <div className="mt-2 inline-flex items-center gap-2 rounded border border-yellow-400/40 bg-yellow-50 px-3 py-1 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
          <span>⚠️ Safe Mode:</span>
          <span>Initialize workspace to enable security audit data.</span>
        </div>
      )}
      {!audit && (
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8">
          <h2 className="mb-2 text-xl font-semibold">
            {safeMode ? "Audit Disabled" : "Audit Unavailable"}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {safeMode
              ? "Initialize workspace to run audits."
              : "Could not retrieve audit results. Try again later."}
          </p>
        </div>
      )}
      {audit && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-5">
              <div className="mb-1 text-xs text-slate-700 dark:text-slate-300">Organization</div>
              <div className="font-mono text-sm">{audit.orgId}</div>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-5">
              <div className="mb-1 text-xs text-slate-700 dark:text-slate-300">Score</div>
              <div className="text-2xl font-bold">{audit.score}</div>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-5">
              <div className="mb-1 text-xs text-slate-700 dark:text-slate-300">Window</div>
              <div className="text-sm">Last 24 hours</div>
            </div>
          </div>
          <section className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
            <h3 className="mb-4 text-lg font-semibold">Suggestions</h3>
            <ul className="space-y-2">
              {audit.suggestions.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[var(--primary)]">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
            <h3 className="mb-4 text-lg font-semibold">Anomalies ({audit.anomalies.length})</h3>
            {audit.anomalies.length === 0 && (
              <p className="text-sm text-slate-700 dark:text-slate-300">No anomalies detected.</p>
            )}
            <ul className="space-y-3">
              {audit.anomalies.map((a: any, i: number) => (
                <li
                  key={i}
                  className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] p-3 text-sm"
                >
                  <div className="font-medium">{a.type}</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300">{a.description}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
