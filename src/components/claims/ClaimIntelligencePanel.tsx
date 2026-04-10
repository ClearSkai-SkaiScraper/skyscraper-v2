"use client";

import { Bot, FileText, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type NextActionSuggestion = {
  id: string;
  label: string;
  description?: string;
  priority: "low" | "medium" | "high";
};

type OrchestrateResponse = {
  state: string | null;
  nextActions: NextActionSuggestion[];
  explanation: string;
};

interface Props {
  claimId: string;
}

export function ClaimIntelligencePanel({ claimId }: Props) {
  const [data, setData] = useState<OrchestrateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [automating, setAutomating] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/ai/orchestrate/${claimId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          // If 401, show a clean CTA for feature enablement, not a sign-in message
          if (res.status === 401) {
            throw new Error(
              "AI Insights are not enabled for this claim. Click below to initialize or contact support."
            );
          }
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as OrchestrateResponse;
        if (!cancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (claimId) {
      void fetchData();
    }

    return () => {
      cancelled = true;
    };
  }, [claimId]);

  const runAutomation = async (type: "estimate" | "supplement" | "dispatch") => {
    try {
      setAutomating(type);

      const endpoints = {
        estimate: `/api/ai/estimate/${claimId}`,
        supplement: `/api/ai/supplement/${claimId}`,
        dispatch: `/api/ai/dispatch/${claimId}`,
      };

      const res = await fetch(endpoints[type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pushbackType: "general",
          actionType: "FULL_REPLACEMENT",
          priority: "HIGH",
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to run ${type}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await res.json();
      alert(`✅ ${type.toUpperCase()} automation complete!`);

      // Refresh intelligence
      const refreshRes = await fetch(`/api/ai/orchestrate/${claimId}`);
      if (refreshRes.ok) {
        const json = await refreshRes.json();
        setData(json);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setAutomating(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4 text-sm text-[color:var(--muted-foreground)]">
        Loading claim intelligence…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-yellow-500/40 bg-yellow-950/40 p-4 text-sm text-yellow-200">
        <span>AI Insights (beta) unavailable for this claim.</span>
        <button
          className="rounded bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Initialize AI Insights
        </button>
        <span className="text-xs text-yellow-300">Contact support if this persists.</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const priorityOrder: Record<NextActionSuggestion["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const sortedActions = [...data.nextActions].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return (
    <div className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
            AI Claim Intelligence
          </h3>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            Powered by the SkaiScraper Intelligence Core
          </p>
        </div>
        {data.state && (
          <span className="bg-[color:var(--accent)]/10 rounded-full px-3 py-1 text-xs font-medium text-[color:var(--accent-foreground)]">
            State: {data.state}
          </span>
        )}
      </div>

      {sortedActions.length > 0 ? (
        <div className="space-y-2">
          {sortedActions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--surface-2)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  {action.label}
                </span>
                <span
                  className={
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                    (action.priority === "high"
                      ? "bg-red-500/10 text-red-300"
                      : action.priority === "medium"
                        ? "bg-yellow-500/10 text-yellow-300"
                        : "bg-emerald-500/10 text-emerald-300")
                  }
                >
                  {action.priority}
                </span>
              </div>
              {action.description && (
                <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                  {action.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[color:var(--muted-foreground)]">
          No recommended next actions at this time.
        </p>
      )}

      {data.explanation && (
        <div className="bg-[color:var(--surface-3)]/60 rounded-xl border border-dashed border-[color:var(--border-soft)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Why these suggestions
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">{data.explanation}</p>
        </div>
      )}

      {/* PHASE Q AUTOMATION CONTROLS */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-400" />
          <h4 className="text-sm font-semibold text-blue-300">AI Automation</h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => runAutomation("estimate")}
            disabled={automating !== null}
            className="flex flex-col items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 transition-all hover:bg-emerald-950/50 disabled:opacity-50"
          >
            <Bot className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-300">
              {automating === "estimate" ? "Running..." : "Generate Estimate"}
            </span>
          </button>

          <button
            onClick={() => runAutomation("supplement")}
            disabled={automating !== null}
            className="flex flex-col items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-950/30 p-3 transition-all hover:bg-yellow-950/50 disabled:opacity-50"
          >
            <FileText className="h-5 w-5 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-300">
              {automating === "supplement" ? "Writing..." : "Write Supplement"}
            </span>
          </button>

          <button
            onClick={() => runAutomation("dispatch")}
            disabled={automating !== null}
            className="flex flex-col items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-950/30 p-3 transition-all hover:bg-purple-950/50 disabled:opacity-50"
          >
            <Users className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">
              {automating === "dispatch" ? "Dispatching..." : "Dispatch Crew"}
            </span>
          </button>
        </div>
        <p className="mt-3 text-[10px] text-[color:var(--muted-foreground)]">
          ⚡ Carrier-aware AI applies all 15 global rules + specific carrier strategies
        </p>
      </div>
    </div>
  );
}
