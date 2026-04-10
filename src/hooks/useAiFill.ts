import { useCallback, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type FillTarget = "summary" | "codeCallouts" | "timeline" | "pricing";

type FillFn = (args: { reportId: string; prompt?: string }) => Promise<unknown>;

type ReportRow = { id: string; report_data?: Record<string, unknown> | null } & Record<
  string,
  unknown
>;

function pickField<T = unknown>(obj: unknown, ...keys: string[]): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    if (o[k] !== undefined) return o[k] as T;
  }
  return undefined;
}

export function useAiFill(report: ReportRow, target: FillTarget, fillFn: FillFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const prevRef = useRef<unknown>(report?.report_data?.[target]);

  const apply = useCallback(
    async (prompt?: string) => {
      setError(undefined);
      setLoading(true);
      try {
        const res = await fillFn({ reportId: String(report.id), prompt });
        const nextData: Record<string, unknown> = { ...(report.report_data || {}) };

        if (target === "summary") {
          const v = pickField<string>(res, "text", "summary");
          if (v !== undefined) nextData.summary = v;
          else if (typeof res === "string") nextData.summary = res;
        }

        if (target === "codeCallouts") {
          const items = pickField<unknown[]>(res, "items", "codeCallouts");
          if (items !== undefined) nextData.codeCallouts = items;
        }

        if (target === "timeline") {
          const items = pickField<unknown[]>(res, "items", "timeline");
          if (items !== undefined) nextData.timeline = items;
        }

        if (target === "pricing") {
          const table = pickField<unknown[]>(res, "table", "pricing");
          if (table !== undefined) nextData.pricing = table;
        }

        await supabase
          .from("reports")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ report_data: nextData as any })
          .eq("id", report.id);
        prevRef.current = report?.report_data?.[target];
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err.message || "Failed");
      } finally {
        setLoading(false);
      }
    },
    [report?.id, target, fillFn, report.report_data]
  );

  const undo = useCallback(async () => {
    const nextData: Record<string, unknown> = { ...(report.report_data || {}) };
    nextData[target] = prevRef.current;
    await supabase
      .from("reports")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ report_data: nextData as any })
      .eq("id", report.id);
  }, [report?.id, report?.report_data, target]);

  return { loading, error, apply, undo };
}
