/**
 * AI Control Panel for Claim Detail Page
 *
 * The "wow factor" — surfaces all AI capabilities in one intuitive interface.
 * Shows real-time confidence, results, and recommended actions.
 */

"use client";

import {
  AlertCircle,
  Brain,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface AIControlPanelProps {
  claimId: string;
  hasPhotos?: boolean;
  hasVideo?: boolean;
  hasBlueprint?: boolean;
}

interface AITask {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
  lastRun?: Date;
  confidence?: number;
  status?: "idle" | "running" | "success" | "error";
  result?: any;
}

export function AIControlPanel({
  claimId,
  hasPhotos = false,
  hasVideo = false,
  hasBlueprint = false,
}: AIControlPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [tasks, setTasks] = useState<AITask[]>([
    {
      id: "triage",
      name: "Smart Triage",
      description: "Classify damage type, estimate complexity, suggest workflow",
      icon: <FileText className="h-5 w-5" />,
      color: "text-green-600 bg-green-50",
      enabled: true,
      status: "idle",
    },
    {
      id: "damage",
      name: "Damage Assessment",
      description: "Analyze photos for hail, wind, age, ponding, and severity",
      icon: <Camera className="h-5 w-5" />,
      color: "text-blue-600 bg-blue-50",
      enabled: hasPhotos,
      status: "idle",
    },
    {
      id: "video",
      name: "Video Analysis",
      description: "Extract motion, scenes, and damage insights from videos",
      icon: <Camera className="h-5 w-5" />,
      color: "text-purple-600 bg-purple-50",
      enabled: hasVideo,
      status: "idle",
    },
    {
      id: "blueprint",
      name: "Floor Plan Analysis",
      description: "Parse blueprints, extract rooms, measurements, and 3D model",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-indigo-600 bg-indigo-50",
      enabled: hasBlueprint,
      status: "idle",
    },
    {
      id: "policy",
      name: "Workflow Optimizer",
      description: "AI-powered next-best actions and resource allocation",
      icon: <Zap className="h-5 w-5" />,
      color: "text-orange-600 bg-orange-50",
      enabled: true,
      status: "idle",
    },
  ]);

  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatingEnhanced, setGeneratingEnhanced] = useState(false);

  // Fetch existing analysis on mount
  useEffect(() => {
    fetchAnalysis();
  }, [claimId]);

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/ai`);
      const data = await response.json();

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        updateTasksFromAnalysis(data.analysis);
      }
    } catch (error) {
      logger.error("[AIControlPanel] Failed to fetch analysis:", error);
    }
  };

  const updateTasksFromAnalysis = (analysis: any) => {
    setTasks((prev) =>
      prev.map((task) => {
        const key = `${task.id}Analysis` === "triageAnalysis" ? "triage" : `${task.id}Assessment`;
        const result = analysis[key] || analysis[task.id];

        if (result) {
          return {
            ...task,
            status: "success" as const,
            confidence: result.confidence,
            lastRun: new Date(result.timestamp),
            result: result.output,
          };
        }
        return task;
      })
    );
  };

  const runTask = async (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "running" as const } : t))
    );

    try {
      const response = await fetch(`/api/claims/${claimId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: taskId }),
      });

      const data = await response.json();

      if (data.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "success" as const,
                  confidence: data.result?.data?.confidence || 0.85,
                  lastRun: new Date(),
                  result: data.result?.data,
                }
              : t
          )
        );

        // Refresh full analysis
        await fetchAnalysis();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      logger.error(`[AIControlPanel] Task ${taskId} failed:`, error);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "error" as const } : t))
      );
    }
  };

  const runAllEnabled = async () => {
    setLoading(true);
    const enabledTasks = tasks.filter((t) => t.enabled);

    for (const task of enabledTasks) {
      await runTask(task.id);
    }

    setLoading(false);
  };

  const [photoCount, setPhotoCount] = useState(0);
  const [photoCheckComplete, setPhotoCheckComplete] = useState(false);

  // Check photo count on mount
  useEffect(() => {
    const checkPhotos = async () => {
      try {
        const response = await fetch(`/api/claims/${claimId}/photos`);
        if (response.ok) {
          const data = await response.json();
          setPhotoCount(data.photos?.length || 0);
        }
      } catch (error) {
        logger.error("[AIControlPanel] Failed to check photos:", error);
      } finally {
        setPhotoCheckComplete(true);
      }
    };

    checkPhotos();
  }, [claimId]);

  const generateReport = async () => {
    // Double-check photo count
    if (photoCount === 0) {
      alert("Please upload at least 1-3 roof damage photos before generating a report.");
      return;
    }

    setGeneratingReport(true);

    try {
      logger.debug("[AIControlPanel] Fetching photos for claim:", claimId);

      // Fetch photos for the claim
      const photosResponse = await fetch(`/api/claims/${claimId}/photos`);

      if (!photosResponse.ok) {
        throw new Error(`Failed to fetch photos: ${photosResponse.status}`);
      }

      const photosData = await photosResponse.json();
      logger.debug("[AIControlPanel] Photos response:", photosData);

      // Map to photo URLs (handle both photoUrl and publicUrl field names)
      const images =
        photosData.photos?.map((p: any) => p.publicUrl || p.photoUrl).filter(Boolean) || [];

      if (images.length === 0) {
        alert("No photos found. Upload at least 1-3 roof photos before generating report.");
        setGeneratingReport(false);
        return;
      }

      logger.debug(`[AIControlPanel] Generating report with ${images.length} images`);

      const response = await fetch("/api/ai/report-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          images,
          property: {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      logger.debug("[AIControlPanel] Report generated, opening PDF...");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Open in new tab
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (!newWindow) {
        // Fallback if popup blocked
        const link = document.createElement("a");
        link.href = url;
        link.download = `SkaiScraper_Report_${claimId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Cleanup object URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error: any) {
      logger.error("[AIControlPanel] Report generation failed:", error);
      alert(
        `Failed to generate report: ${error.message || "Unknown error"}\n\nPlease check that photos are uploaded and try again.`
      );
    } finally {
      setGeneratingReport(false);
    }
  };

  /**
   * Generate Enhanced Professional Report
   * Includes: weather, materials, annotations, compliance, branding
   */
  const generateEnhancedReport = async () => {
    setGeneratingEnhanced(true);

    try {
      logger.debug("[AIControlPanel] Generating enhanced professional report...");

      const response = await fetch("/api/ai/enhanced-report-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          options: {
            includeWeather: true,
            includeAnnotations: true,
            includeCompliance: true,
            includeMaterials: true,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      logger.debug("[AIControlPanel] Enhanced report generated, opening PDF...");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Open in new tab
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");

      if (!newWindow) {
        // Fallback if popup blocked
        const link = document.createElement("a");
        link.href = url;
        link.download = `Professional-Damage-Report-${claimId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Cleanup object URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error: any) {
      logger.error("[AIControlPanel] Enhanced report generation failed:", error);
      alert(
        `Failed to generate enhanced report: ${error.message || "Unknown error"}\n\nPlease check that photos are uploaded and property details are complete.`
      );
    } finally {
      setGeneratingEnhanced(false);
    }
  };

  const renderConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;

    const percentage = Math.round(confidence * 100);
    const color =
      percentage >= 80
        ? "bg-green-100 text-green-800"
        : percentage >= 60
          ? "bg-yellow-100 text-yellow-800"
          : "bg-red-100 text-red-800";

    return (
      <span className={`rounded px-2 py-1 text-xs font-semibold ${color}`}>
        {percentage}% confident
      </span>
    );
  };

  const renderTaskButton = (task: AITask) => {
    const isRunning = task.status === "running";
    const isSuccess = task.status === "success";
    const isError = task.status === "error";

    return (
      <button
        onClick={() => runTask(task.id)}
        disabled={!task.enabled || isRunning}
        className={`flex w-full items-center justify-between rounded-lg border-2 p-4 transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${isSuccess ? "border-green-500 bg-green-50" : ""} ${isError ? "border-red-500 bg-red-50" : ""} ${!isSuccess && !isError ? "border-slate-200 hover:border-blue-400" : ""} `}
      >
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${task.color}`}>{task.icon}</div>
          <div className="text-left">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              {task.name}
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              {isError && <AlertCircle className="h-4 w-4 text-red-600" />}
            </div>
            <div className="text-sm text-slate-600">{task.description}</div>
            {task.lastRun && (
              <div className="mt-1 text-xs text-slate-500">
                Last run: {task.lastRun.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {renderConfidenceBadge(task.confidence)}
          {isRunning ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          ) : (
            <Sparkles className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>
    );
  };

  const successCount = tasks.filter((t) => t.status === "success").length;
  const enabledCount = tasks.filter((t) => t.enabled).length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 p-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="-m-2 flex w-full items-center justify-between rounded p-2 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-indigo p-2">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-slate-900">AI Control Panel</h3>
              <p className="text-sm text-slate-600">
                {successCount} of {enabledCount} analyses complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {photoCheckComplete && photoCount === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertCircle className="h-4 w-4" />
                <span>Upload 1-3 roof photos to enable report generation</span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateReport();
              }}
              disabled={generatingReport || !photoCheckComplete || photoCount === 0}
              title={photoCount === 0 ? "Upload photos first" : "Generate basic PDF report"}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Basic Report
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateEnhancedReport();
              }}
              disabled={generatingEnhanced || !photoCheckComplete || photoCount === 0}
              title={
                photoCount === 0
                  ? "Upload photos first"
                  : "Generate comprehensive 20-40 page professional report with weather, materials, annotations, compliance"
              }
              className="flex items-center gap-2 rounded-lg bg-gradient-purple px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generatingEnhanced ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Pro...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Pro Report
                </>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                runAllEnabled();
              }}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run All
                </>
              )}
            </button>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </button>
      </div>

      {/* Tasks */}
      {expanded && (
        <div className="space-y-3 p-4">
          {tasks.map((task) => (
            <div key={task.id}>{renderTaskButton(task)}</div>
          ))}

          {/* Quick Stats */}
          {analysis && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                <TrendingUp className="h-4 w-4" />
                AI Insights Summary
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">Total Analyses</div>
                  <div className="text-xl font-bold text-slate-900">
                    {analysis.history?.length || 0}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">Avg Confidence</div>
                  <div className="text-xl font-bold text-slate-900">
                    {analysis.history?.length
                      ? Math.round(
                          (analysis.history.reduce(
                            (sum: number, h: any) => sum + (h.confidence || 0),
                            0
                          ) /
                            analysis.history.length) *
                            100
                        )
                      : 0}
                    %
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
