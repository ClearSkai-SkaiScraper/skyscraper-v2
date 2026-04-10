"use client";
import { useState } from "react";

import { logger } from "@/lib/logger";
import { btn, card, glow } from "@/lib/theme";

type Supplement = {
  id: string;
  totalCents: number;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  createdAt: Date;
};

export default function ClaimSupplements({
  claimId,
  supplements = [],
}: {
  claimId: string;
  supplements: Supplement[];
}) {
  const [rebuttal, setRebuttal] = useState("");
  const [selectedSupplement, setSelectedSupplement] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateRebuttal = async (supplementId: string) => {
    setLoading(true);
    setSelectedSupplement(supplementId);
    try {
      const res = await fetch(`/api/claims/${claimId}/ai/rebuttal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplementId }),
        cache: "no-store",
      });
      const data = await res.json();
      setRebuttal(data.rebuttal || "");
    } catch (err) {
      logger.error("Failed to generate rebuttal:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    REQUESTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    DENIED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="space-y-4">
      {/* Supplements List */}
      <div className={`${card} ${glow}`}>
        <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
          Supplement Requests
        </h3>

        {supplements.length === 0 ? (
          <p className="text-sm italic text-[color:var(--muted)]">
            No supplements yet. Click &quot;Add Supplement&quot; to create one.
          </p>
        ) : (
          <div className="space-y-3">
            {supplements.map((supp) => (
              <div
                key={supp.id}
                className="flex items-center justify-between rounded-lg border border-[color:var(--border)] p-4 transition-colors hover:bg-[var(--surface-2)]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-semibold ${
                        statusColors[supp.status] || statusColors.DRAFT
                      }`}
                    >
                      {supp.status}
                    </span>
                    <span className="text-sm font-semibold text-[color:var(--text)]">
                      ${(supp.totalCents / 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    Created {new Date(supp.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => generateRebuttal(supp.id)}
                  disabled={loading && selectedSupplement === supp.id}
                  className={btn}
                >
                  {loading && selectedSupplement === supp.id
                    ? "Generating..."
                    : "Generate Rebuttal"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Rebuttal Letter */}
      {rebuttal && (
        <div className={`${card} ${glow}`}>
          <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
            AI-Generated Rebuttal Letter
          </h3>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap rounded-lg bg-[var(--surface-2)] p-4 text-[color:var(--text)]">
              {rebuttal}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btn}>📋 Copy to Clipboard</button>
            <button className={btn}>📧 Email to Carrier</button>
            <button className={btn}>💾 Save as PDF</button>
          </div>
        </div>
      )}
    </div>
  );
}
