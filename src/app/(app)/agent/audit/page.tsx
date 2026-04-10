"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Input({ label, ...props }: any) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className="rounded-md border bg-background px-3 py-2" {...props} />
    </label>
  );
}

export default function AgentAuditPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [filters, setFilters] = useState({ jobId: "", missionId: "", eventType: "" });
  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.jobId) p.set("jobId", filters.jobId);
    if (filters.missionId) p.set("missionId", filters.missionId);
    if (filters.eventType) p.set("eventType", filters.eventType);
    p.set("limit", "200");
    return p.toString();
  }, [filters]);

  const { data, isLoading, mutate } = useSWR(`/api/agent/audit?${qs}`, fetcher, {
    refreshInterval: 8000,
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agent Audit</h1>
        <button onClick={() => mutate()} className="rounded-md border px-3 py-2 hover:bg-accent">
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Input
          label="Job ID"
          value={filters.jobId}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e: any) => setFilters({ ...filters, jobId: e.target.value })}
          placeholder="job_..."
        />
        <Input
          label="Mission ID"
          value={filters.missionId}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e: any) => setFilters({ ...filters, missionId: e.target.value })}
          placeholder="AUTO_DEPRECIATION"
        />
        <Input
          label="Event Type"
          value={filters.eventType}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange={(e: any) => setFilters({ ...filters, eventType: e.target.value })}
          placeholder="MISSION.START"
        />
        <div className="flex items-end">
          <button
            onClick={() => setFilters({ jobId: "", missionId: "", eventType: "" })}
            className="w-full rounded-md border px-3 py-2 hover:bg-accent"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">Mission</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-3 py-6 text-center" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              )}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {data?.rows?.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{r.jobId ?? "—"}</td>
                  <td className="px-3 py-2">{r.missionId ?? "—"}</td>
                  <td className="px-3 py-2">{r.eventType}</td>
                  <td className="px-3 py-2">{r.actor}</td>
                  <td className="px-3 py-2">{r.message}</td>
                  <td className="max-w-[320px] px-3 py-2">
                    <pre className="overflow-auto rounded bg-muted/30 p-2 text-xs">
                      {r.metadata ? JSON.stringify(r.metadata, null, 2) : "—"}
                    </pre>
                  </td>
                </tr>
              ))}
              {!isLoading && data?.rows?.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={7}>
                    No audit events (yet). Trigger an agent run to populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
