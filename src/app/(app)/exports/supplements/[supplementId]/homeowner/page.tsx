// src/app/(app)/exports/supplements/[supplementId]/homeowner/page.tsx
import { redirect } from "next/navigation";

import { buildSupplementHomeownerPayload } from "@/lib/export/payloads";
import { safeOrgContext } from "@/lib/safeOrgContext";

type PageProps = { params: { supplementId: string } };

export default async function SupplementHomeownerPage({ params }: PageProps) {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");

  const supplementId = params.supplementId;

  const summary = await buildSupplementHomeownerPayload(supplementId, ctx.orgId ?? null);

  const {
    claim,
    supplements: supplement,
    headline,
    summary: text,
    keyItems,
    totalRequested,
    nextSteps,
  } = summary;

  const claimNumber = claim?.claimNumber ?? claim?.id?.slice(0, 8) ?? "Your claim";

  return (
    <div className="mx-auto max-w-4xl space-y-6 bg-white p-8 text-black print:p-4">
      {/* Header */}
      <header className="space-y-1 border-b pb-4">
        <h1 className="text-2xl font-bold">{headline}</h1>
        {claim && (
          <>
            <p className="text-sm">
              Claim: <strong>{claimNumber}</strong>
            </p>
            <p className="text-sm">
              Property: {claim.propertyAddress ?? claim.properties?.address ?? "Your home"}
            </p>
            <p className="text-sm">Insurance Company: {claim.carrier ?? "Your carrier"}</p>
          </>
        )}
        <p className="text-xs text-gray-600">
          This page is written for you as the homeowner — not the insurance company.
        </p>
      </header>

      {/* Summary */}
      <section className="space-y-2 text-sm">
        <h2 className="border-b pb-1 text-lg font-semibold">What This Supplement Means</h2>
        <p className="whitespace-pre-wrap">{text}</p>
      </section>

      {/* Key Items */}
      {keyItems.length > 0 && (
        <section className="space-y-2 text-sm">
          <h2 className="border-b pb-1 text-lg font-semibold">A Few Key Items We&apos;re Requesting</h2>
          <ul className="space-y-2">
            {keyItems.map((item, idx) => (
              <li key={idx} className="rounded-lg border p-3">
                <p className="mb-1 text-xs text-gray-500">
                  {item.code ? `Code: ${item.code}` : null}
                  {item.code && item.area ? " • " : null}
                  {item.area ? `Area: ${item.area}` : null}
                </p>
                <p className="font-medium">{item.description}</p>
                <p className="mt-1 text-xs text-gray-600">{item.plainReason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Total */}
      <section className="space-y-2 text-sm">
        <h2 className="border-b pb-1 text-lg font-semibold">Total Amount We&apos;re Requesting</h2>
        <p>
          We are asking your insurance company to add approximately{" "}
          <strong>${totalRequested.toFixed(2)}</strong> in additional items.
        </p>
        <p className="text-xs text-gray-600">
          This is an estimate based on the current supplement. The final approved amount may be
          slightly higher or lower depending on how the carrier responds.
        </p>
      </section>

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <section className="space-y-2 text-sm">
          <h2 className="border-b pb-1 text-lg font-semibold">What Happens Next</h2>
          <ol className="list-inside list-decimal space-y-1">
            {nextSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      <footer className="mt-6 border-t pt-4 text-[11px] text-gray-500">
        Prepared by your contractor using SkaiScraper. This summary is for your understanding. The
        technical supplement packet is what we send directly to your insurance company.
      </footer>
    </div>
  );
}
