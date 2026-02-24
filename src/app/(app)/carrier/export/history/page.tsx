import { currentUser } from "@clerk/nextjs/server";
import { CheckCircle2, ChevronDown, Clock, Package, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getToolHistory } from "@/lib/activity";

export const metadata = {
  title: "Carrier Export History • SkaiScraper",
};

export default async function CarrierExportHistoryPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const history = await getToolHistory(user.id, "carrier_export", 50);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[color:var(--text)]">
            Carrier Export History
          </h1>
          <p className="mt-2 text-slate-700 dark:text-slate-300">
            View all your carrier exports and formats
          </p>
        </div>
        <Link href="/carrier/export" className="text-sm text-blue-600 hover:underline">
          ← Back to Carrier Export
        </Link>
      </div>

      {history.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-slate-700 dark:text-slate-300" />
          <h3 className="mb-2 text-lg font-medium text-[color:var(--text)]">
            No carrier exports yet
          </h3>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Generate your first carrier export to see it here
          </p>
          <Button asChild className="bg-sky-600 hover:bg-sky-700">
            <Link href="/carrier/export">Create Carrier Export</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((run) => {
            const input = typeof run.input === "string" ? JSON.parse(run.input) : run.input;
            const _output = typeof run.output === "string" ? JSON.parse(run.output) : run.output;

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
                      {input?.carrier && (
                        <span className="text-sm font-medium text-[color:var(--text)]">
                          {input.carrier}
                        </span>
                      )}
                      {input?.format && (
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          ({input.format})
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <Clock className="h-4 w-4" />
                      {new Date(run.created_at).toLocaleString()}
                    </div>

                    {input && (
                      <details className="mt-3 text-sm">
                        <summary className="flex cursor-pointer items-center gap-1 text-[color:var(--text)] hover:text-[color:var(--text)]">
                          <ChevronDown className="h-4 w-4" />
                          Export Details
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
