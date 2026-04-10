/**
 * AI Results Panel
 *
 * Displays AI analysis results with visual overlays, tags, and confidence scores.
 */

"use client";

import {
  AlertCircle,
  Box,
  Brain,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface AIResult {
  task: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
  confidence: number;
  executionTime: number;
  timestamp: string;
}

interface ClaimAIMetadata {
  triage?: AIResult;
  damageAssessment?: AIResult;
  videoAnalysis?: AIResult;
  blueprintAnalysis?: AIResult;
  policyOptimization?: AIResult;
  history: AIResult[];
}

interface AIResultsPanelProps {
  claimId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function AIResultsPanel({
  claimId,
  autoRefresh = false,
  refreshInterval = 5000,
}: AIResultsPanelProps) {
  const [analysis, setAnalysis] = useState<ClaimAIMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    triage: true,
    damage: true,
    video: true,
    blueprint: true,
    policy: true,
  });

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/ai`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch AI analysis");
      }

      setAnalysis(data.analysis);
      setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error("[AIResultsPanel] Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnalysis();

    if (autoRefresh) {
      const interval = setInterval(fetchAnalysis, refreshInterval);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, autoRefresh, refreshInterval]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderConfidenceBar = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    const color =
      percentage >= 80 ? "bg-green-500" : percentage >= 60 ? "bg-yellow-500" : "bg-red-500";

    return (
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
        </div>
        <span className="text-sm font-medium text-slate-700">{percentage}%</span>
      </div>
    );
  };

  const renderResultSection = (
    title: string,
    icon: React.ReactNode,
    result: AIResult | undefined,
    sectionKey: string
  ) => {
    if (!result) return null;

    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex w-full items-center justify-between bg-slate-50 p-4 transition-colors hover:bg-slate-100"
        >
          <div className="flex items-center gap-3">
            {icon}
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-3 w-3" />
                {result.executionTime}ms
                <span className="text-slate-400">•</span>
                {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-4 p-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">Confidence</h4>
              {renderConfidenceBar(result.confidence)}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">Task</h4>
              <code className="rounded bg-slate-100 px-2 py-1 text-sm">{result.task}</code>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-700">Output</h4>
              <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
                {JSON.stringify(result.output, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-slate-600">
          <Brain className="h-5 w-5 animate-pulse" />
          Loading AI analysis...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  if (!analysis || analysis.history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-600">
        <Brain className="mb-4 h-12 w-12 text-slate-400" />
        <p className="text-lg font-medium">No AI analysis available yet</p>
        <p className="text-sm text-slate-500">Trigger an analysis to see results here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">AI Analysis Results</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          {analysis.history.length} {analysis.history.length === 1 ? "analysis" : "analyses"}{" "}
          completed
        </div>
      </div>

      {renderResultSection(
        "Claim Triage",
        <FileText className="h-5 w-5 text-green-600" />,
        analysis.triage,
        "triage"
      )}
      {renderResultSection(
        "Damage Assessment",
        <Camera className="h-5 w-5 text-blue-600" />,
        analysis.damageAssessment,
        "damage"
      )}
      {renderResultSection(
        "Video Analysis",
        <Camera className="h-5 w-5 text-purple-600" />,
        analysis.videoAnalysis,
        "video"
      )}
      {renderResultSection(
        "Blueprint Analysis",
        <Box className="h-5 w-5 text-indigo-600" />,
        analysis.blueprintAnalysis,
        "blueprint"
      )}
      {renderResultSection(
        "Policy Optimization",
        <Zap className="h-5 w-5 text-orange-600" />,
        analysis.policyOptimization,
        "policy"
      )}
    </div>
  );
}
