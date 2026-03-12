"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Scale,
  Shield,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter as useNextRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ClaimSelect } from "@/components/claims/ClaimSelect";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface BadFaithIndicator {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence: string[];
  detectedAt: string;
  legalBasis?: string;
  recommendedAction: string;
}

interface BadFaithResult {
  hasBadFaithIndicators: boolean;
  indicators: BadFaithIndicator[];
  overallSeverity: "none" | "low" | "medium" | "high" | "critical";
  legalActionRecommended: boolean;
  attorneyReferralSuggested: boolean;
  summary: string;
}

interface PolicyCoverageResult {
  covered: boolean;
  coveragePercentage: number;
  exclusions: string[];
  policyLimits: {
    dwelling: number;
    personalProperty: number;
    liability: number;
    deductible: number;
  };
  riskFlags: string[];
  recommendation: string;
}

interface RiskScoringResult {
  overallScore: number;
  litigationProbability: number;
  badFaithRisk: number;
  denialRisk: number;
  supplementRisk: number;
  factors: { name: string; impact: "positive" | "negative" | "neutral"; weight: number }[];
  recommendation: string;
}

type AnalysisTab = "bad-faith" | "policy" | "risk";

interface UploadedDoc {
  id: string;
  name: string;
  size: number;
  extractedText: string;
  status: "extracting" | "ready" | "error";
}

export default function BadFaithDetectorPage() {
  const router = useNextRouter();
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const claimIdFromUrl = searchParams?.get("claimId");

  const [claimId, setClaimId] = useState(claimIdFromUrl || "");
  const [forceRefresh, setForceRefresh] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BadFaithResult | null>(null);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  // Additional analysis tabs
  const [activeTab, setActiveTab] = useState<AnalysisTab>("bad-faith");
  const [policyResult, setPolicyResult] = useState<PolicyCoverageResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskScoringResult | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);

  // Document upload & extra context state
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");

  // --- Document upload handler ---
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newDoc: UploadedDoc = {
        id: docId,
        name: file.name,
        size: file.size,
        extractedText: "",
        status: "extracting",
      };
      setUploadedDocs((prev) => [...prev, newDoc]);
      try {
        let text: string;
        if (file.type === "text/plain" || file.name.endsWith(".txt")) {
          text = await file.text();
        } else {
          try {
            text = await file.text();
          } catch {
            text = `[${file.name} — paste text manually for best results]`;
          }
        }
        setUploadedDocs((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, extractedText: text, status: "ready" } : d))
        );
      } catch {
        setUploadedDocs((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, status: "error" } : d))
        );
      }
    }
  }, []);

  const removeDocument = (docId: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  /** Build supplemental context string from uploads + context box */
  const buildSupplementalContext = useCallback(() => {
    const parts: string[] = [];
    const readyDocs = uploadedDocs.filter((d) => d.status === "ready" && d.extractedText);
    if (readyDocs.length > 0) {
      parts.push(
        ...readyDocs.map((d) => `--- Uploaded Document: ${d.name} ---\n${d.extractedText}`)
      );
    }
    if (additionalContext.trim()) {
      parts.push(`--- Additional Context ---\n${additionalContext.trim()}`);
    }
    return parts.join("\n\n");
  }, [uploadedDocs, additionalContext]);

  const handleAnalyze = useCallback(
    async (refresh = false) => {
      if (!claimId.trim()) {
        setError("Please enter a claim ID");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/agents/bad-faith", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimId,
            forceRefresh: refresh,
            supplementalContext: buildSupplementalContext() || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Bad faith detection failed. Please try again.");
          setLoading(false);
          return;
        }

        setResult(data);
      } catch (err) {
        setError(
          err.message || "Failed to analyze claim. Please check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [claimId, buildSupplementalContext]
  );

  /** Export bad-faith analysis as a branded PDF */
  const handleExportPdf = useCallback(async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const res = await fetch("/api/agents/bad-faith/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, analysis: result }),
      });
      if (!res.ok) {
        // Fallback: create a simple text-based download
        const text = [
          `BAD FAITH ANALYSIS REPORT — Claim ${claimId}`,
          `Generated: ${new Date().toLocaleString()}`,
          "",
          `Overall Severity: ${result.overallSeverity.toUpperCase()}`,
          `Bad Faith Indicators: ${result.hasBadFaithIndicators ? "YES" : "NO"}`,
          `Legal Action Recommended: ${result.legalActionRecommended ? "YES" : "NO"}`,
          "",
          "SUMMARY:",
          result.summary,
          "",
          "INDICATORS:",
          ...result.indicators.map(
            (ind, i) =>
              `${i + 1}. [${ind.severity.toUpperCase()}] ${ind.type}\n   ${ind.description}\n   Action: ${ind.recommendedAction}`
          ),
        ].join("\n");
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bad-faith-analysis-${claimId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bad-faith-analysis-${claimId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }, [claimId, result]);

  // Policy Coverage Analysis
  const handlePolicyAnalysis = useCallback(async () => {
    if (!claimId.trim()) {
      setError("Please enter a claim ID");
      return;
    }

    setPolicyLoading(true);
    setError("");

    try {
      const response = await fetch("/api/agents/policy-coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          supplementalContext: buildSupplementalContext() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Policy analysis failed");
        setPolicyLoading(false);
        return;
      }

      setPolicyResult(data);
    } catch (err) {
      setError(err.message || "Failed to analyze policy coverage");
    } finally {
      setPolicyLoading(false);
    }
  }, [claimId, buildSupplementalContext]);

  // Risk Scoring Analysis
  const handleRiskAnalysis = useCallback(async () => {
    if (!claimId.trim()) {
      setError("Please enter a claim ID");
      return;
    }

    setRiskLoading(true);
    setError("");

    try {
      const response = await fetch("/api/agents/risk-scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          supplementalContext: buildSupplementalContext() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Risk analysis failed");
        setRiskLoading(false);
        return;
      }

      setRiskResult(data);
    } catch (err) {
      setError(err.message || "Failed to analyze risk");
    } finally {
      setRiskLoading(false);
    }
  }, [claimId, buildSupplementalContext]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        if (!loading) void handleAnalyze(forceRefresh);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, handleAnalyze, forceRefresh]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-5 w-5" />;
      case "medium":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const formatIndicatorType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title="AI Claims Intelligence"
        subtitle="Comprehensive bad faith detection, policy verification, and risk analysis powered by AI"
        icon={<Shield className="h-5 w-5" />}
      />

      {/* Analysis Type Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as AnalysisTab)}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bad-faith" className="gap-2">
            <Shield className="h-4 w-4" />
            Bad Faith Detection
          </TabsTrigger>
          <TabsTrigger value="policy" className="gap-2">
            <FileText className="h-4 w-4" />
            Policy & Coverage
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Risk Scoring
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Input Section - Shared across all tabs */}
      <PageSectionCard>
        <div className="space-y-6">
          {/* Claim Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Select Claim *
            </label>
            <ClaimSelect
              value={claimId}
              onValueChange={setClaimId}
              placeholder="Choose a claim to analyze"
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Select from your active claims for{" "}
              {activeTab === "bad-faith" ? "bad faith" : activeTab === "policy" ? "policy" : "risk"}{" "}
              analysis
            </p>
          </div>

          {/* Document Upload Section */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Upload Supporting Documents (Optional)
            </label>
            <div
              className="group relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 transition-all hover:border-sky-400 hover:bg-sky-50/30 dark:border-slate-700 dark:bg-slate-950/30 dark:hover:border-sky-600 dark:hover:bg-sky-950/20"
              onClick={() => document.getElementById("bad-faith-upload")?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleFileUpload(e.dataTransfer.files);
              }}
            >
              <Paperclip className="mb-1 h-6 w-6 text-slate-400 group-hover:text-sky-500" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Drop denial letters, policy docs, or correspondence here or{" "}
                <span className="text-sky-600 underline">browse</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">PDF, DOCX, TXT, or images</p>
              <input
                id="bad-faith-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>
            {uploadedDocs.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate text-sm text-slate-700 dark:text-slate-300">
                        {doc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.status === "extracting" && (
                        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700">
                          <Loader2 className="h-3 w-3 animate-spin" /> Processing
                        </Badge>
                      )}
                      {doc.status === "ready" && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        >
                          ✓ Ready
                        </Badge>
                      )}
                      {doc.status === "error" && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Error
                        </Badge>
                      )}
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Context Box */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Additional Context for AI (Optional)
            </label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Add field notes, adjuster observations, timeline details, or anything else the AI should consider..."
              className="min-h-[80px] bg-white text-sm dark:bg-slate-950"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This context will be included in all three analysis types alongside your claim data.
            </p>
          </div>

          {/* Force Refresh Option (Bad Faith only) */}
          {activeTab === "bad-faith" && (
            <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#121823]">
              <input
                type="checkbox"
                id="forceRefresh"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="forceRefresh" className="cursor-pointer text-sm text-gray-700">
                Force fresh analysis (bypass 7-day cache)
              </label>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3">
              <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Analyze Button - Changes based on active tab */}
          <div className="flex gap-3">
            {activeTab === "bad-faith" && (
              <>
                <button
                  onClick={() => handleAnalyze(forceRefresh)}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-[#0A0F1A] dark:text-slate-100 dark:hover:bg-[#121823]"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5" />
                      Detect Bad Faith
                    </>
                  )}
                </button>
                {result && (
                  <button
                    onClick={() => handleAnalyze(true)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-[#0A0F1A] dark:text-slate-300 dark:hover:bg-[#121823]"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Refresh
                  </button>
                )}
              </>
            )}

            {activeTab === "policy" && (
              <button
                onClick={handlePolicyAnalysis}
                disabled={policyLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {policyLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analyzing Policy...
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Check Coverage
                  </>
                )}
              </button>
            )}

            {activeTab === "risk" && (
              <button
                onClick={handleRiskAnalysis}
                disabled={riskLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-purple-600 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {riskLoading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Calculating Risk...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-5 w-5" />
                    Calculate Risk Score
                  </>
                )}
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 border-t pt-4">
            <span className="text-xs text-muted-foreground">Quick actions:</span>
            <Link
              href={`/ai/claims-analysis${claimId ? `?claimId=${claimId}` : ""}`}
              className="text-xs text-blue-600 hover:underline"
            >
              Full AI Analysis →
            </Link>
            <span className="text-muted-foreground">|</span>
            <Link
              href={`/ai/tools/rebuttal${claimId ? `?claimId=${claimId}` : ""}`}
              className="text-xs text-blue-600 hover:underline"
            >
              Build Rebuttal →
            </Link>
          </div>
        </div>
      </PageSectionCard>

      {/* Bad Faith Results Section */}
      {activeTab === "bad-faith" && result && (
        <PageSectionCard>
          <div className="space-y-6">
            {/* Overall Status Card */}
            <div
              className={`rounded-3xl border-2 px-6 py-5 shadow-xl md:px-8 md:py-6 ${
                result.overallSeverity === "none"
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : result.overallSeverity === "critical" || result.overallSeverity === "high"
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                    : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30"
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {result.hasBadFaithIndicators ? (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  ) : (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {result.hasBadFaithIndicators
                        ? "Bad Faith Indicators Detected"
                        : "No Bad Faith Detected"}
                    </h2>
                    <p className="mt-1 text-gray-600">
                      Severity:{" "}
                      <span className="font-semibold capitalize">{result.overallSeverity}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void handleExportPdf()}
                  disabled={exportingPdf}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-4 w-4" />
                  {exportingPdf ? "Exporting..." : "Export PDF"}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-gray-700">{result.summary}</p>
              </div>

              {result.legalActionRecommended && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-100 p-4">
                  <Scale className="mt-0.5 h-5 w-5 text-red-700" />
                  <div>
                    <div className="font-semibold text-red-900">Legal Action Recommended</div>
                    <div className="mt-1 text-sm text-red-700">
                      Based on the indicators detected, you should consider legal counsel.
                    </div>
                  </div>
                </div>
              )}

              {result.attorneyReferralSuggested && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-100 p-4">
                  <TrendingUp className="mt-0.5 h-5 w-5 text-orange-700" />
                  <div>
                    <div className="font-semibold text-orange-900">Attorney Referral Suggested</div>
                    <div className="mt-1 text-sm text-orange-700">
                      Consider consulting with an insurance bad faith attorney.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Indicators List */}
            {result.indicators.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-6 text-xl font-bold text-gray-900">
                  Detected Indicators ({result.indicators.length})
                </h3>
                <div className="space-y-4">
                  {result.indicators.map((indicator, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 p-5 transition-colors hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getSeverityIcon(indicator.severity)}
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {formatIndicatorType(indicator.type)}
                            </h4>
                            <span
                              className={`mt-1 inline-block rounded border px-2 py-0.5 text-xs font-medium ${getSeverityColor(indicator.severity)}`}
                            >
                              {indicator.severity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="mb-3 text-gray-700">{indicator.description}</p>

                      {indicator.evidence.length > 0 && (
                        <div className="mb-3">
                          <div className="mb-2 text-xs font-semibold text-gray-500">EVIDENCE:</div>
                          <ul className="space-y-1">
                            {indicator.evidence.map((evidence, evidenceIdx) => (
                              <li
                                key={evidenceIdx}
                                className="border-l-2 border-slate-200 pl-4 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400"
                              >
                                {evidence}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {indicator.legalBasis && (
                        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                          <div className="mb-1 text-xs font-semibold text-blue-900">
                            LEGAL BASIS:
                          </div>
                          <div className="text-sm text-blue-700">{indicator.legalBasis}</div>
                        </div>
                      )}

                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="mb-1 text-xs font-semibold text-green-900">
                          RECOMMENDED ACTION:
                        </div>
                        <div className="text-sm text-green-700">{indicator.recommendedAction}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Analysis completed just now
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Results cached for 7 days
              </div>
            </div>
          </div>
        </PageSectionCard>
      )}

      {/* Policy Coverage Results Section */}
      {activeTab === "policy" && policyResult && (
        <PageSectionCard>
          <div className="space-y-6">
            {/* Coverage Status Card */}
            <div
              className={`rounded-3xl border-2 px-6 py-5 shadow-xl md:px-8 md:py-6 ${
                policyResult.covered
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
              }`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {policyResult.covered ? (
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {policyResult.covered ? "Claim Appears Covered" : "Coverage Issues Detected"}
                    </h2>
                    <p className="mt-1 text-gray-600">
                      Coverage Confidence:{" "}
                      <span className="font-semibold">{policyResult.coveragePercentage}%</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy Limits */}
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Dwelling</div>
                  <div className="font-semibold">
                    ${policyResult.policyLimits.dwelling.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Personal Property</div>
                  <div className="font-semibold">
                    ${policyResult.policyLimits.personalProperty.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Liability</div>
                  <div className="font-semibold">
                    ${policyResult.policyLimits.liability.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Deductible</div>
                  <div className="font-semibold">
                    ${policyResult.policyLimits.deductible.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Exclusions */}
              {policyResult.exclusions.length > 0 && (
                <div className="mb-4 rounded-xl border border-orange-300 bg-orange-100 p-4">
                  <div className="mb-2 font-semibold text-orange-900">Policy Exclusions Found</div>
                  <ul className="space-y-1">
                    {policyResult.exclusions.map((exclusion, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-orange-700">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {exclusion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risk Flags */}
              {policyResult.riskFlags.length > 0 && (
                <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-100 p-4">
                  <div className="mb-2 font-semibold text-yellow-900">Risk Flags</div>
                  <ul className="space-y-1">
                    {policyResult.riskFlags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-yellow-700">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="mb-1 font-semibold text-blue-900">Recommendation</div>
                <div className="text-sm text-blue-700">{policyResult.recommendation}</div>
              </div>
            </div>
          </div>
        </PageSectionCard>
      )}

      {/* Risk Scoring Results Section */}
      {activeTab === "risk" && riskResult && (
        <PageSectionCard>
          <div className="space-y-6">
            {/* Overall Risk Score */}
            <div className="rounded-3xl border-2 border-purple-200 bg-purple-50 px-6 py-5 shadow-xl md:px-8 md:py-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Risk Analysis Complete</h2>
                <div className="text-right">
                  <div className="text-4xl font-bold text-purple-600">
                    {riskResult.overallScore}
                  </div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Litigation Risk</div>
                  <div className="text-xl font-semibold text-red-600">
                    {riskResult.litigationProbability}%
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Bad Faith Risk</div>
                  <div className="text-xl font-semibold text-orange-600">
                    {riskResult.badFaithRisk}%
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Denial Risk</div>
                  <div className="text-xl font-semibold text-yellow-600">
                    {riskResult.denialRisk}%
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <div className="text-xs text-gray-500">Supplement Risk</div>
                  <div className="text-xl font-semibold text-blue-600">
                    {riskResult.supplementRisk}%
                  </div>
                </div>
              </div>

              {/* Contributing Factors */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 font-semibold text-slate-900 dark:text-white">
                  Contributing Factors
                </div>
                <div className="space-y-2">
                  {riskResult.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {factor.impact === "positive" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : factor.impact === "negative" ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-700">{factor.name}</span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          factor.impact === "positive"
                            ? "text-green-600"
                            : factor.impact === "negative"
                              ? "text-red-600"
                              : "text-gray-500"
                        }`}
                      >
                        {factor.impact === "positive"
                          ? "-"
                          : factor.impact === "negative"
                            ? "+"
                            : "±"}
                        {factor.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation */}
              <div className="mt-4 rounded-xl border border-purple-200 bg-purple-100 p-4">
                <div className="mb-1 font-semibold text-purple-900">AI Recommendation</div>
                <div className="text-sm text-purple-700">{riskResult.recommendation}</div>
              </div>
            </div>
          </div>
        </PageSectionCard>
      )}

      {/* Empty State - Tab-specific */}
      {activeTab === "bad-faith" && !result && !loading && (
        <PageSectionCard>
          <div className="rounded-2xl p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Shield className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No Analysis Yet</h3>
            <p className="mx-auto max-w-md text-gray-600">
              Enter a claim ID to scan for bad faith indicators like unreasonable delays, arbitrary
              denials, and more.
            </p>
          </div>
        </PageSectionCard>
      )}

      {activeTab === "policy" && !policyResult && !policyLoading && (
        <PageSectionCard>
          <div className="rounded-2xl p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Policy Coverage Check</h3>
            <p className="mx-auto max-w-md text-gray-600">
              Select a claim to verify policy coverage, check for exclusions, and understand your
              policy limits.
            </p>
          </div>
        </PageSectionCard>
      )}

      {activeTab === "risk" && !riskResult && !riskLoading && (
        <PageSectionCard>
          <div className="rounded-2xl p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Risk Scoring Analysis</h3>
            <p className="mx-auto max-w-md text-gray-600">
              Get AI-powered risk scores for litigation probability, denial risk, and more to make
              informed decisions.
            </p>
          </div>
        </PageSectionCard>
      )}
    </PageContainer>
  );
}
