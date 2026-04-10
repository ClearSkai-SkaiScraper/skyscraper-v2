"use client";

import { ExternalLink, Loader2, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SimilarClaim {
  claimId: string;
  score: number;
  title: string | null;
  carrier: string | null;
  damageType: string;
  status: string;
  estimatedValue: number | null;
  insuredName: string | null;
  dateOfLoss: string | null;
  createdAt: string | null;
}

interface SimilarClaimsResponse {
  success: boolean;
  type: string;
  results: SimilarClaim[];
  count: number;
}

function scoreColor(score: number): string {
  if (score >= 0.85) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.7) return "text-blue-600 dark:text-blue-400";
  if (score >= 0.5) return "text-amber-600 dark:text-amber-400";
  return "text-slate-500 dark:text-slate-400";
}

function scoreLabel(score: number): string {
  if (score >= 0.85) return "Very Similar";
  if (score >= 0.7) return "Similar";
  if (score >= 0.5) return "Somewhat Similar";
  return "Weak Match";
}

function formatCurrency(cents: number | null): string {
  if (!cents) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return "—";
  }
}

export function SimilarClaimsPanel({ claimId }: { claimId: string }) {
  const [results, setResults] = useState<SimilarClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/similarity/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, limit: 5, minScore: 0.3 }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Request failed (${res.status})`);
      }

      const data: SimilarClaimsResponse = await res.json();
      setResults(data.results);
      setHasSearched(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to search similar claims");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  // Don't auto-fetch — user triggers the search
  // This avoids burning embedding tokens on every page load.

  if (!hasSearched && !loading) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Find Similar Claims
            </span>
          </div>
          <button
            type="button"
            onClick={search}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:bg-violet-700 dark:hover:bg-violet-800"
          >
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Uses AI embeddings to find claims with similar damage, carrier, scope, and history.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Analyzing claim embeddings…
          </span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-400">⚠ {error}</p>
          <button
            type="button"
            onClick={search}
            className="text-xs font-medium text-red-600 underline hover:text-red-700 dark:text-red-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Similar Claims
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {results.length} found
          </Badge>
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400"
        >
          Refresh
        </button>
      </div>

      {results.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No similar claims found. Try adding more claim details (description, damage type, carrier)
          to improve matching.
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((claim) => (
            <Link
              key={claim.claimId}
              href={`/claims/${claim.claimId}/overview`}
              className="group flex items-start justify-between rounded-md border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:border-violet-200 hover:bg-violet-50/50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-800 group-hover:text-violet-700 dark:text-slate-200 dark:group-hover:text-violet-300">
                    {claim.title || claim.insuredName || "Untitled Claim"}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {claim.carrier && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                      {claim.carrier}
                    </span>
                  )}
                  {claim.damageType && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                      {claim.damageType}
                    </span>
                  )}
                  {claim.estimatedValue && (
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(claim.estimatedValue)}
                    </span>
                  )}
                  {claim.dateOfLoss && <span>Loss: {formatDate(claim.dateOfLoss)}</span>}
                </div>
              </div>
              <div className="ml-3 flex shrink-0 flex-col items-end">
                <span className={cn("text-sm font-bold tabular-nums", scoreColor(claim.score))}>
                  {Math.round(claim.score * 100)}%
                </span>
                <span className="text-[10px] text-muted-foreground">{scoreLabel(claim.score)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
