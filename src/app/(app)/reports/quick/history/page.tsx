// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { CheckCircle2, ChevronDown, ClipboardList, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getToolHistory } from "@/lib/activity";

export const metadata = {
  title: "Quick PDF History • SkaiScraper",
};

export default async function QuickPDFHistoryPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const history = await getToolHistory(user.id, "quick_pdf", 50);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Quick PDF History</h1>
          <p className="mt-2 text-slate-700 dark:text-slate-300">
            View all your Quick PDF generations and token usage
          </p>
        </div>
        <Link href="/reports/quick" className="text-sm text-blue-600 hover:underline">
          ← Back to Quick PDF
        </Link>
      </div>

      {history.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-700 dark:text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-[color:var(--text)]">No Quick PDFs yet</h3>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Generate your first Quick PDF to see it here
          </p>
          <Button asChild>
            <Link href="/reports/quick">Create Quick PDF</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((run) => {
            const input = typeof run.input === "string" ? JSON.parse(run.input) : run.input;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const output = typeof run.output === "string" ? JSON.parse(run.output) : run.output;

            return (
              <Card key={run.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                        #{run.id}
                      </span>
                      {run.status === "success" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          <XCircle className="h-3 w-3" />
                          Error
                        </span>
                      )}
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {run.tokens_used || 0} tokens
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Clock className="h-4 w-4" />
                      {new Date(run.created_at).toLocaleString()}
                    </div>

                    {input && (
                      <details className="mt-3 text-sm">
                        <summary className="flex cursor-pointer items-center gap-1 text-[color:var(--text)] hover:text-[color:var(--text)]">
                          <ChevronDown className="h-4 w-4" />
                          Input Data
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded bg-[var(--surface-2)] p-3 text-xs">
                          {JSON.stringify(input, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
