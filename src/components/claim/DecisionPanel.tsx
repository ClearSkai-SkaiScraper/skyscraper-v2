/**
 * PHASE 50: AI DECISION ENGINE PANEL
 *
 * The most powerful upgrade yet.
 * Shows AI-generated claim strategy with carrier-ready recommendations.
 *
 * Features:
 * - Decision plan generation (30 tokens)
 * - Recommended actions with priority
 * - Success probability
 * - Carrier talking points
 * - Auto-task creation
 * - Dispute package generation (25 tokens)
 */

"use client";

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  RefreshCw,
  Send,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface DecisionStep {
  step: number;
  action: string;
  reasoning: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedDays?: number;
}

interface DecisionPlan {
  id: string;
  strategy: string;
  confidence: number;
  recommendedSteps: DecisionStep[];
  carrierTalkingPoints: string[];
  riskFactors: string[];
  strengthFactors: string[];
  nextBestAction: string;
  successProbability: number;
  aiReasoning: string;
  autoTasksCreated: boolean;
  taskIds?: string[];
  createdAt: string;
  generatedBy?: string;
}

interface DisputePackage {
  id: string;
  audience: string;
  packageType: string;
  subjectLine: string;
  bodyMarkdown: string;
  bodyHtml?: string;
  timelineSnapshot?: any;
  legalReferences?: string[];
  damageEvidence?: any;
  createdAt: string;
}

interface DecisionPanelProps {
  claimId: string;
}

export function DecisionPanel({ claimId }: DecisionPanelProps) {
  const [decisionPlan, setDecisionPlan] = useState<DecisionPlan | null>(null);
  const [disputePackages, setDisputePackages] = useState<DisputePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingDispute, setGeneratingDispute] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<string>("carrier");
  const [selectedPackageType, setSelectedPackageType] = useState<string>("initial_dispute");
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [viewingDispute, setViewingDispute] = useState<DisputePackage | null>(null);

  useEffect(() => {
    void fetchDecisionPlan();
    void fetchDisputePackages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const fetchDecisionPlan = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/claims/${claimId}/decide`);
      if (res.ok) {
        const data = await res.json();
        setDecisionPlan(data.plan);
      }
    } catch (error) {
      logger.error("Failed to fetch decision plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputePackages = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/dispute`);
      if (res.ok) {
        const data = await res.json();
        setDisputePackages(data.packages || []);
      }
    } catch (error) {
      logger.error("Failed to fetch dispute packages:", error);
    }
  };

  const generateDecisionPlan = async () => {
    try {
      setGenerating(true);
      const res = await fetch(`/api/claims/${claimId}/decide`, {
        method: "POST",
      });

      if (res.status === 402) {
        alert("❌ Insufficient tokens. Please purchase more AI tokens to generate decision plan.");
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to generate decision plan");
      }

      const data = await res.json();
      setDecisionPlan(data.plan);
      alert("✅ Decision plan generated successfully! (30 tokens charged)");
    } catch (error) {
      logger.error("Error generating decision:", error);
      alert("❌ Failed to generate decision plan");
    } finally {
      setGenerating(false);
    }
  };

  const generateDisputePackage = async () => {
    try {
      setGeneratingDispute(true);
      const res = await fetch(`/api/claims/${claimId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience: selectedAudience,
          packageType: selectedPackageType,
        }),
      });

      if (res.status === 402) {
        alert(
          "❌ Insufficient tokens. Please purchase more AI tokens to generate dispute package."
        );
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to generate dispute package");
      }

      const data = await res.json();
      setDisputePackages([data.package, ...disputePackages]);
      setShowDisputeModal(false);
      alert("✅ Dispute package generated successfully! (25 tokens charged)");
    } catch (error) {
      logger.error("Error generating dispute:", error);
      alert("❌ Failed to generate dispute package");
    } finally {
      setGeneratingDispute(false);
    }
  };

  const downloadDispute = (pkg: DisputePackage) => {
    const blob = new Blob([pkg.bodyMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispute_${pkg.audience}_${pkg.packageType}_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-400";
    if (confidence >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-gray-400">Loading decision intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/20 p-2">
            <Brain className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Decision Engine</h2>
            <p className="text-sm text-gray-400">Carrier-ready strategy & dispute generation</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDisputeModal(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-error px-4 py-2 font-semibold text-white transition-all hover:opacity-95"
          >
            <Send className="h-4 w-4" />
            Generate Dispute
          </button>
          <button
            onClick={generateDecisionPlan}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-gradient-indigo px-4 py-2 font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing... (30 tokens)
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                Generate Decision Plan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Decision Plan */}
      {decisionPlan ? (
        <div className="space-y-6">
          {/* Strategy Summary */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Recommended Strategy</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Success Probability</p>
                  <p
                    className={`text-2xl font-bold ${getConfidenceColor(decisionPlan.successProbability)}`}
                  >
                    {decisionPlan.successProbability}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">AI Confidence</p>
                  <p
                    className={`text-2xl font-bold ${getConfidenceColor(decisionPlan.confidence)}`}
                  >
                    {decisionPlan.confidence}%
                  </p>
                </div>
              </div>
            </div>
            <p className="mb-4 text-base leading-relaxed text-gray-300">{decisionPlan.strategy}</p>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-sm text-blue-200">
                <strong>AI Reasoning:</strong> {decisionPlan.aiReasoning}
              </p>
            </div>
          </div>

          {/* Next Best Action */}
          <div className="rounded-lg border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-400" />
              <div>
                <h4 className="mb-1 font-bold text-green-300">Next Best Action</h4>
                <p className="text-gray-200">{decisionPlan.nextBestAction}</p>
              </div>
            </div>
          </div>

          {/* Recommended Steps */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <FileText className="h-5 w-5 text-blue-400" />
              Action Plan ({decisionPlan.recommendedSteps.length} steps)
            </h3>
            <div className="space-y-3">
              {decisionPlan.recommendedSteps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-purple-500/50"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                        <span className="text-sm font-bold text-purple-400">{step.step}</span>
                      </div>
                      <h4 className="font-semibold text-white">{step.action}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {step.estimatedDays && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {step.estimatedDays}d
                        </span>
                      )}
                      <span
                        className={`rounded border px-2 py-1 text-xs font-semibold ${getPriorityColor(
                          step.priority
                        )}`}
                      >
                        {step.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className="ml-11 text-sm text-gray-300">{step.reasoning}</p>
                </div>
              ))}
            </div>
            {decisionPlan.autoTasksCreated && (
              <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <p className="text-sm text-green-200">
                  ✅ {decisionPlan.taskIds?.length || 0} tasks auto-created from this plan
                </p>
              </div>
            )}
          </div>

          {/* Carrier Talking Points */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <Shield className="h-5 w-5 text-indigo-400" />
              Carrier Talking Points
            </h3>
            <ul className="space-y-2">
              {decisionPlan.carrierTalkingPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-300">
                  <span className="mt-1 text-indigo-400">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Strength & Risk Factors */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-green-500/30 bg-[var(--surface-2)] p-4">
              <h4 className="mb-3 flex items-center gap-2 font-bold text-green-300">
                <TrendingUp className="h-4 w-4" />
                Strength Factors
              </h4>
              <ul className="space-y-1.5">
                {decisionPlan.strengthFactors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-400" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-orange-500/30 bg-[var(--surface-2)] p-4">
              <h4 className="mb-3 flex items-center gap-2 font-bold text-orange-300">
                <AlertTriangle className="h-4 w-4" />
                Risk Factors
              </h4>
              <ul className="space-y-1.5">
                {decisionPlan.riskFactors.map((factor, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-400" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500">
            Generated {new Date(decisionPlan.createdAt).toLocaleString()}
            {decisionPlan.generatedBy && ` by ${decisionPlan.generatedBy}`}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-12 text-center">
          <Brain className="mx-auto mb-4 h-16 w-16 text-gray-600" />
          <h3 className="mb-2 text-xl font-bold text-white">No Decision Plan Yet</h3>
          <p className="mb-6 text-gray-400">
            Generate an AI-powered strategy recommendation for this claim.
            <br />
            Costs 30 tokens per generation.
          </p>
          <button
            onClick={generateDecisionPlan}
            disabled={generating}
            className="rounded-lg bg-gradient-indigo px-6 py-3 font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "Analyzing..." : "Generate Decision Plan"}
          </button>
        </div>
      )}

      {/* Dispute Packages Section */}
      {disputePackages.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <FileText className="h-5 w-5 text-orange-400" />
            Dispute Packages ({disputePackages.length})
          </h3>
          <div className="space-y-3">
            {disputePackages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4 transition-colors hover:border-orange-500/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-orange-500/20 px-2 py-1 text-xs font-semibold text-orange-400">
                        {pkg.audience.toUpperCase()}
                      </span>
                      <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-400">
                        {pkg.packageType.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                    <h4 className="mb-1 font-semibold text-white">{pkg.subjectLine}</h4>
                    <p className="text-xs text-gray-400">
                      Created {new Date(pkg.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewingDispute(pkg)}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => downloadDispute(pkg)}
                      className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute Generation Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Generate Dispute Package</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">
                  Target Audience
                </label>
                <select
                  value={selectedAudience}
                  onChange={(e) => setSelectedAudience(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-white"
                >
                  <option value="carrier">Carrier</option>
                  <option value="attorney">Attorney</option>
                  <option value="public_adjuster">Public Adjuster</option>
                  <option value="appraisal_panel">Appraisal Panel</option>
                  <option value="dfs">Department of Financial Services</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">
                  Package Type
                </label>
                <select
                  value={selectedPackageType}
                  onChange={(e) => setSelectedPackageType(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2 text-white"
                >
                  <option value="initial_dispute">Initial Dispute</option>
                  <option value="supplement_request">Supplement Request</option>
                  <option value="appeal">Appeal</option>
                  <option value="demand_letter">Demand Letter</option>
                  <option value="bad_faith">Bad Faith Notice</option>
                </select>
              </div>
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-xs text-blue-200">
                  This will generate a tailored dispute letter with evidence, legal references, and
                  timeline. Costs 25 tokens.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={generateDisputePackage}
                  disabled={generatingDispute}
                  className="flex-1 rounded-lg bg-gradient-error px-4 py-2 font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generatingDispute ? "Generating..." : "Generate (25 tokens)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Viewer Modal */}
      {viewingDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4">
          <div className="my-8 w-full max-w-4xl rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{viewingDispute.subjectLine}</h3>
                <p className="mt-1 text-sm text-gray-400">
                  {viewingDispute.audience.toUpperCase()} •{" "}
                  {viewingDispute.packageType.replace(/_/g, " ").toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setViewingDispute(null)}
                className="text-gray-400 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-6">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-300">
                {viewingDispute.bodyMarkdown}
              </pre>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => downloadDispute(viewingDispute)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={() => setViewingDispute(null)}
                className="rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
