// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getToolHistory } from "@/lib/activity";
import { PATHS } from "@/lib/paths";

export const metadata = { title: "Damage Builder History • SkaiScraper" };

export default async function DamageBuilderHistoryPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const records = await getToolHistory(user.id, "damage-complete", 100);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex items-center gap-4">
        <Link
          href={PATHS.DASHBOARD}
          className="rounded-md border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[color:var(--text)] hover:bg-[var(--surface-2)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
            Damage Builder History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">View all past damage analysis runs</p>
        </div>
      </div>

      {records.length === 0 && (
        <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <p className="text-slate-700 dark:text-slate-300">No damage analysis history yet</p>
          <Button asChild className="mt-4 bg-red-600 hover:bg-red-700">
            <Link href={PATHS.AI_DAMAGE_BUILDER}>Run Your First Analysis</Link>
          </Button>
        </div>
      )}

      {records.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[var(--surface-2)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Findings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Lead/Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-[var(--surface-1)]">
              {records.map((record) => {
                const meta = record.metadata || {};
                const status = record.status || "completed";

                return (
                  <tr key={record.id} className="hover:bg-[var(--surface-2)]">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[color:var(--text)]">
                      {new Date(record.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {meta.findingsCount || 0} findings
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {record.tokensUsed || 0}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {meta.leadId || meta.jobId || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          status === "completed"
                            ? "bg-green-100 text-green-800"
                            : status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-[var(--surface-1)] text-[color:var(--text)]"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
