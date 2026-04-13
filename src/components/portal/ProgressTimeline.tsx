"use client";

import {
  Camera,
  Check,
  ClipboardCheck,
  FileText,
  Hammer,
  Home,
  Search,
  Shield,
  ThumbsUp,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ClaimStage =
  | "submitted"
  | "reviewing"
  | "inspection_scheduled"
  | "inspection_complete"
  | "estimate_ready"
  | "approved"
  | "in_progress"
  | "quality_check"
  | "completed";

interface ProgressTimelineProps {
  currentStage: ClaimStage;
  stageDetails?: Partial<Record<ClaimStage, { date?: string; note?: string }>>;
  className?: string;
}

const STAGES: { key: ClaimStage; label: string; icon: React.ReactNode; description: string }[] = [
  {
    key: "submitted",
    label: "Claim Submitted",
    icon: <Upload className="h-4 w-4" />,
    description: "Your claim has been received",
  },
  {
    key: "reviewing",
    label: "Under Review",
    icon: <Search className="h-4 w-4" />,
    description: "Our team is reviewing your photos and information",
  },
  {
    key: "inspection_scheduled",
    label: "Inspection Scheduled",
    icon: <ClipboardCheck className="h-4 w-4" />,
    description: "A professional inspection has been scheduled",
  },
  {
    key: "inspection_complete",
    label: "Inspection Complete",
    icon: <Camera className="h-4 w-4" />,
    description: "Property inspection has been completed",
  },
  {
    key: "estimate_ready",
    label: "Estimate Ready",
    icon: <FileText className="h-4 w-4" />,
    description: "Your repair estimate is ready for review",
  },
  {
    key: "approved",
    label: "Approved",
    icon: <ThumbsUp className="h-4 w-4" />,
    description: "Your claim has been approved",
  },
  {
    key: "in_progress",
    label: "Work In Progress",
    icon: <Hammer className="h-4 w-4" />,
    description: "Repairs are underway",
  },
  {
    key: "quality_check",
    label: "Quality Check",
    icon: <Shield className="h-4 w-4" />,
    description: "Final quality inspection",
  },
  {
    key: "completed",
    label: "Completed",
    icon: <Home className="h-4 w-4" />,
    description: "Your project is complete!",
  },
];

export function ProgressTimeline({
  currentStage,
  stageDetails = {},
  className,
}: ProgressTimelineProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className={cn("", className)}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Claim Progress</span>
          <span className="text-sm text-muted-foreground">
            Step {currentIndex + 1} of {STAGES.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#117CFF] to-[#0066DD] transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / STAGES.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {STAGES.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const details = stageDetails[stage.key];

          return (
            <div key={stage.key} className="relative">
              {/* Connector Line */}
              {index < STAGES.length - 1 && (
                <div
                  className={cn(
                    "absolute left-5 top-10 -ml-px h-8 w-0.5",
                    isCompleted ? "bg-[#117CFF]" : "bg-muted"
                  )}
                />
              )}

              <div
                className={cn(
                  "flex items-start gap-4 rounded-xl p-3 transition-all",
                  isCurrent && "border border-[#117CFF]/20 bg-[#117CFF]/5",
                  isCompleted && "opacity-70"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isCompleted && "bg-[#117CFF] text-white",
                    isCurrent && "bg-[#117CFF] text-white ring-4 ring-[#117CFF]/20",
                    isPending && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stage.icon}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("font-medium", isPending && "text-muted-foreground")}>
                      {stage.label}
                    </p>
                    {details?.date && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(details.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{stage.description}</p>
                  {details?.note && isCurrent && (
                    <p className="mt-1 text-sm font-medium text-[#117CFF]">{details.note}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple version for compact display
export function ProgressTimelineCompact({
  currentStage,
  className,
}: {
  currentStage: ClaimStage;
  className?: string;
}) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const current = STAGES[currentIndex];

  return (
    <div className={cn("", className)}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#117CFF] text-white">
          {current.icon}
        </div>
        <div>
          <p className="font-medium">{current.label}</p>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>
      </div>

      <div className="flex gap-1">
        {STAGES.map((stage, index) => (
          <div
            key={stage.key}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index <= currentIndex ? "bg-[#117CFF]" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
