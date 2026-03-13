"use client";

/**
 * ClaimIQ™ — Packet Generation Panel
 *
 * Smart packet generation with 4 modes:
 *   1. "Generate Ready Sections" — only sections at ≥75% completeness
 *   2. "Threshold Generate" — full packet when minimum score is met
 *   3. "Selected Sections" — user picks which sections to include
 *   4. "Full Packet" — generate everything possible
 *
 * Shows live progress, section-by-section status, and export options.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useClaimIQStore } from "@/stores/claimIQStore";
import { Check, Download, FileText, Loader2, Package, Sparkles, Zap } from "lucide-react";
import { useCallback, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PacketGenerationPanelProps {
  claimId: string;
  className?: string;
}

type GenerateMode = "ready-only" | "threshold" | "selected" | "all";

interface GenerationResult {
  sectionKey: string;
  label: string;
  success: boolean;
  error?: string;
  durationMs: number;
}

interface PacketResponse {
  success: boolean;
  mode: GenerateMode;
  results: GenerationResult[];
  summary: {
    generated: number;
    failed: number;
    totalDurationMs: number;
    skippedSections: number;
  };
  readiness: {
    before: { score: number; grade: string };
    after: { score: number; grade: string };
    delta: number;
  };
  error?: string;
  suggestedActions?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function PacketGenerationPanel({ claimId, className }: PacketGenerationPanelProps) {
  const [mode, setMode] = useState<GenerateMode>("ready-only");
  const [threshold, setThreshold] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [response, setResponse] = useState<PacketResponse | null>(null);
  const [error, setError] = useState("");

  const {
    readiness,
    selectedSections,
    startPacketGeneration,
    updatePacketProgress,
    completePacketGeneration,
    failPacketGeneration,
    refreshAfterChange,
  } = useClaimIQStore();

  const readySectionCount =
    readiness?.sections.filter((s) => s.completeness >= 75 || s.status === "ready").length || 0;

  const canGenerate =
    mode === "ready-only"
      ? readySectionCount > 0
      : mode === "threshold"
        ? (readiness?.overallScore || 0) >= threshold
        : mode === "selected"
          ? selectedSections.length > 0
          : true;

  // ── Generate ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError("");
    setResponse(null);
    startPacketGeneration();

    try {
      const body: Record<string, unknown> = { claimId, mode };
      if (mode === "threshold") body.threshold = threshold;
      if (mode === "selected") body.sectionKeys = selectedSections;

      const res = await fetch("/api/claims-folder/generate/packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data: PacketResponse = await res.json();

      if (data.success) {
        setResponse(data);
        completePacketGeneration();
        refreshAfterChange(claimId, "packet_generation");
      } else {
        setError(data.error || "Generation failed");
        failPacketGeneration(data.error || "Failed");
        if (data.suggestedActions) {
          setResponse(data as any);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      failPacketGeneration(msg);
    } finally {
      setGenerating(false);
    }
  }, [
    claimId,
    mode,
    threshold,
    selectedSections,
    startPacketGeneration,
    completePacketGeneration,
    failPacketGeneration,
    refreshAfterChange,
  ]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 pb-3 dark:from-indigo-950/30 dark:to-blue-950/30">
        <CardTitle className="flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300">
          <Package className="h-4.5 w-4.5" />
          Packet Generation
        </CardTitle>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Smart generation — only build what&apos;s ready, or wait for threshold
        </p>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={mode === "ready-only"}
            onClick={() => setMode("ready-only")}
            icon={<Check className="h-3.5 w-3.5" />}
            label="Ready Only"
            description={`${readySectionCount} sections ready`}
          />
          <ModeButton
            active={mode === "threshold"}
            onClick={() => setMode("threshold")}
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Threshold"
            description={`Score ≥ ${threshold}%`}
          />
          <ModeButton
            active={mode === "selected"}
            onClick={() => setMode("selected")}
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Selected"
            description={`${selectedSections.length} chosen`}
          />
          <ModeButton
            active={mode === "all"}
            onClick={() => setMode("all")}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            label="Full Packet"
            description="Generate all"
          />
        </div>

        {/* Threshold slider (for threshold mode) */}
        {mode === "threshold" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Minimum Score Threshold</span>
              <span className="font-bold text-indigo-600">{threshold}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={95}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600 dark:bg-gray-700"
            />
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>30% (Minimum)</span>
              <span>95% (Near-perfect)</span>
            </div>
            {readiness && (
              <p
                className={cn(
                  "text-xs",
                  readiness.overallScore >= threshold ? "text-emerald-600" : "text-red-500"
                )}
              >
                Current score: {readiness.overallScore}%{" "}
                {readiness.overallScore >= threshold
                  ? "✓ Meets threshold"
                  : `✗ ${threshold - readiness.overallScore}% below threshold`}
              </p>
            )}
          </div>
        )}

        {/* Generate Button */}
        <Button
          className="w-full gap-2"
          disabled={!canGenerate || generating}
          onClick={handleGenerate}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate{" "}
              {mode === "ready-only"
                ? `${readySectionCount} Ready Sections`
                : mode === "threshold"
                  ? "When Threshold Met"
                  : mode === "selected"
                    ? `${selectedSections.length} Sections`
                    : "Full Packet"}
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {response?.results && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-500">Generation Results</h4>

            {/* Score delta */}
            {response.readiness && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                <span className="text-xs text-gray-500">Readiness:</span>
                <span className="text-sm font-bold">
                  {response.readiness.before.score}% → {response.readiness.after.score}%
                </span>
                {response.readiness.delta > 0 && (
                  <Badge className="bg-emerald-100 text-xs text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    +{response.readiness.delta}%
                  </Badge>
                )}
              </div>
            )}

            {/* Per-section results */}
            {response.results.map((r) => (
              <div
                key={r.sectionKey}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2 text-sm",
                  r.success
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                    : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                )}
              >
                {r.success ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <span className="h-4 w-4 shrink-0 text-red-500">✗</span>
                )}
                <span className="flex-1 font-medium">{r.label}</span>
                <span className="text-xs text-gray-400">{(r.durationMs / 1000).toFixed(1)}s</span>
              </div>
            ))}

            {/* Summary */}
            <p className="text-xs text-gray-500">
              {response.summary.generated} generated · {response.summary.failed} failed ·{" "}
              {(response.summary.totalDurationMs / 1000).toFixed(1)}s total
            </p>

            {/* Export button */}
            {response.summary.generated > 0 && (
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={`/claims-ready-folder/${claimId}?tab=preview`}>
                  <Download className="h-4 w-4" />
                  Export Packet
                </a>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component
// ─────────────────────────────────────────────────────────────────────────────

function ModeButton({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
        active
          ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200 dark:border-indigo-700 dark:bg-indigo-950/30 dark:ring-indigo-800"
          : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      )}
    >
      <span
        className={cn(
          "shrink-0",
          active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "text-xs font-semibold",
            active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"
          )}
        >
          {label}
        </p>
        <p className="text-[10px] text-gray-400">{description}</p>
      </div>
    </button>
  );
}
