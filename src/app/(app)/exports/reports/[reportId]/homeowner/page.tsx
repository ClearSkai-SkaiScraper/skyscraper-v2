// src/app/(app)/exports/reports/[reportId]/homeowner/page.tsx
import { redirect } from "next/navigation";

import { buildHomeownerSummaryPayload } from "@/lib/export/payloads";
import { safeOrgContext } from "@/lib/safeOrgContext";

type PageProps = { params: { reportId: string } };

export default async function HomeownerSummaryPage({ params }: PageProps) {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");

  const reportId = params.reportId;

  const summary = await buildHomeownerSummaryPayload(reportId, ctx.orgId ?? null);

  const { claim } = summary;

  return (
    <div className="mx-auto max-w-4xl space-y-6 bg-white p-8 text-black print:p-4">
      {/* Header */}
      <header className="space-y-1 border-b pb-4">
        <h1 className="text-2xl font-bold">{summary.headline}</h1>
        <p className="text-sm">
          Property: {claim.propertyAddress ?? claim.properties?.address ?? "Your home"}
        </p>
        <p className="text-xs text-gray-600">
          This summary is written for you as the homeowner, not the insurance company.
        </p>
      </header>

      {/* Summary */}
      <section className="space-y-2 text-sm">
        <h2 className="border-b pb-1 text-lg font-semibold">What We Found</h2>
        <p className="whitespace-pre-wrap">{summary.summary}</p>
      </section>

      {/* Key Findings */}
      {summary.keyFindings.length > 0 && (
        <section className="space-y-2 text-sm">
          <h2 className="border-b pb-1 text-lg font-semibold">Key Points in Plain Language</h2>
          <ul className="list-inside list-disc space-y-1">
            {summary.keyFindings.map((f, idx) => (
              <li key={idx}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Next Steps */}
      {summary.nextSteps.length > 0 && (
        <section className="space-y-2 text-sm">
          <h2 className="border-b pb-1 text-lg font-semibold">What Happens Next</h2>
          <ol className="list-inside list-decimal space-y-1">
            {summary.nextSteps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-6 border-t pt-4 text-[11px] text-gray-500">
        Prepared by SkaiScraper – this summary is for your understanding and records. For technical
        details, your adjuster packet includes line-item and code documentation.
      </footer>
    </div>
  );
}
