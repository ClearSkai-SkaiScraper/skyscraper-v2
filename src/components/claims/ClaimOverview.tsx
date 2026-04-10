"use client";

import { useState, useTransition } from "react";

import { btn, card, glow, textMuted, textPrimary } from "@/lib/theme";

type ClaimOverviewProps = {
  claim: {
    id: string;
    insured_name?: string | null;
    policyNumber?: string | null;
    stage?: string | null;
    exposureCents?: number | null;
    lossDate?: string | null;
  };
};

function centsToDollars(c?: number | null) {
  if (!c && c !== 0) return "$0.00";
  return (c / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function ClaimOverview({ claim }: ClaimOverviewProps) {
  const [summary, setSummary] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runSummary = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/claims/${claim.id}/ai/summary`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          setError(data?.text || `AI summary failed (${res.status})`);
          return;
        }
        setSummary(data.text || "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        setError(e?.message || "AI summary failed");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${card} ${glow} p-4`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-[color:var(--text)]">
              {claim.insured_name || "Unnamed Insured"}
            </h2>
            <div className={`${textMuted} mt-1 text-sm`}>
              Policy{" "}
              <span className="font-medium text-[color:var(--text)]">
                {claim.policyNumber || "—"}
              </span>{" "}
              • Stage{" "}
              <span className={`${textPrimary} font-medium`}>
                {claim.stage || "FILED"}
              </span>{" "}
              • Exposure {centsToDollars(claim.exposureCents)}
            </div>
            {claim.lossDate && (
              <div className={`${textMuted} mt-1 text-xs`}>
                Loss Date: {new Date(claim.lossDate).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={btn}
              onClick={runSummary}
              aria-label="Generate AI Summary"
              disabled={isPending}
            >
              {isPending ? "Generating…" : "AI Summary"}
            </button>
            <a href={`/claims/${claim.id}/files`} className={btn} aria-label="Open Files">
              Files
            </a>
            <a
              href={`/claims/${claim.id}/supplements`}
              className={btn}
              aria-label="Open Supplements"
            >
              Supplements
            </a>
            <a
              href={`/claims/${claim.id}/messages`}
              className={btn}
              aria-label="Open Messages"
            >
              Messages
            </a>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className={`${card} ${glow} p-4`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[color:var(--text)]">Executive Summary</h3>
          <button
            className={btn}
            onClick={runSummary}
            aria-label="Regenerate AI Summary"
            disabled={isPending}
          >
            {isPending ? "Working…" : "Regenerate"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] p-3 text-sm"
          >
            {error}
          </div>
        )}

        {!error && !summary && (
          <div className={`${textMuted} text-sm`}>No summary yet. Generate one to begin.</div>
        )}

        {!error && summary && (
          <div className="prose prose-invert max-w-none text-[color:var(--text)]">
            <p className="whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className={`${card} p-4`}>
          <div className={`${textMuted} mb-1 text-xs`}>Exposure</div>
          <div className="text-2xl font-semibold text-[color:var(--primary)]">
            {centsToDollars(claim.exposureCents)}
          </div>
        </div>
        <div className={`${card} p-4`}>
          <div className={`${textMuted} mb-1 text-xs`}>Stage</div>
          <div className="text-lg font-semibold">{claim.stage || "FILED"}</div>
        </div>
        <div className={`${card} p-4`}>
          <div className={`${textMuted} mb-1 text-xs`}>Policy</div>
          <div className="text-lg font-semibold">{claim.policyNumber || "—"}</div>
        </div>
      </div>
    </div>
  );
}
