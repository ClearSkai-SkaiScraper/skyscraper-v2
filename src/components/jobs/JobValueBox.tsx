// src/components/jobs/JobValueBox.tsx
"use client";

import { DollarSign, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useRBAC } from "@/hooks/useRBAC";

interface JobValueBoxProps {
  /** The claim or lead ID */
  entityId: string;
  /** "claim" or "lead" — determines the PATCH endpoint */
  entityType: "claim" | "lead";
  estimatedJobValue: number | null;
  jobValueStatus: string;
  jobValueApprovedBy: string | null;
  jobValueApprovalNotes: string | null;
  /** Callback when values change (optimistic update) */
  onUpdate: (updates: Record<string, any>) => void;
}

export function JobValueBox({
  entityId,
  entityType,
  estimatedJobValue,
  jobValueStatus,
  jobValueApprovedBy,
  jobValueApprovalNotes,
  onUpdate,
}: JobValueBoxProps) {
  const { isMinimumRole, loading: rbacLoading } = useRBAC();
  const isManager = !rbacLoading && isMinimumRole("PM");

  const [editValue, setEditValue] = useState(
    estimatedJobValue != null ? (estimatedJobValue / 100).toFixed(2) : ""
  );
  const [submitting, setSubmitting] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectNotes, setShowRejectNotes] = useState(false);

  useEffect(() => {
    setEditValue(estimatedJobValue != null ? (estimatedJobValue / 100).toFixed(2) : "");
  }, [estimatedJobValue]);

  const patchEndpoint =
    entityType === "claim" ? `/api/claims/${entityId}/update` : `/api/leads/${entityId}`;

  const sendPatch = useCallback(
    async (body: Record<string, any>) => {
      const res = await fetch(patchEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res;
    },
    [patchEndpoint]
  );

  const handleSubmitForApproval = async () => {
    const cents = Math.round(parseFloat(editValue) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error("Enter a valid dollar amount");
      return;
    }
    setSubmitting(true);
    try {
      await sendPatch({ estimatedJobValue: cents, jobValueStatus: "submitted" });
      onUpdate({ estimatedJobValue: cents, jobValueStatus: "submitted" });
      toast.success("Job value submitted for manager approval!");
    } catch {
      toast.error("Failed to submit job value");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await sendPatch({ jobValueStatus: "approved" });
      onUpdate({ jobValueStatus: "approved" });
      toast.success("Job value approved! It will now show on the leaderboard.");
    } catch {
      toast.error("Failed to approve job value");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await sendPatch({
        jobValueStatus: "rejected",
        jobValueApprovalNotes: rejectNotes || "Needs revision — please update the estimated value.",
      });
      onUpdate({
        jobValueStatus: "rejected",
        jobValueApprovalNotes: rejectNotes || "Needs revision — please update the estimated value.",
      });
      toast.info("Job value sent back for revision.");
      setShowRejectNotes(false);
      setRejectNotes("");
    } catch {
      toast.error("Failed to reject job value");
    } finally {
      setSubmitting(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    draft: { label: "Draft", color: "text-slate-500 bg-slate-100 dark:bg-slate-800", icon: "✏️" },
    submitted: {
      label: "Pending Approval",
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
      icon: "⏳",
    },
    approved: {
      label: "Approved",
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
      icon: "✅",
    },
    rejected: {
      label: "Needs Revision",
      color: "text-red-600 bg-red-50 dark:bg-red-950/30",
      icon: "🔄",
    },
  };
  const cfg = statusConfig[jobValueStatus] || statusConfig.draft;

  return (
    <div className="space-y-3">
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-foreground">Job Value</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
        >
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Value input */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
          $
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          disabled={jobValueStatus === "approved" || jobValueStatus === "submitted"}
          placeholder="0.00"
          className="w-full rounded-lg border border-slate-300 bg-background py-2 pl-7 pr-3 text-lg font-semibold text-foreground shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600"
        />
      </div>

      {/* Submit for approval — anyone can do this */}
      {(jobValueStatus === "draft" || jobValueStatus === "rejected") && (
        <button
          onClick={handleSubmitForApproval}
          disabled={submitting || !editValue}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Submitting…" : "Submit for Approval"}
        </button>
      )}

      {/* Approve / Reject — MANAGERS ONLY (PM+) */}
      {jobValueStatus === "submitted" && isManager && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              ✅ {submitting ? "…" : "Approve"}
            </button>
            <button
              onClick={() => setShowRejectNotes(!showRejectNotes)}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              🔄 Revise
            </button>
          </div>

          {/* Rejection notes textarea */}
          {showRejectNotes && (
            <div className="space-y-2">
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Reason for revision (optional)…"
                rows={2}
                className="w-full rounded-lg border border-slate-300 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 dark:border-slate-600"
              />
              <button
                onClick={handleReject}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send Back for Revision"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submitted but NOT a manager — show waiting message */}
      {jobValueStatus === "submitted" && !isManager && !rbacLoading && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⏳ Waiting for manager approval. You'll be notified when it's reviewed.
        </p>
      )}

      {/* Approved confirmation */}
      {jobValueStatus === "approved" && estimatedJobValue && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          ✅ Approved value of <strong>${(estimatedJobValue / 100).toLocaleString()}</strong> is
          reflected in financials and leaderboard.
        </p>
      )}

      {/* Show approval notes */}
      {jobValueApprovalNotes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-medium">Manager Note:</span> {jobValueApprovalNotes}
          </p>
        </div>
      )}
    </div>
  );
}
