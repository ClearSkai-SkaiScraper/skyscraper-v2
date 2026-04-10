"use client";
import { useState } from "react";

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

export default function ClaimsPipeline({ claims = [] }: { claims: ClaimCard[] }) {
  const [dragging, setDragging] = useState<string | null>(null);
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

  const claimsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.key] = claims.filter((c) => c.lifecycleStage === stage.key);
      return acc;
    },
    {} as Record<ClaimStage, ClaimCard[]>
  );

  const handleDragStart = (claim_id: string) => {
    setDragging(claim_id);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOverStage(null);
  };

  const handleDragOver = (stage: ClaimStage) => {
    if (dragging) {
      setDragOverStage(stage);
    }
  };

  const handleDrop = async (stage: ClaimStage, claim_id: string) => {
    setDragging(null);
    setDragOverStage(null);
    setPendingDrop({ stage, claimId: claim_id });

    // Get AI suggestion for this claim
    try {
      const aiRes = await fetch("/api/ai/suggest-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId: claim_id }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        setAiSuggestion(aiData);

        // Trigger notification about AI suggestion
        triggerNotification({
          message: `AI suggests ${aiData.suggestedStatus} for claim ${claim_id.substring(0, 8)}`,
          id: claim_id,
          type: "ai_suggestion",
        });

        // If AI suggests something different than user's drop, show modal
        if (aiData.suggestedStatus !== stage && aiData.confidence > 60) {
          setShowAiModal(true);
          return; // Wait for user decision
        }
      }
    } catch (_err) {
      logger.debug("AI suggestion unavailable, proceeding with manual update");
    }

    // If no AI suggestion or low confidence, proceed with manual update
    await updateClaimStatus(claim_id, stage);
  };

  const updateClaimStatus = async (claim_id: string, stage: ClaimStage) => {
    try {
      await fetch(`/api/claims/${claim_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStage: stage }),
        cache: "no-store",
      });
      window.location.reload(); // Refresh to show updated state
    } catch (err) {
      logger.error("Failed to update claim stage:", err);
    }
  };

  const handleAcceptAiSuggestion = () => {
    if (aiSuggestion && pendingDrop) {
      void updateClaimStatus(pendingDrop.claimId, aiSuggestion.suggestedStatus as ClaimStage);
      setShowAiModal(false);
      setAiSuggestion(null);
      setPendingDrop(null);
    }
  };

  const handleRejectAiSuggestion = () => {
    if (pendingDrop) {
      void updateClaimStatus(pendingDrop.claimId, pendingDrop.stage);
      setShowAiModal(false);
      setAiSuggestion(null);
      setPendingDrop(null);
    }
  };

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
                if (dragging) void handleDrop(stage.key, dragging);
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
                  {stageClaims.map((claim) => (
                    <div
                      key={claim.id}
                      draggable
                      onDragStart={() => handleDragStart(claim.id)}
                      onDragEnd={handleDragEnd}
                      className={`p-3 ${stage.color} cursor-move rounded-lg transition-shadow hover:shadow-lg ${
                        dragging === claim.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1 font-mono text-xs text-[color:var(--muted)]">
                        <span>📄</span>
                        <span>{claim.claimNumber}</span>
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
                  ))}
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
