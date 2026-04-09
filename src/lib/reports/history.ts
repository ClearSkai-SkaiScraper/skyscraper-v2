"use client";

// Client helper to record a report after generation
export async function recordReportHistory(entry: {
  type: string;
  sourceId?: string;
  title?: string;
  fileUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/reports/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}
