// src/app/(app)/claims-ready-folder/[claimId]/page.tsx
"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  CloudRain,
  Download,
  Eye,
  FileCode,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  User,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AutopilotPanel } from "@/components/claimiq/AutopilotPanel";
import { ClaimIQDashboard } from "@/components/claimiq/ClaimIQDashboard";
import { PacketGenerationPanel } from "@/components/claimiq/PacketGenerationPanel";
import { ReadinessScore } from "@/components/claims-folder/ReadinessScore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
  ClaimFolder,
  FolderSectionKey,
  SectionStatus,
} from "@/lib/claims-folder/folderSchema";
import { FOLDER_SECTIONS, SECTION_METADATA } from "@/lib/claims-folder/folderSchema";
import { logger } from "@/lib/logger";

// Sections that have actual route pages under /sections/[key]
const ROUTED_SECTIONS = new Set<FolderSectionKey>([
  FOLDER_SECTIONS.COVER_SHEET,
  FOLDER_SECTIONS.TABLE_OF_CONTENTS,
  FOLDER_SECTIONS.EXECUTIVE_SUMMARY,
  FOLDER_SECTIONS.WEATHER_CAUSE_OF_LOSS,
  FOLDER_SECTIONS.INSPECTION_OVERVIEW,
  FOLDER_SECTIONS.DAMAGE_GRIDS,
  FOLDER_SECTIONS.PHOTO_EVIDENCE,
  FOLDER_SECTIONS.CODE_COMPLIANCE,
  FOLDER_SECTIONS.SCOPE_PRICING,
  FOLDER_SECTIONS.REPAIR_JUSTIFICATION,
  FOLDER_SECTIONS.CONTRACTOR_SUMMARY,
  FOLDER_SECTIONS.TIMELINE,
  FOLDER_SECTIONS.HOMEOWNER_STATEMENT,
  FOLDER_SECTIONS.ADJUSTER_COVER_LETTER,
  FOLDER_SECTIONS.CLAIM_CHECKLIST,
  FOLDER_SECTIONS.DIGITAL_SIGNATURES,
  FOLDER_SECTIONS.ATTACHMENTS,
]);

// Section icon mapping — keyed by FolderSectionKey (kebab-case)
const SECTION_ICONS: Partial<Record<FolderSectionKey, React.ReactNode>> = {
  "cover-sheet": <FileText className="h-5 w-5" />,
  "table-of-contents": <FileText className="h-5 w-5" />,
  "executive-summary": <MessageSquare className="h-5 w-5" />,
  "weather-cause-of-loss": <CloudRain className="h-5 w-5" />,
  "inspection-overview": <Eye className="h-5 w-5" />,
  "damage-grids": <MapPin className="h-5 w-5" />,
  "photo-evidence": <ImageIcon className="h-5 w-5" />,
  "test-cuts": <Wrench className="h-5 w-5" />,
  "code-compliance": <FileCode className="h-5 w-5" />,
  "scope-pricing": <Wrench className="h-5 w-5" />,
  "supplements-variances": <RefreshCw className="h-5 w-5" />,
  "repair-justification": <Sparkles className="h-5 w-5" />,
  "contractor-summary": <Shield className="h-5 w-5" />,
  timeline: <Clock className="h-5 w-5" />,
  "homeowner-statement": <User className="h-5 w-5" />,
  "adjuster-cover-letter": <Send className="h-5 w-5" />,
  "claim-checklist": <AlertCircle className="h-5 w-5" />,
  "digital-signatures": <Zap className="h-5 w-5" />,
  attachments: <FileText className="h-5 w-5" />,
};

// Section keys (FolderSectionKey) are already kebab-case URL slugs
// e.g. "cover-sheet", "weather-cause-of-loss" — no mapping needed

function getStatusIcon(status: SectionStatus) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "partial":
      return <Clock className="h-4 w-4 text-amber-500" />;
    case "missing":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "generating":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-slate-400" />;
  }
}

function getStatusColor(status: SectionStatus) {
  switch (status) {
    case "complete":
      return "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950";
    case "partial":
      return "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950";
    case "missing":
      return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950";
    case "generating":
      return "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950";
    default:
      return "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900";
  }
}

// ── Lazy collapsible preview for section data ──
function SectionPreview({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const preview = useMemo(() => {
    const full = JSON.stringify(data, null, 2);
    if (full.length <= 300) return { full, truncated: full, isTruncated: false };
    return { full, truncated: full.slice(0, 300) + "\n  …", isTruncated: true };
  }, [data]);

  return (
    <div className="rounded bg-white/50 p-4 dark:bg-slate-800/50">
      <pre className="max-h-64 overflow-auto text-xs">
        {expanded ? preview.full : preview.truncated}
      </pre>
      {preview.isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {expanded ? "▲ Collapse" : "▼ Show full data"}
        </button>
      )}
    </div>
  );
}

export default function ClaimFolderBuilderPage() {
  const params = useParams();
  const claimIdParam = params?.claimId;
  const claimId = Array.isArray(claimIdParam) ? claimIdParam[0] : claimIdParam;

  const [folder, setFolder] = useState<ClaimFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<Set<FolderSectionKey>>(
    new Set(
      (Object.keys(SECTION_METADATA) as FolderSectionKey[]).filter((s) => ROUTED_SECTIONS.has(s))
    )
  );
  const [activeTab, setActiveTab] = useState("claim-iq");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generating, setGenerating] = useState<FolderSectionKey | null>(null);

  const fetchFolder = useCallback(async () => {
    if (!claimId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/claims-folder/assemble`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      if (!res.ok) {
        throw new Error("Failed to assemble folder");
      }

      const data = await res.json();
      setFolder(data.folder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchFolder();
  }, [fetchFolder]);

  const handleSectionToggle = (section: FolderSectionKey) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedSections(
      new Set(
        (Object.keys(SECTION_METADATA) as FolderSectionKey[]).filter((s) => ROUTED_SECTIONS.has(s))
      )
    );
  };

  const handleSelectNone = () => {
    setSelectedSections(new Set());
  };

  const handleSelectComplete = () => {
    if (!folder || !folder.sectionStatus) return;
    const complete = new Set<FolderSectionKey>();
    for (const [key, status] of Object.entries(folder.sectionStatus)) {
      if (status === "complete") {
        complete.add(key as FolderSectionKey);
      }
    }
    setSelectedSections(complete);
  };

  const handleGenerateSection = async (section: FolderSectionKey) => {
    if (!claimId) return;

    setGenerating(section);

    try {
      // Use unified ClaimIQ section generation API
      const res = await fetch(`/api/claims-folder/generate/section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, sectionKey: section }),
      });

      if (!res.ok) throw new Error("Generation failed");

      // Refresh folder data
      await fetchFolder();
    } catch (err) {
      logger.error("Generation error:", err);
    } finally {
      setGenerating(null);
    }
  };

  const handleExport = async (format: "pdf" | "zip" | "esx") => {
    if (!claimId) return;

    setExporting(true);

    try {
      const res = await fetch(`/api/claims-folder/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          format,
          sections: Array.from(selectedSections),
        }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claim-${claimId}-folder.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportDialogOpen(false);
    } catch (err) {
      logger.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  if (!claimId) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Invalid claim ID</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
          <p className="text-lg font-medium">Assembling Claims Packet...</p>
          <p className="text-sm text-slate-500">Gathering weather data, photos, codes & more</p>
        </div>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-red-600">Failed to load folder</p>
          <p className="mb-4 text-sm text-slate-500">{error || "Unknown error"}</p>
          <Button onClick={fetchFolder}>Try Again</Button>
        </div>
      </div>
    );
  }

  const allSections = (Object.keys(SECTION_METADATA) as FolderSectionKey[]).filter((s) =>
    ROUTED_SECTIONS.has(s)
  );
  const sectionStatus = folder.sectionStatus || ({} as Record<FolderSectionKey, SectionStatus>);
  const completeCount = allSections.filter((s) => sectionStatus[s] === "complete").length;
  const partialCount = allSections.filter((s) => sectionStatus[s] === "partial").length;
  const missingCount = allSections.filter((s) => sectionStatus[s] === "missing").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link href="/claims-ready-folder">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Claims Assembly</h1>
          <p className="text-slate-500">
            Claim #{claimId} •{" "}
            {folder.coverSheet?.insured_name ||
              folder.coverSheet?.policyholderName ||
              "Unknown Insured"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <ReadinessScore score={folder.readinessScore} size="sm" />
          <Button onClick={() => setExportDialogOpen(true)} size="lg">
            <Download className="mr-2 h-5 w-5" />
            Export Package
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-2xl font-bold text-green-700 dark:text-green-300">
              {completeCount}
            </span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400">Complete</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {partialCount}
            </span>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400">Partial</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-2xl font-bold text-red-700 dark:text-red-300">
              {missingCount}
            </span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">Missing</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {selectedSections.size}
            </span>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400">Selected</p>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="claim-iq" className="gap-1">
            <Zap className="h-3.5 w-3.5" />
            Assembly
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">All Sections</TabsTrigger>
          <TabsTrigger value="autopilot" className="gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            Autopilot
          </TabsTrigger>
          <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Claims Assembly Engine Tab */}
        <TabsContent value="claim-iq">
          <ClaimIQDashboard claimId={claimId as string} />
        </TabsContent>

        {/* Autopilot Tab */}
        <TabsContent value="autopilot" className="space-y-6">
          <AutopilotPanel claimId={claimId as string} />
          <PacketGenerationPanel claimId={claimId as string} />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href={`/claims/${claimId}/photos`}>
                <Button variant="outline">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  View Photos
                </Button>
              </Link>
              <Link href={`/claims/${claimId}/weather`}>
                <Button variant="outline">
                  <CloudRain className="mr-2 h-4 w-4" />
                  Weather Data
                </Button>
              </Link>
              <Link href={`/claims/${claimId}/scope`}>
                <Button variant="outline">
                  <Wrench className="mr-2 h-4 w-4" />
                  Scope & Pricing
                </Button>
              </Link>
              <Link href={`/claims/${claimId}/codes`}>
                <Button variant="outline">
                  <FileCode className="mr-2 h-4 w-4" />
                  Code Compliance
                </Button>
              </Link>
            </div>
          </div>

          {/* Section Status Grid */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Section Status</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                  Clear
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSelectComplete}>
                  Complete Only
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {allSections.map((section) => {
                const meta = SECTION_METADATA[section];
                const status = sectionStatus[section] || "missing";
                const isSelected = selectedSections.has(section);
                const isGenerating = generating === section;

                return (
                  <Link
                    key={section}
                    href={`/claims-ready-folder/${claimId}/sections/${section}`}
                    className={`block rounded-lg border p-4 transition-all hover:shadow-md ${getStatusColor(status)} ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => {
                          handleSectionToggle(section);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        id={section}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {SECTION_ICONS[section]}
                          <span className="font-medium">{meta.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{meta.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {isGenerating ? (
                            <Badge variant="outline" className="animate-pulse">
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Generating...
                            </Badge>
                          ) : (
                            <>
                              {getStatusIcon(status)}
                              <span className="text-xs capitalize">{status}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-4">
          {allSections.map((section) => {
            const meta = SECTION_METADATA[section];
            const status = sectionStatus[section] || "missing";
            const data = folder[section as keyof ClaimFolder];

            return (
              <div key={section} className={`rounded-lg border p-6 ${getStatusColor(status)}`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {SECTION_ICONS[section]}
                    <div>
                      <h3 className="font-semibold">{meta.title}</h3>
                      <p className="text-sm text-slate-500">{meta.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <Badge variant={status === "complete" ? "default" : "secondary"}>
                        {status}
                      </Badge>
                    </div>
                    <Link href={`/claims-ready-folder/${claimId}/sections/${section}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Section Data Preview — collapsible */}
                {data && typeof data === "object" && <SectionPreview data={data} />}

                {/* Generate button for AI sections */}
                {(section === "executive-summary" ||
                  section === "repair-justification" ||
                  section === "adjuster-cover-letter") &&
                  status !== "complete" && (
                    <div className="mt-4">
                      <Button
                        onClick={() => handleGenerateSection(section)}
                        disabled={generating === section}
                        variant="outline"
                      >
                        {generating === section ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>
                  )}
              </div>
            );
          })}
        </TabsContent>

        {/* AI Tools Tab */}
        <TabsContent value="ai-tools" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Cause of Loss Analyzer */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Cause of Loss Analyzer</h3>
                  <p className="text-sm text-slate-500">AI-powered narrative</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Correlates weather data, photos, and damage patterns to generate a professional
                cause of loss narrative for carrier submission.
              </p>
              <Button
                onClick={() => handleGenerateSection("executive-summary")}
                disabled={generating === "executive-summary"}
                className="w-full"
              >
                {generating === "executive-summary" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Narrative
                  </>
                )}
              </Button>
            </div>

            {/* Repair Justification */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Repair Justification</h3>
                  <p className="text-sm text-slate-500">Technical reasoning</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Creates code-backed justification for each repair, referencing IRC/IBC standards and
                manufacturer specifications.
              </p>
              <Button
                onClick={() => handleGenerateSection("repair-justification")}
                disabled={generating === "repair-justification"}
                className="w-full"
              >
                {generating === "repair-justification" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileCode className="mr-2 h-4 w-4" />
                    Generate Justification
                  </>
                )}
              </Button>
            </div>

            {/* Cover Letter */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Carrier Cover Letter</h3>
                  <p className="text-sm text-slate-500">Professional summary</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                Generates a professional cover letter summarizing the claim package for adjuster
                review, highlighting key evidence.
              </p>
              <Button
                onClick={() => handleGenerateSection("adjuster-cover-letter")}
                disabled={generating === "adjuster-cover-letter"}
                className="w-full"
              >
                {generating === "adjuster-cover-letter" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Writing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Generate Letter
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {/* Preview Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold">Document Preview</h2>
                <p className="text-sm text-slate-500">
                  Review your claims package before exporting. {selectedSections.size} of{" "}
                  {allSections.length} sections selected.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {completeCount} complete
                </Badge>
                <Badge
                  variant="outline"
                  className="border-amber-300 text-sm text-amber-600 dark:border-amber-700 dark:text-amber-400"
                >
                  {partialCount} partial
                </Badge>
                <Badge
                  variant="outline"
                  className="border-red-300 text-sm text-red-600 dark:border-red-700 dark:text-red-400"
                >
                  {missingCount} missing
                </Badge>
              </div>
            </div>

            {/* Document-style preview */}
            <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
              {/* Title page */}
              <div className="rounded-lg border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-8 text-center dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
                  Claims Assembly Package
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  {folder.coverSheet?.insured_name ||
                    folder.coverSheet?.policyholderName ||
                    "Policyholder"}
                </p>
                <div className="mt-4 space-y-1 text-sm text-slate-500">
                  {folder.coverSheet?.propertyAddress && <p>{folder.coverSheet.propertyAddress}</p>}
                  {folder.coverSheet?.carrier && <p>Carrier: {folder.coverSheet.carrier}</p>}
                  {folder.coverSheet?.policyNumber && (
                    <p>Policy #: {folder.coverSheet.policyNumber}</p>
                  )}
                  {folder.coverSheet?.dateOfLoss && (
                    <p>
                      Date of Loss: {new Date(folder.coverSheet.dateOfLoss).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  Generated {new Date().toLocaleDateString()} by SkaiScraper
                </div>
              </div>

              {/* Section previews */}
              {Array.from(selectedSections).map((section, idx) => {
                const meta = SECTION_METADATA[section];
                const status = sectionStatus[section] || "missing";
                const data = folder[section as keyof ClaimFolder];

                return (
                  <div
                    key={section}
                    className="rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    {/* Section header */}
                    <div
                      className={`flex items-center justify-between border-b px-6 py-3 ${
                        status === "complete"
                          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                          : status === "partial"
                            ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
                            : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400">§{idx + 1}</span>
                        {SECTION_ICONS[section]}
                        <span className="font-semibold">{meta.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(status)}
                        <Link href={`/claims-ready-folder/${claimId}/sections/${section}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Eye className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Section content preview */}
                    <div className="p-6">
                      {status === "missing" ? (
                        <div className="flex items-center justify-center py-8 text-center">
                          <div>
                            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-300 dark:text-red-700" />
                            <p className="text-sm text-slate-500">
                              No data available for this section
                            </p>
                            {meta.title.includes("Summary") ||
                            meta.title.includes("Justification") ||
                            meta.title.includes("Cover Letter") ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => handleGenerateSection(section)}
                                disabled={generating === section}
                              >
                                {generating === section ? (
                                  <>
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="mr-1 h-3 w-3" />
                                    Generate with AI
                                  </>
                                )}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ) : data && typeof data === "object" ? (
                        <SectionPreview data={data} />
                      ) : data ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300">{String(data)}</p>
                      ) : (
                        <p className="text-sm italic text-slate-400">
                          Section marked as {status} — view details for full data.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Export footer */}
            <div className="border-t border-slate-200 p-6 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {selectedSections.size} sections selected •{" "}
                  {
                    Array.from(selectedSections).filter((s) => sectionStatus[s] === "complete")
                      .length
                  }{" "}
                  complete
                </p>
                <Button onClick={() => setExportDialogOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Package
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Claims Package</DialogTitle>
            <DialogDescription>
              Choose your export format. {selectedSections.size} sections selected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">Readiness Score</span>
                <span className="text-2xl font-bold text-blue-600">{folder.readinessScore}%</span>
              </div>
              <Progress value={folder.readinessScore} className="h-2" />
            </div>

            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto justify-start gap-3 py-4"
                onClick={() => handleExport("pdf")}
                disabled={exporting}
              >
                <FileText className="h-5 w-5 text-red-500" />
                <div className="text-left">
                  <p className="font-medium">PDF Document</p>
                  <p className="text-xs text-slate-500">Professional carrier submission format</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto justify-start gap-3 py-4"
                onClick={() => handleExport("zip")}
                disabled={exporting}
              >
                <Download className="h-5 w-5 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium">ZIP Archive</p>
                  <p className="text-xs text-slate-500">All files in organized folders</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto justify-start gap-3 py-4"
                onClick={() => handleExport("esx")}
                disabled={exporting}
              >
                <FileCode className="h-5 w-5 text-green-500" />
                <div className="text-left">
                  <p className="font-medium">Xactimate ESX</p>
                  <p className="text-xs text-slate-500">Direct import to estimating software</p>
                </div>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
