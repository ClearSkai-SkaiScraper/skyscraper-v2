// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Calendar, CheckCircle, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LEGAL_DOCUMENTS } from "@/lib/legal/config";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LegalAcceptancesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const userId = user.id;

  // Get all legal acceptances for this user
  const acceptances = await prisma.legal_acceptances.findMany({
    where: { userId },
    orderBy: { acceptedAt: "desc" },
  });

  // Map to full document details
  const acceptedDocs = acceptances.map((acceptance) => {
    const docConfig = LEGAL_DOCUMENTS.find((d) => d.id === acceptance.documentId);
    return {
      ...acceptance,
      title: docConfig?.title || "Unknown Document",
      description: "",
      url: `/legal/${acceptance.documentId}/${acceptance.version}`,
    };
  });

  return (
    <div className="container max-w-5xl py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-bold text-slate-50">Legal Acceptances</h1>
          <p className="mt-2 text-sm text-slate-400">
            View all legal documents you&apos;ve accepted and when you accepted them.
          </p>
        </div>

        {/* Acceptances List */}
        {acceptedDocs.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-300">No Legal Acceptances</h3>
            <p className="mt-2 text-sm text-slate-500">
              You haven&apos;t accepted any legal documents yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {acceptedDocs.map((doc) => (
              <div
                key={doc.id}
                className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700 hover:bg-slate-900/70"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Document Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <h3 className="text-lg font-semibold text-slate-50">{doc.title}</h3>
                    </div>

                    {doc.description && <p className="text-sm text-slate-400">{doc.description}</p>}

                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Accepted on{" "}
                          {new Date(doc.acceptedAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Version {doc.version}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600">
                      Acceptance ID:{" "}
                      <code className="rounded bg-slate-800 px-1.5 py-0.5">{doc.id}</code>
                    </div>
                  </div>

                  {/* View Document Button */}
                  <Link
                    href={doc.url}
                    target="_blank"
                    className="group/btn flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-sky-500 hover:bg-slate-800 hover:text-sky-300"
                  >
                    <span>View Document</span>
                    <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-6">
          <h3 className="text-sm font-semibold text-slate-300">About Legal Acceptances</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            This page shows a record of all legal documents you&apos;ve agreed to, including Terms of
            Service, Privacy Policy, and AI Safety Policy. Each acceptance is timestamped and stored
            in your company settings. These records are maintained for compliance and reference
            purposes.
          </p>
        </div>
      </div>
    </div>
  );
}
