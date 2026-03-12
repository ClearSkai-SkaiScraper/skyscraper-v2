"use client";

/**
 * ReportBuilderPanel — Interactive report configuration and generation panel.
 *
 * Used on /reports/claims and /reports/config to let users:
 * 1. Select a report type (Insurance Claim, Retail Proposal, Supplement, etc.)
 * 2. Toggle sections to include
 * 3. Generate a branded PDF via the report orchestration APIs
 * 4. View generation status and download result
 */

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportType =
  | "INSURANCE_CLAIM"
  | "RETAIL_PROPOSAL"
  | "SUPPLEMENT_PACKAGE"
  | "WEATHER_ONLY"
  | "WARRANTY_DOC";

interface ReportSection {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  category: "core" | "evidence" | "financial" | "supplementary";
}

interface RecentReport {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  fileUrl?: string;
}

interface ReportBuilderPanelProps {
  orgId: string;
  claimId: string;
  defaultType?: ReportType;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const REPORT_TYPES: { value: ReportType; label: string; description: string; icon: string }[] = [
  {
    value: "INSURANCE_CLAIM",
    label: "Insurance Claim Package",
    description: "Full carrier-compliant claim with weather, damage, and estimates",
    icon: "📋",
  },
  {
    value: "RETAIL_PROPOSAL",
    label: "Retail Proposal",
    description: "Client-facing proposal with scope, pricing, and materials",
    icon: "💼",
  },
  {
    value: "SUPPLEMENT_PACKAGE",
    label: "Supplement Package",
    description: "Additional damage documentation for claim supplement",
    icon: "📎",
  },
  {
    value: "WEATHER_ONLY",
    label: "Weather Report",
    description: "Standalone weather verification report",
    icon: "🌩️",
  },
  {
    value: "WARRANTY_DOC",
    label: "Warranty Document",
    description: "Post-completion warranty and workmanship certificate",
    icon: "🛡️",
  },
];

const ALL_SECTIONS: ReportSection[] = [
  {
    key: "COVER",
    label: "Cover Page",
    description: "Company branded cover",
    defaultEnabled: true,
    category: "core",
  },
  {
    key: "CLAIM_SNAPSHOT",
    label: "Claim Snapshot",
    description: "Quick overview of claim details",
    defaultEnabled: true,
    category: "core",
  },
  {
    key: "WEATHER_FULL",
    label: "Weather Report",
    description: "Full historical weather data",
    defaultEnabled: true,
    category: "evidence",
  },
  {
    key: "AI_DAMAGE",
    label: "AI Damage Assessment",
    description: "Computer vision damage analysis",
    defaultEnabled: true,
    category: "evidence",
  },
  {
    key: "PHOTO_LOG",
    label: "Photo Log",
    description: "Annotated property photos",
    defaultEnabled: true,
    category: "evidence",
  },
  {
    key: "SCOPE_OF_WORK",
    label: "Scope of Work",
    description: "Detailed repair scope breakdown",
    defaultEnabled: true,
    category: "financial",
  },
  {
    key: "ESTIMATE",
    label: "Cost Estimate",
    description: "Line-item cost estimates",
    defaultEnabled: true,
    category: "financial",
  },
  {
    key: "MATERIALS",
    label: "Materials Specification",
    description: "Material types, brands, and specs",
    defaultEnabled: false,
    category: "supplementary",
  },
  {
    key: "DEPRECIATION",
    label: "Depreciation Schedule",
    description: "ACV/RCV depreciation breakdown",
    defaultEnabled: false,
    category: "financial",
  },
  {
    key: "TIMELINE",
    label: "Project Timeline",
    description: "Milestone-based project schedule",
    defaultEnabled: false,
    category: "supplementary",
  },
  {
    key: "WARRANTY",
    label: "Warranty Details",
    description: "Manufacturer and workmanship warranty info",
    defaultEnabled: false,
    category: "supplementary",
  },
  {
    key: "COMPLIANCE",
    label: "Compliance & Code",
    description: "Building code and permit compliance",
    defaultEnabled: false,
    category: "supplementary",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core Sections",
  evidence: "Evidence & Documentation",
  financial: "Financial Details",
  supplementary: "Supplementary",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ReportBuilderPanel({
  orgId,
  claimId,
  defaultType = "INSURANCE_CLAIM",
}: ReportBuilderPanelProps) {
  const [reportType, setReportType] = useState<ReportType>(defaultType);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [enabledSections, setEnabledSections] = useState<Set<string>>(
    new Set(ALL_SECTIONS.filter((s) => s.defaultEnabled).map((s) => s.key))
  );
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "generating" | "success" | "error"
  >("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // ── Fetch recent reports ──
  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/reports/recent?claimId=${claimId}`);
      if (res.ok) {
        const data = await res.json();
        setRecentReports(data.reports || []);
      }
    } catch {
      // silent
    } finally {
      setLoadingRecent(false);
    }
  }, [claimId]);

  useEffect(() => {
    if (claimId) fetchRecent();
  }, [claimId, fetchRecent]);

  // ── Toggle sections ──
  const toggleSection = (key: string) => {
    setEnabledSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // ── Generate report ──
  const handleGenerate = async (mode: "standard" | "ai-enhanced" = "standard") => {
    if (!claimId) {
      toast.error("No claim selected");
      return;
    }

    setGenerating(true);
    setGenerationStatus("generating");
    setResultUrl(null);

    try {
      const endpoint =
        mode === "ai-enhanced" ? "/api/ai/enhanced-report-builder" : "/api/reports/generate";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          orgId,
          reportType,
          sections: Array.from(enabledSections),
          templateId: selectedTemplateId || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
      }

      // Check if response is a PDF download or JSON with URL
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
        setGenerationStatus("success");
        toast.success("Report generated successfully!");
      } else {
        const data = await res.json();
        setResultUrl(data.fileUrl || data.url || null);
        setGenerationStatus("success");
        toast.success("Report generated successfully!");
        fetchRecent(); // Refresh the list
      }
    } catch (error: any) {
      setGenerationStatus("error");
      toast.error(error.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  // ── Render ──
  const selectedType = REPORT_TYPES.find((t) => t.value === reportType);
  const sectionsByCategory = ALL_SECTIONS.reduce(
    (acc, section) => {
      if (!acc[section.category]) acc[section.category] = [];
      acc[section.category].push(section);
      return acc;
    },
    {} as Record<string, ReportSection[]>
  );

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-blue-600" />
            Report Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => setShowTypeSelector(!showTypeSelector)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedType?.icon}</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selectedType?.label}
                </p>
                <p className="text-sm text-slate-500">{selectedType?.description}</p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-slate-400 transition-transform",
                showTypeSelector && "rotate-180"
              )}
            />
          </button>

          {showTypeSelector && (
            <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setReportType(type.value);
                    setShowTypeSelector(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                    reportType === type.value
                      ? "bg-blue-50 ring-1 ring-blue-300 dark:bg-blue-950/50 dark:ring-blue-700"
                      : "hover:bg-white dark:hover:bg-slate-800"
                  )}
                >
                  <span className="text-xl">{type.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {type.label}
                    </p>
                    <p className="text-xs text-slate-500">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Template Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Template Style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SmartTemplateSelector
            onSelect={(id) => setSelectedTemplateId(id)}
            selectedId={selectedTemplateId}
            defaultStyle={reportType === "RETAIL_PROPOSAL" ? "Retail" : "Insurance"}
            context={{
              intent:
                reportType === "RETAIL_PROPOSAL"
                  ? "homeowner_estimate"
                  : reportType === "SUPPLEMENT_PACKAGE"
                    ? "supplement"
                    : "claim_support",
            }}
            compact
            label="Choose Report Template"
          />
        </CardContent>
      </Card>

      {/* Section Toggles */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              Report Sections
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {enabledSections.size} of {ALL_SECTIONS.length} selected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {Object.entries(sectionsByCategory).map(([category, sections]) => (
              <div key={category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {CATEGORY_LABELS[category] || category}
                </p>
                <div className="space-y-1.5">
                  {sections.map((section) => (
                    <button
                      key={section.key}
                      onClick={() => toggleSection(section.key)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
                        enabledSections.has(section.key)
                          ? "bg-blue-50 dark:bg-blue-950/30"
                          : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {section.label}
                        </p>
                        <p className="truncate text-xs text-slate-500">{section.description}</p>
                      </div>
                      <div
                        className={cn(
                          "ml-3 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          enabledSections.has(section.key)
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {enabledSections.has(section.key) && <CheckCircle className="h-3 w-3" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generation Actions */}
      <Card>
        <CardContent className="p-5">
          {/* Status */}
          {generationStatus === "generating" && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating your report — this may take 15–30 seconds...
            </div>
          )}

          {generationStatus === "success" && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <CheckCircle className="h-4 w-4" />
                Report generated successfully!
              </div>
              {resultUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={resultUrl} download>
                    <Download className="mr-1 h-4 w-4" />
                    Download
                  </a>
                </Button>
              )}
            </div>
          )}

          {generationStatus === "error" && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Generation failed. Please try again.
            </div>
          )}

          {/* AI Disclaimer */}
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            ⚠️ AI can make mistakes — please read through the final report carefully before
            submission.
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              onClick={() => handleGenerate("standard")}
              disabled={generating || !claimId}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generate Report
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/30"
              onClick={() => handleGenerate("ai-enhanced")}
              disabled={generating || !claimId}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              AI-Enhanced Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4 text-slate-400" />
                Recent Reports
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchRecent} disabled={loadingRecent}>
                <RefreshCw className={cn("h-3.5 w-3.5", loadingRecent && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentReports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {report.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(report.createdAt).toLocaleDateString()} •{" "}
                      <Badge variant="secondary" className="text-[10px]">
                        {report.status}
                      </Badge>
                    </p>
                  </div>
                  {report.fileUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={report.fileUrl} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!claimId && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600 dark:text-slate-300">No Claim Selected</p>
            <p className="mt-1 text-sm text-slate-400">
              Select a claim to begin building a report.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ReportBuilderPanel;
