"use client";

import { ArrowRight, CheckCircle2, Clock, FileCheck, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CloseoutChecklist } from "@/components/jobs/CloseoutChecklist";
import { RequestCloseoutButton } from "@/components/jobs/RequestCloseoutButton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

// Lifecycle stages in order
const LIFECYCLE_STAGES = [
  { key: "FILED", label: "Filed", description: "Claim has been filed with carrier" },
  {
    key: "INSPECTION_SCHEDULED",
    label: "Inspection Scheduled",
    description: "Adjuster inspection is scheduled",
  },
  {
    key: "INSPECTION_COMPLETE",
    label: "Inspection Complete",
    description: "Inspection completed, awaiting decision",
  },
  { key: "APPROVED", label: "Approved", description: "Claim approved by carrier" },
  { key: "IN_PROGRESS", label: "In Progress", description: "Work is being performed" },
  { key: "WORK_COMPLETE", label: "Work Complete", description: "All work has been completed" },
  {
    key: "CLOSEOUT_PENDING",
    label: "Closeout Pending",
    description: "Awaiting final payments & documentation",
  },
  { key: "CLOSED", label: "Closed", description: "Claim fully closed out" },
];

interface ClaimData {
  id: string;
  title: string;
  status: string;
  lifecycle_stage: string | null;
}

export default function LifecyclePage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params?.claimId as string;

  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!claimId) return;
    void fetchClaim();
  }, [claimId]);

  async function fetchClaim() {
    try {
      const res = await fetch(`/api/claims/${claimId}`);
      if (res.ok) {
        const data = await res.json();
        setClaim(data.claim || data);
      }
    } catch (error) {
      logger.error("[LifecyclePage] Error fetching claim:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateLifecycleStage(stage: string) {
    if (updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle_stage: stage }),
      });
      if (res.ok) {
        setClaim((prev) => (prev ? { ...prev, lifecycle_stage: stage } : null));
        toast.success(`Stage updated to ${LIFECYCLE_STAGES.find((s) => s.key === stage)?.label}`);
      } else {
        toast.error("Failed to update stage");
      }
    } catch (error) {
      logger.error("[LifecyclePage] Error updating stage:", error);
      toast.error("Failed to update stage");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Claim not found</p>
      </div>
    );
  }

  const currentStageIndex = LIFECYCLE_STAGES.findIndex(
    (s) => s.key === (claim.lifecycle_stage || "FILED")
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Claim Lifecycle
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track progress and manage closeout for this claim
        </p>
      </div>

      {/* Lifecycle Progress */}
      <Card className="overflow-hidden border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/80">
        <div className="border-b border-slate-200/60 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 dark:border-slate-700/60 dark:from-blue-950/40 dark:to-indigo-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2.5 dark:bg-blue-900/50">
                <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Lifecycle Progress
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Current stage:{" "}
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {LIFECYCLE_STAGES.find((s) => s.key === claim.lifecycle_stage)?.label ||
                      "Filed"}
                  </span>
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
            >
              {currentStageIndex + 1} / {LIFECYCLE_STAGES.length}
            </Badge>
          </div>
        </div>

        <div className="p-6">
          <div className="relative">
            {/* Progress line */}
            <div className="absolute left-5 top-0 h-full w-0.5 bg-slate-200 dark:bg-slate-700" />
            <div
              className="absolute left-5 top-0 w-0.5 bg-blue-500 transition-all duration-300"
              style={{ height: `${((currentStageIndex + 1) / LIFECYCLE_STAGES.length) * 100}%` }}
            />

            {/* Stages */}
            <div className="space-y-4">
              {LIFECYCLE_STAGES.map((stage, index) => {
                const isPast = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isFuture = index > currentStageIndex;

                return (
                  <button
                    key={stage.key}
                    onClick={() => updateLifecycleStage(stage.key)}
                    disabled={updating}
                    className={`relative flex w-full items-start gap-4 rounded-xl p-4 text-left transition-all ${
                      isCurrent
                        ? "bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                        : isPast
                          ? "bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    {/* Status icon */}
                    <div
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        isPast
                          ? "border-green-500 bg-green-500 text-white"
                          : isCurrent
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isCurrent ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-semibold ${
                            isCurrent
                              ? "text-blue-700 dark:text-blue-300"
                              : isPast
                                ? "text-slate-700 dark:text-slate-300"
                                : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {stage.label}
                        </h3>
                        {isCurrent && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`mt-0.5 text-sm ${
                          isFuture
                            ? "text-slate-400 dark:text-slate-500"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {stage.description}
                      </p>
                    </div>

                    {/* Arrow indicator for clickable */}
                    {!isCurrent && (
                      <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Closeout Section */}
      <Card className="overflow-hidden border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/80">
        <div className="border-b border-slate-200/60 px-6 py-4 dark:border-slate-700/60">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Closeout Checklist
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete all items to close out this claim
          </p>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <RequestCloseoutButton
              entityId={claimId}
              entityType="claim"
              entityTitle={claim.title}
              currentStatus={claim.status}
              onCloseoutRequested={fetchClaim}
            />
          </div>
          <CloseoutChecklist entityId={claimId} entityType="claim" />
        </div>
      </Card>
    </div>
  );
}
