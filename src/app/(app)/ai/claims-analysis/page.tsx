"use client";

import { useUser } from "@clerk/nextjs";
/**
 * AI CLAIMS ANALYSIS DASHBOARD
 *
 * Comprehensive claim risk assessment powered by AI
 * - Damage analysis from photos
 * - Coverage verification against policy
 * - Litigation risk scoring
 */
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AgentRunWidget } from "@/components/ai/AgentRunWidget";
import { ClaimSelect } from "@/components/claims/ClaimSelect";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Card } from "@/components/ui/card";

interface ClaimsAnalysisResult {
  claimId: string;
  findings: {
    damage?: {
      severity: string;
      estimatedRepairDays: number;
      confidence: number;
    };
    coverage?: {
      policyRisk: string;
      exclusionsFlagged: number;
      confidence: number;
    };
    risk?: {
      litigationProbability: number;
      recommendedAction: string;
    };
  };
  riskScore: number;
  tokensUsed?: number;
}

export default function ClaimsAnalysisPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const claimIdFromUrl = searchParams?.get("claimId");

  const [claimId, setClaimId] = useState(claimIdFromUrl || "");
  const [modes, setModes] = useState<string[]>(["damage", "coverage"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClaimsAnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);

  const toggleMode = (mode: string) => {
    if (modes.includes(mode)) {
      setModes(modes.filter((m) => m !== mode));
    } else {
      setModes([...modes, mode]);
    }
  };

  const handleAnalyze = useCallback(async () => {
    // Mark that user has interacted
    setHasInteracted(true);

    // Clear previous error when user initiates new analysis
    setError("");

    if (!claimId.trim()) {
      setError("Please select a claim");
      return;
    }

    if (modes.length === 0) {
      setError("Please select at least one analysis mode");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/agents/claims-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, modes }),
      });

      // Guard against HTML responses (auth redirect, error page, or edge proxy)
      if (response.redirected) {
        setError("Your session may have expired. Please refresh the page.");
        setLoading(false);
        return;
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        setError("Unexpected server response. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Analysis failed");
        setLoading(false);
        return;
      }

      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze claim");
    } finally {
      setLoading(false);
    }
  }, [claimId, modes]);

  const getRiskColor = (score: number) => {
    if (score >= 70) return "text-red-600 bg-red-50 border-red-200";
    if (score >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-green-600 bg-green-50 border-green-200";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "High Risk";
    if (score >= 40) return "Moderate Risk";
    return "Low Risk";
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    // Only auto-run if claimId is explicitly provided in URL AND is valid
    if (claimIdFromUrl && claimIdFromUrl.trim() && modes.length > 0) {
      void handleAnalyze();
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        void handleAnalyze();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [claimIdFromUrl, handleAnalyze, modes.length]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="AI Claims Analysis"
        description="Comprehensive risk assessment and coverage verification"
        icon={<Search className="h-6 w-6 text-white" />}
      />

      <div className="mt-8 space-y-6">
        {/* Activity Widget */}
        <AgentRunWidget />

        {/* Input Section */}
        <Card className="p-6">
          <div className="space-y-6">
            {/* Claim Selection */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Select Claim *
              </label>
              <ClaimSelect
                value={claimId}
                onValueChange={setClaimId}
                placeholder="Choose a claim to analyze"
                className="w-full"
              />
              <p className="mt-1 text-xs text-slate-500">
                Select from your active claims for comprehensive AI analysis
              </p>
            </div>

            {/* Analysis Modes */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Analysis Modes *
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {[
                  {
                    id: "damage",
                    label: "Damage Analysis",
                    icon: AlertTriangle,
                    desc: "Photo damage assessment",
                  },
                  {
                    id: "coverage",
                    label: "Coverage Check",
                    icon: Shield,
                    desc: "Policy verification",
                  },
                  {
                    id: "risk",
                    label: "Risk Scoring",
                    icon: TrendingUp,
                    desc: "Litigation probability",
                  },
                ].map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    onClick={() => toggleMode(id)}
                    className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      modes.includes(id)
                        ? "border-sky-500 bg-sky-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 ${modes.includes(id) ? "text-sky-600" : "text-gray-600"}`}
                    />
                    <div className="flex-1">
                      <div
                        className={`font-medium ${modes.includes(id) ? "text-sky-900" : "text-gray-700"}`}
                      >
                        {label}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">{desc}</div>
                    </div>
                    {modes.includes(id) && <CheckCircle2 className="h-5 w-5 text-sky-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && hasInteracted && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Run AI Analysis
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Risk Score Card */}
            <Card className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Analysis Results</h2>
                <button className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  <Download className="h-4 w-4" />
                  Export PDF
                </button>
              </div>

              {/* Overall Risk Score */}
              <div className={`rounded-md border p-4 ${getRiskColor(result.riskScore)} mb-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 text-xs font-medium opacity-75">Overall Risk Score</div>
                    <div className="text-xl font-semibold">{getRiskLabel(result.riskScore)}</div>
                  </div>
                  <div className="text-2xl font-semibold opacity-50">{result.riskScore}</div>
                </div>
              </div>

              {/* Findings */}
              <div className="space-y-4">
                {result.findings.damage && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
                      <div className="flex-1">
                        <h3 className="mb-2 font-semibold text-gray-900">Damage Analysis</h3>
                        <div className="space-y-1 text-sm text-gray-700">
                          <div>
                            • Severity:{" "}
                            <span className="font-medium">{result.findings.damage.severity}</span>
                          </div>
                          <div>
                            • Estimated Repair:{" "}
                            <span className="font-medium">
                              {result.findings.damage.estimatedRepairDays} days
                            </span>
                          </div>
                          <div>
                            • Confidence:{" "}
                            <span className="font-medium">
                              {(result.findings.damage.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result.findings.coverage && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <h3 className="mb-2 font-semibold text-gray-900">Coverage Analysis</h3>
                        <div className="space-y-1 text-sm text-gray-700">
                          <div>
                            • Policy Risk:{" "}
                            <span className="font-medium">
                              {result.findings.coverage.policyRisk}
                            </span>
                          </div>
                          <div>
                            • Exclusions Flagged:{" "}
                            <span className="font-medium">
                              {result.findings.coverage.exclusionsFlagged}
                            </span>
                          </div>
                          <div>
                            • Confidence:{" "}
                            <span className="font-medium">
                              {(result.findings.coverage.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result.findings.risk && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="mt-0.5 h-5 w-5 text-red-600" />
                      <div className="flex-1">
                        <h3 className="mb-2 font-semibold text-gray-900">Risk Assessment</h3>
                        <div className="space-y-1 text-sm text-gray-700">
                          <div>
                            • Litigation Probability:{" "}
                            <span className="font-medium">
                              {(result.findings.risk.litigationProbability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            • Recommended:{" "}
                            <span className="font-medium">
                              {result.findings.risk.recommendedAction}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Analyzed just now
                </div>
                {result.tokensUsed && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    {result.tokensUsed} tokens used
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <Card className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No Analysis Yet</h3>
            <p className="mx-auto max-w-md text-gray-600">
              Enter a claim ID and select analysis modes to get started with AI-powered risk
              assessment.
            </p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
