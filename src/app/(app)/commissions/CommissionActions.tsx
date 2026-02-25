"use client";

import { ListTodo } from "lucide-react";
import { useState } from "react";

import { useTaskSlideOver } from "@/components/tasks/TaskSlideOverContext";

export default function CommissionActions({
  recordId,
  pending,
  owed,
  repName,
}: {
  recordId: string;
  pending: number;
  owed: number;
  repName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const { openTaskPanel } = useTaskSlideOver();

  async function handleAction(action: "approve" | "mark_paid") {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus(action === "approve" ? "Approved ✓" : "Paid ✓");
    } catch {
      setStatus("Error");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <span className="text-xs text-slate-400">Processing...</span>;
  }

  if (status) {
    return <span className="text-xs text-green-500">{status}</span>;
  }

  return (
    <div className="flex justify-center gap-2">
      {pending > 0 && (
        <button
          onClick={() => handleAction("approve")}
          className="rounded-lg bg-yellow-600/20 px-2 py-1 text-xs font-medium text-yellow-600 transition-colors hover:bg-yellow-600/30 dark:text-yellow-400"
        >
          Approve
        </button>
      )}
      {owed > 0 && (
        <button
          onClick={() => handleAction("mark_paid")}
          className="rounded-lg bg-green-600/20 px-2 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-600/30 dark:text-green-400"
        >
          Pay
        </button>
      )}
      <button
        onClick={() =>
          openTaskPanel({
            prefillTitle: `Review commission for ${repName || "rep"}`,
            prefillDescription: `Commission record ${recordId} — Pending: $${pending.toFixed(2)}, Owed: $${owed.toFixed(2)}`,
            context: "commissions",
          })
        }
        className="rounded-lg bg-blue-600/20 px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-600/30 dark:text-blue-400"
        title="Create task"
      >
        <ListTodo className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
