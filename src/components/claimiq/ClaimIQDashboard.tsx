"use client";

import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Cloud,
  FileText,
  Loader2,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors the API response)
// ─────────────────────────────────────────────────────────────────────────────

type SectionStatus = "ready" | "partial" | "missing" | "manual";

interface SectionReadiness {
  key: string;
  label: string;
  number: number;
  required: boolean;
  status: SectionStatus;
  completeness: number;
  availableSources: string[];
  missingItems: string[];
  nextAction: string | null;
  canAutoGenerate: boolean;
  hasExistingContent: boolean;
}

interface ClaimIQReadiness {
  claimId: string;
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  sections: SectionReadiness[];
  readySections: number;
  partialSections: number;
  missingSections: number;
  topActions: string[];
  layers: {
    vision: { ready: boolean; photoCount: number; detectionCount: number };
    weather: { ready: boolean; hasVerification: boolean };
    documentation: { ready: boolean; generatedDocs: number };
    workflow: { ready: boolean; claimStatus: string };
  };
}

interface ClaimIQDashboardProps {
  claimId: string;
  compact?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ClaimIQDashboard({ claimId, compact = false, className }: ClaimIQDashboardProps) {
  const [readiness, setReadiness] = useState<ClaimIQReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReadiness = useCallback(
    async (isBackground = false) => {
      try {
        if (!isBackground) setLoading(true);
        const res = await fetch(`/api/claims/${claimId}/claimiq/readiness`);
        if (!res.ok) throw new Error("Failed to fetch readiness");
        const data = await res.json();
        setReadiness(data);
      } catch (err) {
        if (!isBackground) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [claimId]
  );

  // Initial fetch + auto-poll every 30s for live readiness updates
  useEffect(() => {
    void fetchReadiness();
    const interval = setInterval(() => fetchReadiness(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchReadiness]);

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-500">Analyzing claim readiness...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !readiness) {
    return (
      <Card className={cn("border-red-200 dark:border-red-800", className)}>
        <CardContent className="py-6 text-center text-sm text-red-500">
          {error || "Unable to assess readiness"}
        </CardContent>
      </Card>
    );
  }

  if (compact) return <CompactView readiness={readiness} claimId={claimId} className={className} />;

  return <FullView readiness={readiness} claimId={claimId} className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Dashboard View
// ─────────────────────────────────────────────────────────────────────────────

function FullView({
  readiness,
  claimId,
  className,
}: {
  readiness: ClaimIQReadiness;
  claimId: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Hero Score Card */}
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white dark:from-slate-950 dark:to-slate-900">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <h2 className="text-lg font-bold">Claims Assembly Engine</h2>
              </div>
              <p className="text-sm text-slate-300">
                Packet readiness assessment — auto-fill status for all 17 sections
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black">{readiness.overallScore}%</div>
              <GradeBadge grade={readiness.overallGrade} />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                readiness.overallScore >= 80
                  ? "bg-emerald-500"
                  : readiness.overallScore >= 60
                    ? "bg-yellow-500"
                    : readiness.overallScore >= 40
                      ? "bg-orange-500"
                      : "bg-red-500"
              )}
              style={{ width: `${readiness.overallScore}%` }}
            />
          </div>

          {/* Layer Status Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <LayerPill
              icon={<Camera className="h-3.5 w-3.5" />}
              label={`Vision: ${readiness.layers.vision.photoCount} photos, ${readiness.layers.vision.detectionCount} analyzed`}
              active={readiness.layers.vision.ready}
            />
            <LayerPill
              icon={<Cloud className="h-3.5 w-3.5" />}
              label={`Weather: ${readiness.layers.weather.ready ? "Verified" : "Not run"}`}
              active={readiness.layers.weather.ready}
            />
            <LayerPill
              icon={<FileText className="h-3.5 w-3.5" />}
              label={`Docs: ${readiness.layers.documentation.generatedDocs} generated`}
              active={readiness.layers.documentation.ready}
            />
            <LayerPill
              icon={<Wrench className="h-3.5 w-3.5" />}
              label={`Workflow: ${readiness.layers.workflow.claimStatus}`}
              active={readiness.layers.workflow.ready}
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Actions */}
      {readiness.topActions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4" />
              What&apos;s Needed Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readiness.topActions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-white/80 p-2.5 text-sm dark:bg-slate-800/80"
                >
                  <span className="font-medium text-amber-800 dark:text-amber-200">{action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Counts */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{readiness.readySections}</div>
            <div className="text-xs text-gray-500">Ready</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{readiness.partialSections}</div>
            <div className="text-xs text-gray-500">Partial</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-red-600">{readiness.missingSections}</div>
            <div className="text-xs text-gray-500">Needs Data</div>
          </CardContent>
        </Card>
      </div>

      {/* All 17 Sections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            17-Section Packet — Section-by-Section Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {readiness.sections.map((section) => (
            <SectionRow key={section.key} section={section} claimId={claimId} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact View (for sidebar / overview cards)
// ─────────────────────────────────────────────────────────────────────────────

function CompactView({
  readiness,
  claimId,
  className,
}: {
  readiness: ClaimIQReadiness;
  claimId: string;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-semibold">Claims Assembly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{readiness.overallScore}%</span>
            <GradeBadge grade={readiness.overallGrade} size="sm" />
          </div>
        </div>

        {/* Mini progress */}
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              readiness.overallScore >= 80
                ? "bg-emerald-500"
                : readiness.overallScore >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
            )}
            style={{ width: `${readiness.overallScore}%` }}
          />
        </div>

        {/* Quick counts */}
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-emerald-600">✓ {readiness.readySections} ready</span>
          <span className="text-yellow-600">◐ {readiness.partialSections} partial</span>
          <span className="text-red-600">○ {readiness.missingSections} missing</span>
        </div>

        {/* Top action */}
        {readiness.topActions[0] && (
          <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <strong>Next:</strong> {readiness.topActions[0]}
          </div>
        )}

        <Link href={`/claims-ready-folder/${claimId}`}>
          <Button variant="outline" size="sm" className="mt-3 w-full gap-1 text-xs">
            Open Claims Assembly <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionRow({ section, claimId }: { section: SectionReadiness; claimId: string }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig: Record<
    SectionStatus,
    { icon: React.ReactNode; color: string; bg: string; label: string }
  > = {
    ready: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      label: "Ready",
    },
    partial: {
      icon: <Sparkles className="h-4 w-4" />,
      color: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      label: "Partial",
    },
    missing: {
      icon: <AlertCircle className="h-4 w-4" />,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-950/30",
      label: "Missing",
    },
    manual: {
      icon: <FileText className="h-4 w-4" />,
      color: "text-gray-500",
      bg: "bg-gray-50 dark:bg-gray-800",
      label: "Manual",
    },
  };

  const config = statusConfig[section.status];

  return (
    <div className={cn("rounded-lg border", config.bg)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        {/* Section number */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm dark:bg-slate-700">
          {section.number}
        </span>

        {/* Status icon */}
        <span className={config.color}>{config.icon}</span>

        {/* Label */}
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {section.label}
          </span>
          {section.required && (
            <span className="ml-1.5 text-[10px] font-semibold uppercase text-red-400">
              required
            </span>
          )}
        </div>

        {/* Completeness bar */}
        <div className="hidden w-20 sm:block">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
            <div
              className={cn(
                "h-full rounded-full",
                section.completeness >= 80
                  ? "bg-emerald-500"
                  : section.completeness >= 50
                    ? "bg-yellow-500"
                    : "bg-red-400"
              )}
              style={{ width: `${section.completeness}%` }}
            />
          </div>
        </div>

        {/* Status badge */}
        <Badge variant="outline" className={cn("text-[10px]", config.color)}>
          {config.label}
        </Badge>

        <ChevronRight
          className={cn("h-4 w-4 text-gray-400 transition-transform", expanded && "rotate-90")}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-2">
          {section.availableSources.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-[11px] font-semibold uppercase text-emerald-600">
                ✓ Data Available
              </p>
              {section.availableSources.map((s, i) => (
                <p key={i} className="text-xs text-gray-600 dark:text-gray-400">
                  • {s}
                </p>
              ))}
            </div>
          )}

          {section.missingItems.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 text-[11px] font-semibold uppercase text-red-500">
                ✗ Still Needed
              </p>
              {section.missingItems.map((m, i) => (
                <p key={i} className="text-xs text-gray-600 dark:text-gray-400">
                  • {m}
                </p>
              ))}
            </div>
          )}

          {section.canAutoGenerate && section.status !== "ready" && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="gap-1 bg-purple-100 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                <Sparkles className="h-3 w-3" />
                Can be AI-generated
              </Badge>
            </div>
          )}

          <Link
            href={`/claims-ready-folder/${claimId}/sections/${section.key}`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            Open section <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function GradeBadge({ grade, size = "md" }: { grade: string; size?: "sm" | "md" }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-500 text-white",
    B: "bg-blue-500 text-white",
    C: "bg-yellow-500 text-white",
    D: "bg-orange-500 text-white",
    F: "bg-red-500 text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-bold",
        colors[grade] || "bg-gray-500 text-white",
        size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs"
      )}
    >
      {grade}
    </span>
  );
}

function LayerPill({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-600/40 text-slate-400"
      )}
    >
      {icon}
      {label}
    </div>
  );
}
