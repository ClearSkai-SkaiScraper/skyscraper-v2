"use client";

import { AlertCircle,Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

interface SubmitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: string;
  claimNumber?: string;
  carrierName?: string;
  onSuccess?: () => void;
}

export function SubmitReportModal({
  isOpen,
  onClose,
  claimId,
  claimNumber,
  carrierName,
  onSuccess,
}: SubmitReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carrier, setCarrier] = useState(carrierName || "");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!carrier.trim()) {
      toast.error("Please enter carrier name");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          carrierName: carrier,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit report");
      }

      toast.success("Report submitted to carrier successfully");
      onSuccess?.();
      onClose();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("Submit error:", error);
      toast.error(error.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
              <Send className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Submit Report to Carrier</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Claim {claimNumber || claimId.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {/* Warning */}
          <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Confirm submission</p>
              <p className="mt-1 text-yellow-700 dark:text-yellow-300">
                Once submitted, this report will be marked as sent to the carrier and locked for
                editing. Only administrators can reopen submitted reports.
              </p>
            </div>
          </div>

          {/* Carrier Input */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Carrier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g., State Farm, Allstate, etc."
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border p-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !carrier.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit to Carrier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
