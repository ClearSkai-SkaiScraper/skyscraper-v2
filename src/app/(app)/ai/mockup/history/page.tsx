import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, CheckCircle, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";

export default async function MockupHistoryPage() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const orgId = (user.publicMetadata?.orgId as string) || user.id;

  // Query GeneratedArtifact for mockup history (the actual table the API writes to)
  const history = await prisma.generatedArtifact.findMany({
    where: { orgId, type: "mockup" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link
          href="/ai/mockup"
          className="flex items-center gap-2 text-sm text-slate-700 hover:text-[color:var(--text)] dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to AI Mockup
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[color:var(--text)]">AI Mockup History</h1>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          View all your AI Mockup generations
        </p>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-12 text-center">
            <div className="mb-4 text-4xl">📸</div>
            <h3 className="text-lg font-semibold text-[color:var(--text)]">No mockups yet</h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Generate your first AI mockup to see it here
            </p>
            <Button asChild className="mt-4 inline-flex items-center bg-sky-600 hover:bg-sky-700">
              <Link href="/ai/mockup">Create Mockup</Link>
            </Button>
          </div>
        ) : (
          history.map((artifact) => {
            const meta = (artifact.metadata as any) || {};
            return (
              <div
                key={artifact.id}
                className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-sm transition-shadow hover:shadow"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  {/* Thumbnail */}
                  {artifact.fileUrl && (
                    <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg sm:w-48">
                      <Image
                        src={artifact.fileUrl}
                        alt={artifact.title}
                        fill
                        className="object-cover"
                        sizes="192px"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-[color:var(--text)]">{artifact.title}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      {meta.projectType && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {meta.projectType}
                        </span>
                      )}
                      <span>{new Date(artifact.createdAt).toLocaleString()}</span>
                      {artifact.model && <span>Model: {artifact.model}</span>}
                    </div>

                    {meta.projectDescription && (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                        {meta.projectDescription}
                      </p>
                    )}

                    {artifact.fileUrl && (
                      <a
                        href={artifact.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Image
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-6 text-center text-sm text-slate-700 dark:text-slate-300">
          Showing {history.length} most recent mockups
        </div>
      )}
    </main>
  );
}
