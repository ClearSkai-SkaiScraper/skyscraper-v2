"use client";

import { AlertCircle, Brain, Loader2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BATFPanel } from "@/components/ai/BATFPanel";
import { CarrierCompliancePanel } from "@/components/ai/CarrierCompliancePanel";
import DenialResponsePanel from "@/components/ai/DenialResponsePanel";
import StormImpactPanel from "@/components/ai/StormImpactPanel";
import { SupplementPanel } from "@/components/ai/SupplementPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAIStream } from "@/hooks/useAIStream";

import { DominusInsightCard } from "./DominusInsightCard";
import { DominusPhotoAnalysis } from "./DominusPhotoAnalysis";
import { DominusTabs } from "./DominusTabs";

interface DominusPanelProps {
  leadId: string;
}

interface AIData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiSummaryJson: any;
  aiUrgencyScore: number;
  aiNextActions: string[];
  aiJobType: string;
  aiMaterials: string[];
  aiFlags: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiImages: any[];
  aiConfidence: number;
}

export function DominusPanel({ leadId }: DominusPanelProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<AIData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    text: streamingText,
    isStreaming,
    startStream,
    cancelStream,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    error: streamError,
  } = useAIStream({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onComplete: async (fullText) => {
      await loadAIData();
      toast.success("Analysis Complete!", {
        description: "All insights have been updated",
      });
    },
    onError: (err) => {
      setError(err.message);
      toast.error("Analysis Failed", {
        description: err.message,
      });
    },
  });

  // Load AI data on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void loadAIData();
  }, [leadId]);

  async function loadAIData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/skai/lead/${leadId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAiData(data.lead);
      } else {
        setError(data.error || "Failed to load AI data");
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setError("Network error loading AI data");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    setError(null);
    toast.success("Analyzing with SkaiPDF...", {
        description: "Streaming analysis in real-time",
      });

    try {
      await startStream("/api/ai/stream/analyze", {
        leadId,
        type: "lead-analysis",
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      // Error handled by useAIStream hook
    }
  }

  const hasAIData = aiData && aiData.aiSummaryJson;

  return (
    <Card className="rounded-xl border bg-white shadow-md transition-shadow hover:shadow-lg dark:bg-neutral-900">
      <CardHeader className="px-6 py-5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-600" />
            SkaiPDF Intelligence
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={runAnalysis}
              disabled={isStreaming || loading}
              className="bg-gradient-to-r from-sky-600 to-blue-600 transition-all hover:scale-105 hover:from-sky-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isStreaming ? (
                <>
                  <Zap className="mr-2 h-4 w-4 animate-pulse" />
                  Streaming...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Run AI Analysis
                </>
              )}
            </Button>
            {isStreaming && (
              <Button
                onClick={cancelStream}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-6 py-5">
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-10 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="h-20 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-20 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-20 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="h-32 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-32 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isStreaming && (
          <div className="rounded-lg border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6 dark:border-sky-800 dark:from-sky-900/20 dark:to-blue-900/20">
            <div className="mb-4 flex items-center gap-3">
              <Zap className="h-5 w-5 animate-pulse text-purple-600" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                AI Analysis in Progress...
              </h3>
            </div>
            <div className="min-h-[100px] whitespace-pre-wrap rounded-lg bg-white p-4 font-mono text-sm dark:bg-neutral-800">
              {streamingText || "Initializing analysis..."}
              <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-purple-600" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Streaming AI insights in real-time</span>
            </div>
          </div>
        )}

        {!loading && !hasAIData && !error && !isStreaming && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
            <Brain className="mx-auto mb-4 h-12 w-12 text-blue-600" />
            <h3 className="mb-2 font-semibold text-blue-900">No AI insights yet</h3>
            <p className="mb-4 text-sm text-blue-700">
              Run SkaiPDF to analyze this lead and get intelligent insights
            </p>
            <Button
              onClick={runAnalysis}
              disabled={isStreaming}
              className="bg-sky-600 hover:bg-sky-700"
            >
              Run SkaiPDF
            </Button>
          </div>
        )}

        {!loading && hasAIData && (
          <>
            <DominusTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="mt-6">
              {activeTab === "summary" && (
                <DominusInsightCard
                  title="Lead Summary"
                  description={aiData.aiSummaryJson?.summary || "No summary available"}
                  confidence={aiData.aiConfidence}
                >
                  {aiData.aiSummaryJson?.keyPoints && (
                    <ul className="mt-4 space-y-2">
                      {aiData.aiSummaryJson.keyPoints.map((point: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 text-purple-600">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </DominusInsightCard>
              )}

              {activeTab === "urgency" && (
                <DominusInsightCard
                  title="Urgency Analysis"
                  severity={
                    aiData.aiUrgencyScore >= 70
                      ? "high"
                      : aiData.aiUrgencyScore >= 40
                        ? "medium"
                        : "low"
                  }
                  confidence={aiData.aiConfidence}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-purple-600">
                        {aiData.aiUrgencyScore}
                      </div>
                      <div className="flex-1">
                        <div className="relative h-2 overflow-hidden rounded-full bg-gray-200">
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 100 8"
                            preserveAspectRatio="none"
                          >
                            <rect
                              x="0"
                              y="0"
                              width={Math.min(100, Math.max(0, aiData.aiUrgencyScore))}
                              height="8"
                              className={
                                aiData.aiUrgencyScore >= 70
                                  ? "fill-red-500"
                                  : aiData.aiUrgencyScore >= 40
                                    ? "fill-yellow-500"
                                    : "fill-green-500"
                              }
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {aiData.aiSummaryJson?.urgencyReason ||
                        "Urgency assessment based on lead details"}
                    </p>
                  </div>
                </DominusInsightCard>
              )}

              {activeTab === "jobtype" && (
                <DominusInsightCard
                  title="Job Classification"
                  description={aiData.aiJobType || "Job type not classified"}
                  confidence={aiData.aiConfidence}
                >
                  {aiData.aiSummaryJson?.jobDetails && (
                    <p className="mt-4 text-sm text-gray-600">{aiData.aiSummaryJson.jobDetails}</p>
                  )}
                </DominusInsightCard>
              )}

              {activeTab === "actions" && (
                <DominusInsightCard
                  title="Recommended Next Actions"
                  confidence={aiData.aiConfidence}
                >
                  {aiData.aiNextActions && aiData.aiNextActions.length > 0 ? (
                    <ul className="mt-4 space-y-3">
                      {aiData.aiNextActions.map((action: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No actions recommended</p>
                  )}
                </DominusInsightCard>
              )}

              {activeTab === "materials" && (
                <DominusInsightCard
                  title="Material List"
                  description="Estimated materials needed (no pricing)"
                  confidence={aiData.aiConfidence}
                >
                  {aiData.aiMaterials && aiData.aiMaterials.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {aiData.aiMaterials.map((material: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <span className="h-2 w-2 rounded-full bg-purple-600" />
                          <span>{material}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No materials identified</p>
                  )}
                </DominusInsightCard>
              )}

              {activeTab === "flags" && (
                <DominusInsightCard
                  title="Flags & Warnings"
                  severity={aiData.aiFlags?.length > 0 ? "high" : "low"}
                  confidence={aiData.aiConfidence}
                >
                  {aiData.aiFlags?.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {aiData.aiFlags.map((flag: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No flags or warnings</p>
                  )}
                </DominusInsightCard>
              )}

              {activeTab === "vision" && (
                <DominusPhotoAnalysis leadId={leadId} images={aiData.aiImages || []} />
              )}

              {activeTab === "prep" && (
                <DominusInsightCard title="Inspection Preparation" confidence={aiData.aiConfidence}>
                  {aiData.aiSummaryJson?.inspectionChecklist ? (
                    <ul className="mt-4 space-y-2">
                      {aiData.aiSummaryJson.inspectionChecklist.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            aria-label="Inspection item"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No inspection checklist available</p>
                  )}
                </DominusInsightCard>
              )}

              {activeTab === "compliance" && (
                <CarrierCompliancePanel
                  leadId={leadId}
                  currentScope={aiData.aiSummaryJson?.estimatedScope || []}
                />
              )}

              {activeTab === "supplement" && (
                <SupplementPanel
                  leadId={leadId}
                  claimId={aiData.aiSummaryJson?.claimId}
                  currentScope={aiData.aiSummaryJson?.estimatedScope || []}
                />
              )}

              {activeTab === "batf" && (
                <BATFPanel leadId={leadId} claimId={aiData.aiSummaryJson?.claimId} />
              )}

              {activeTab === "storm" && <StormImpactPanel leadId={leadId} />}

              {activeTab === "denial" && (
                <DenialResponsePanel claimId={aiData.aiSummaryJson?.claimId || leadId} />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
