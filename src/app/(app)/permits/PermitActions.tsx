"use client";

import { ChevronRight, ListTodo } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useTaskSlideOver } from "@/components/tasks/TaskSlideOverContext";

const STATUS_FLOW: Record<string, string> = {
  applied: "approved",
  approved: "issued",
  issued: "inspection_scheduled",
  inspection_scheduled: "passed",
};

const STATUS_LABELS: Record<string, string> = {
  approved: "Approve",
  issued: "Mark Issued",
  inspection_scheduled: "Schedule Inspection",
  passed: "Mark Passed",
  failed: "Mark Failed",
};

/**
 * PermitActions — inline status progression + task creation for permit rows.
 * Shows a "next step" button to advance the permit along the workflow
 * and a task button to assign follow-up work.
 */
export default function PermitActions({
  permitId,
  currentStatus,
  permitNumber,
}: {
  permitId: string;
  currentStatus: string;
  permitNumber: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { openTaskPanel } = useTaskSlideOver();

  const nextStatus = STATUS_FLOW[currentStatus];

  async function handleAdvance() {
    if (!nextStatus) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/permits/${permitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Permit moved to ${nextStatus.replace("_", " ")}`);
      router.refresh();
    } catch {
      toast.error("Failed to update permit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {nextStatus && (
        <button
          onClick={handleAdvance}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600/20 px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-600/30 disabled:opacity-50 dark:text-blue-400"
          title={`Move to ${nextStatus.replace("_", " ")}`}
        >
          {loading ? "…" : STATUS_LABELS[nextStatus] || nextStatus.replace("_", " ")}
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
      <button
        onClick={() =>
          openTaskPanel({
            prefillTitle: `Follow up on permit ${permitNumber}`,
            prefillDescription: `Permit ${permitNumber} is currently "${currentStatus.replace("_", " ")}". Next step: ${nextStatus ? nextStatus.replace("_", " ") : "complete"}.`,
            context: "permits",
          })
        }
        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
        title="Create task for this permit"
      >
        <ListTodo className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
