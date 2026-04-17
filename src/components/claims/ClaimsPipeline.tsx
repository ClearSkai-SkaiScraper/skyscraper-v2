"use client";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { triggerNotification } from "@/components/notifications/UnifiedNotificationBell";
import { logger } from "@/lib/logger";
import { card } from "@/lib/theme";

type ClaimStage =
  | "FILED"
  | "ADJUSTER_REVIEW"
  | "APPROVED"
  | "DENIED"
  | "APPEAL"
  | "BUILD"
  | "COMPLETED"
  | "DEPRECIATION";

type ClaimCard = {
  id: string;
  claimNumber: string;
  lifecycleStage: ClaimStage | null;
  insured_name: string | null;
  exposureCents: number | null;
  property: {
    street: string;
  };
};

const STAGES: { key: ClaimStage; label: string; color: string }[] = [
  { key: "FILED", label: "Filed", color: "bg-gray-100 dark:bg-gray-800" },
  { key: "ADJUSTER_REVIEW", label: "Review", color: "bg-blue-100 dark:bg-blue-900" },
  { key: "APPROVED", label: "Approved", color: "bg-green-100 dark:bg-green-900" },
  { key: "DENIED", label: "Denied", color: "bg-red-100 dark:bg-red-900" },
  { key: "APPEAL", label: "Appeal", color: "bg-yellow-100 dark:bg-yellow-900" },
  { key: "BUILD", label: "Build", color: "bg-purple-100 dark:bg-purple-900" },
  { key: "COMPLETED", label: "Completed", color: "bg-teal-100 dark:bg-teal-900" },
  { key: "DEPRECIATION", label: "Depreciation", color: "bg-orange-100 dark:bg-orange-900" },
];

// Map stage to status string for API
const STAGE_TO_STATUS: Record<ClaimStage, string> = {
  FILED: "new",
  ADJUSTER_REVIEW: "in_progress",
  APPROVED: "approved",
  DENIED: "denied",
  APPEAL: "appeal",
  BUILD: "build",
  COMPLETED: "completed",
  DEPRECIATION: "depreciation",
};

export default function ClaimsPipeline({ claims: initialClaims = [] }: { claims: ClaimCard[] }) {
  // Use local state for optimistic updates - no page reload needed
  const [claims, setClaims] = useState<ClaimCard[]>(initialClaims);
  const [dragOverStage, setDragOverStage] = useState<ClaimStage | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{
    claimId: string;
    suggestedStatus: string;
    reasoning: string;
    confidence: number;
  } | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ stage: ClaimStage; claimId: string } | null>(
    null
  );
  // Track processing claims to prevent duplicate drops
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());

  // Use ref to track dragging ID - refs don't have stale closure issues
  const draggingRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const claimsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.key] = claims.filter((c) => c.lifecycleStage === stage.key);
      return acc;
    },
    {} as Record<ClaimStage, ClaimCard[]>
  );

  const handleDragStart = useCallback((claim_id: string) => {
    draggingRef.current = claim_id;
    setDraggingId(claim_id);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggingRef.current = null;
    setDraggingId(null);
    setDragOverStage(null);
  }, []);

  const handleDragOver = useCallback((stage: ClaimStage) => {
    if (draggingRef.current) {
      setDragOverStage(stage);
    }
  }, []);

  const handleDrop = useCallback(
    async (stage: ClaimStage, claim_id: string) => {
      // Use ref value to get the most current dragging ID
      const currentDragging = draggingRef.current || claim_id;

      // Clear drag state immediately
      draggingRef.current = null;
      setDraggingId(null);
      setDragOverStage(null);

      // Prevent duplicate processing
      if (processingClaims.has(currentDragging)) {
        logger.debug("Claim already being processed, skipping", currentDragging);
        return;
      }

      // Find the claim
      const claim = claims.find((c) => c.id === currentDragging);
      if (!claim) {
        logger.warn("Claim not found for drop", currentDragging);
        toast.error("Claim not found. Please refresh the page.");
        return;
      }

      // Skip if already in this stage
      if (claim.lifecycleStage === stage) {
        return;
      }

      // Mark as processing
      setProcessingClaims((prev) => new Set(prev).add(currentDragging));
      setPendingDrop({ stage, claimId: currentDragging });

      // Optimistic update - move claim immediately in UI
      setClaims((prev) =>
        prev.map((c) => (c.id === currentDragging ? { ...c, lifecycleStage: stage } : c))
      );

      // Try to get AI suggestion (non-blocking)
      try {
        const aiRes = await fetch("/api/ai/suggest-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claimId: currentDragging }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiSuggestion(aiData);

          triggerNotification({
            message: `AI suggests ${aiData.suggestedStatus} for claim ${currentDragging.substring(0, 8)}`,
            id: currentDragging,
            type: "ai_suggestion",
          });

          if (aiData.suggestedStatus !== stage && aiData.confidence > 60) {
            setShowAiModal(true);
            return;
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        logger.debug("AI suggestion unavailable, proceeding with manual update");
      }

      // Proceed with update
      await updateClaimStatus(currentDragging, stage);
    },
    [claims, processingClaims]
  );

  const updateClaimStatus = useCallback(
    async (claim_id: string, stage: ClaimStage) => {
      try {
        // Use the update endpoint which we know works
        const res = await fetch(`/api/claims/${claim_id}/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: STAGE_TO_STATUS[stage],
            lifecycleStage: stage,
          }),
          cache: "no-store",
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed with status ${res.status}`);
        }

        toast.success(`Claim moved to ${stage}`);
      } catch (err) {
        logger.error("Failed to update claim stage:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to update claim. Please try again."
        );

        // Revert optimistic update on error
        setClaims((prev) =>
          prev.map((c) => {
            const original = initialClaims.find((ic) => ic.id === c.id);
            return original ? { ...c, lifecycleStage: original.lifecycleStage } : c;
          })
        );
      } finally {
        setProcessingClaims((prev) => {
          const next = new Set(prev);
          next.delete(claim_id);
          return next;
        });
        setPendingDrop(null);
      }
    },
    [initialClaims]
  );

  const handleAcceptAiSuggestion = useCallback(() => {
    if (aiSuggestion && pendingDrop) {
      void updateClaimStatus(pendingDrop.claimId, aiSuggestion.suggestedStatus as ClaimStage);
      setShowAiModal(false);
      setAiSuggestion(null);
      setPendingDrop(null);
    }
  }, [aiSuggestion, pendingDrop, updateClaimStatus]);

  const handleRejectAiSuggestion = useCallback(() => {
    if (pendingDrop) {
      void updateClaimStatus(pendingDrop.claimId, pendingDrop.stage);
      setShowAiModal(false);
      setAiSuggestion(null);
      setPendingDrop(null);
    }
  }, [pendingDrop, updateClaimStatus]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4">
        {STAGES.map((stage) => {
          const stageClaims = claimsByStage[stage.key] || [];
          return (
            <div
              key={stage.key}
              className="w-80 flex-shrink-0"
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(stage.key);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                // Get claim ID from dataTransfer as backup
                const claimId = e.dataTransfer.getData("text/plain") || draggingRef.current;
                if (claimId) void handleDrop(stage.key, claimId);
              }}
            >
              <div
                className={`${card} h-full transition-all ${
                  dragOverStage === stage.key
                    ? "bg-blue-50 ring-2 ring-blue-500 ring-opacity-50 dark:bg-blue-900 dark:bg-opacity-10"
                    : ""
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[color:var(--text)]">{stage.label}</h3>
                  <span className="rounded bg-[var(--surface-2)] px-2 py-1 text-xs font-bold text-[color:var(--muted)]">
                    {stageClaims.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {stageClaims.map((claim) => {
                    const isProcessing = processingClaims.has(claim.id);
                    return (
                      <div
                        key={claim.id}
                        draggable={!isProcessing}
                        onDragStart={(e) => {
                          // Store claim ID in dataTransfer for reliable retrieval
                          e.dataTransfer.setData("text/plain", claim.id);
                          e.dataTransfer.effectAllowed = "move";
                          handleDragStart(claim.id);
                        }}
                        onDragEnd={handleDragEnd}
                        className={`p-3 ${stage.color} cursor-move rounded-lg transition-all hover:shadow-lg ${
                          draggingId === claim.id ? "scale-95 opacity-50" : ""
                        } ${isProcessing ? "animate-pulse cursor-wait opacity-70" : ""}`}
                      >
                        <div className="mb-1 flex items-center gap-1 font-mono text-xs text-[color:var(--muted)]">
                          <span>📄</span>
                          <span>{claim.claimNumber}</span>
                          {isProcessing && (
                            <span className="ml-auto text-blue-500">
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="mb-1 flex items-center gap-1 text-sm font-semibold text-[color:var(--text)]">
                          <span>👤</span>
                          <span>{claim.insured_name || "Unknown"}</span>
                        </div>
                        <div className="mb-2 flex items-center gap-1 text-xs text-[color:var(--muted)]">
                          <span>📍</span>
                          <span>{claim.property.street}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-bold text-[color:var(--primary)]">
                          <span>💰</span>
                          <span>
                            $
                            {((claim.exposureCents || 0) / 100).toLocaleString("en-US", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Suggestion Modal */}
      {showAiModal && aiSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="text-3xl">🤖</div>
              <div>
                <h3 className="text-xl font-bold text-[color:var(--text)]">AI Recommendation</h3>
                <p className="text-sm text-[color:var(--muted)]">
                  Confidence: {aiSuggestion.confidence}%
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900 dark:bg-opacity-20">
              <p className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
                Suggested Status:{" "}
                <span className="rounded bg-blue-600 px-2 py-1 text-white">
                  {aiSuggestion.suggestedStatus}
                </span>
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">{aiSuggestion.reasoning}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAcceptAiSuggestion}
                className="flex-1 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-3 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
              >
                ✅ Accept AI Suggestion
              </button>
              <button
                onClick={handleRejectAiSuggestion}
                className="flex-1 rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 font-semibold text-[color:var(--text)] transition hover:bg-[var(--surface-3)]"
              >
                Keep My Choice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
