// ============================================================================
// AI CLIENT HOOKS
// ============================================================================
// React hooks for AI operations with SWR caching

"use client";

import useSWR from "swr";

import type {
  AIJob,
  AISectionKey,
  AISectionState,
  AIUsageSummary,
} from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Run AI for a specific engine or all engines
 */
export async function runAI(params: {
  reportId: string;
  engine?: string;
  sectionKey?: AISectionKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any;
}): Promise<{ jobId?: string; jobIds?: string[] }> {
  const res = await fetch("/api/ai/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to run AI");
  }

  return res.json();
}

/**
 * Get job status
 */
export function useAIJob(jobId: string | null) {
  const { data, error, mutate } = useSWR<AIJob>(
    jobId ? `/api/ai/status?jobId=${jobId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll every 2s while running
        if (data?.status === "running") return 2000;
        return 0; // Stop polling when done
      },
    }
  );

  return {
    job: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

/**
 * Get AI section state
 */
export function useAISection(reportId: string, sectionKey: AISectionKey) {
  const { data, error, mutate } = useSWR<AISectionState>(
    `/api/reports/${reportId}/ai/${sectionKey}`,
    fetcher
  );

  return {
    state: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

/**
 * Get AI usage summary
 */
export function useAIUsage() {
  const { data, error, mutate } = useSWR<AIUsageSummary>(
    "/api/ai/usage",
    fetcher
  );

  return {
    usage: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

/**
 * Approve AI fields
 */
export async function approveFields(params: {
  reportId: string;
  sectionKey: AISectionKey;
  fieldIds?: string[];
}): Promise<void> {
  const res = await fetch(`/api/reports/${params.reportId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sectionKey: params.sectionKey,
      fieldIds: params.fieldIds,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to approve");
  }
}

/**
 * Reject AI fields
 */
export async function rejectFields(params: {
  reportId: string;
  sectionKey: AISectionKey;
  fieldIds?: string[];
}): Promise<void> {
  const res = await fetch(`/api/reports/${params.reportId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sectionKey: params.sectionKey,
      fieldIds: params.fieldIds,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to reject");
  }
}
