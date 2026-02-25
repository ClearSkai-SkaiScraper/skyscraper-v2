"use client";
import { useEffect, useState } from "react";

interface AgentRun {
  id: string;
  agentName: string;
  version?: string;
  durationMs: number;
  success: boolean;
  createdAt: string;
  errorType?: string;
  errorMsg?: string;
}

export function AgentRunWidget() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/agents/runs");
        if (!res.ok) {
          if (active) setError("");
          setLoading(false);
          return;
        }
        const contentType = res.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          if (active) setLoading(false);
          return;
        }
        const data = await res.json();
        if (active) setRuns(data.runs || []);
      } catch (e: any) {
        if (active) setError("");
      } finally {
        if (active) setLoading(false);
      }
    })();
    const interval = setInterval(() => {
      (async () => {
        try {
          const res = await fetch("/api/agents/runs");
          if (!res.ok) return;
          const contentType = res.headers.get("content-type");
          if (!contentType?.includes("application/json")) return;
          const data = await res.json();
          if (res.ok) setRuns(data.runs || []);
        } catch {}
      })();
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <div className="p-4 text-xs text-gray-500">Loading agent activity...</div>;
  if (error) return <div className="p-4 text-xs text-red-600">{error}</div>;

  const recentFailures = runs.filter((r) => !r.success).length;
  const avgDuration = runs.length
    ? Math.round(runs.reduce((a, b) => a + b.durationMs, 0) / runs.length)
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800">Recent Agent Runs</div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400">Live</div>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-xs text-gray-500">Runs</div>
          <div className="text-sm font-semibold">{runs.length}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-xs text-gray-500">Failures</div>
          <div className="text-sm font-semibold">{recentFailures}</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <div className="text-xs text-gray-500">Avg ms</div>
          <div className="text-sm font-semibold">{avgDuration}</div>
        </div>
      </div>
      <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
        {runs.map((r) => (
          <div
            key={r.id}
            className={`flex items-center justify-between rounded px-2 py-1 ${r.success ? "bg-green-50" : "bg-red-50"}`}
          >
            <span className="max-w-[120px] truncate font-mono text-[11px]">{r.agentName}</span>
            <span className="text-gray-500">{r.durationMs}ms</span>
            <span
              className={`text-[10px] font-medium ${r.success ? "text-green-700" : "text-red-700"}`}
            >
              {r.success ? "OK" : r.errorType || "ERR"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
