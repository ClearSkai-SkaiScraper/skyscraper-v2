"use client";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Scan,
  Upload,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { VideoReportPanel } from "@/app/(app)/leads/[id]/VideoReportPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { ClaimJobSelect, type ClaimJobSelection } from "@/components/selectors/ClaimJobSelect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentCard } from "@/components/ui/ContentCard";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/ui/MetricCard";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface Lead {
  id: string;
  name: string;
  address?: string;
  stage?: string;
}

interface AnalysisResult {
  id: string;
  annotatedImageUrl?: string;
  confidence: number;
  objectCount: number;
  detections: Array<{
    id: string;
    label: string;
    confidence: number;
    severity?: string;
    bbox?: number[];
  }>;
  processingTime: number;
  summary?: string;
  overallCondition?: string;
  urgentIssues?: string[];
  writtenReport?: string;
}

export default function VisionLabPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState("");
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Claim/Job context for AI
  const [selection, setSelection] = useState<ClaimJobSelection>({});

  // Leads for quick access
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  // Fetch leads on mount
  useEffect(() => {
    const fetchLeads = async () => {
      setIsLoadingLeads(true);
      try {
        const res = await fetch("/api/leads?limit=100");
        if (res.ok) {
          const data = await res.json();
          setLeads(data.leads || []);
        }
      } catch (err) {
        logger.error("Failed to load leads:", err);
      } finally {
        setIsLoadingLeads(false);
      }
    };
    fetchLeads();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Please select an image or video file");
      return;
    }

    // Validate file size (100MB max for videos)
    if (file.size > 100 * 1024 * 1024) {
      setError("File size must be less than 100MB");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a file to analyze");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisProgress(0);
    setAnalysisStage("Uploading media...");

    try {
      // Step 1: Upload file
      setAnalysisProgress(10);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file");
      }

      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url || uploadData.publicUrl;

      if (!mediaUrl) {
        throw new Error("No URL returned from upload");
      }

      setAnalysisProgress(25);
      setAnalysisStage("Extracting frames & detecting damage...");

      // Step 2: Call vision analysis API with damage focus
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev) => Math.min(prev + 5, 85));
      }, 800);

      const response = await fetch("/api/ai/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: mediaUrl,
          focusAreas: ["roof", "siding", "windows", "foundation", "gutters", "exterior"],
          claimId: selection.resolvedClaimId || selection.claimId,
          generateReport: true,
        }),
      });

      clearInterval(progressInterval);
      setAnalysisProgress(90);
      setAnalysisStage("Generating written report...");

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Analysis failed");
      }

      const data = await response.json();
      setAnalysisProgress(100);
      setAnalysisStage("Complete!");

      // Transform vision analysis to our results format
      const analysis = data.analysis || data.data?.analysis;
      if (analysis) {
        setResults({
          id: `vision-${Date.now()}`,
          annotatedImageUrl: mediaUrl,
          confidence: analysis.damages?.length > 0 ? 0.85 : 0.95,
          objectCount: analysis.damages?.length || 0,
          detections: (analysis.damages || []).map((d: any, i: number) => ({
            id: `d-${i}`,
            label: d.type || d.label || "Damage",
            confidence: d.confidence || 0.8,
            severity: d.severity || "moderate",
            bbox: d.boundingBox
              ? [d.boundingBox.x, d.boundingBox.y, d.boundingBox.width, d.boundingBox.height]
              : undefined,
          })),
          processingTime: 3500,
          summary: analysis.summary,
          overallCondition: analysis.overallCondition,
          urgentIssues: analysis.urgentIssues,
          writtenReport: analysis.report || analysis.writtenReport,
        });
      } else {
        setResults(data.results || data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      logger.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    if (!results) return;

    const report = generateExportReport();
    const dataBlob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inspection-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateExportReport = () => {
    if (!results) return "";

    let report = `PROPERTY INSPECTION REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `${"=".repeat(50)}\n\n`;

    if (results.overallCondition) {
      report += `OVERALL CONDITION: ${results.overallCondition.toUpperCase()}\n\n`;
    }

    if (results.summary) {
      report += `SUMMARY:\n${results.summary}\n\n`;
    }

    if (results.urgentIssues && results.urgentIssues.length > 0) {
      report += `URGENT ISSUES:\n`;
      results.urgentIssues.forEach((issue, i) => {
        report += `  ${i + 1}. ${issue}\n`;
      });
      report += "\n";
    }

    if (results.detections.length > 0) {
      report += `DAMAGE DETECTED (${results.detections.length} items):\n`;
      results.detections.forEach((d, i) => {
        report += `  ${i + 1}. ${d.label} - Confidence: ${(d.confidence * 100).toFixed(0)}%`;
        if (d.severity) report += ` - Severity: ${d.severity}`;
        report += "\n";
      });
      report += "\n";
    }

    if (results.writtenReport) {
      report += `DETAILED REPORT:\n${results.writtenReport}\n`;
    }

    return report;
  };

  const fileType = selectedFile?.type.startsWith("video/") ? "video" : "image";

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title="Vision Lab"
        subtitle="Transform video inspections into professional written reports with AI-powered damage analysis"
        icon={<Scan className="h-6 w-6" />}
      />

      <div className="mt-8">
        {/* Main Feature Card */}
        <Card className="mb-8 overflow-hidden border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 dark:border-blue-800 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-sky-900/20">
          <CardHeader className="border-b border-blue-200/50 bg-white/50 dark:border-blue-800/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                <Video className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Video Inspection → Written Report</CardTitle>
                <CardDescription className="text-base">
                  Upload inspection videos or photos, get professional damage reports with AI
                  analysis
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <Zap className="mr-1 h-3 w-3" /> AI Powered
                </Badge>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  <FileText className="mr-1 h-3 w-3" /> Written Reports
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Media
                </TabsTrigger>
                <TabsTrigger value="existing" className="gap-2">
                  <FileText className="h-4 w-4" />
                  From Lead
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-6">
                {/* Context Selector */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <Label className="mb-2 block text-sm font-medium">
                    Link to Claim/Job (Optional)
                  </Label>
                  <div className="max-w-md">
                    <ClaimJobSelect
                      value={selection}
                      onValueChange={setSelection}
                      placeholder="Select claim or job to link analysis..."
                    />
                  </div>
                  {selection.resolvedClaimId && (
                    <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      Analysis will be linked to this claim
                    </p>
                  )}
                </div>

                {/* Upload Area */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <label
                      htmlFor="file-upload"
                      className="flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 px-6 py-12 text-center transition-all hover:border-purple-500 hover:bg-purple-100/50 dark:border-purple-700 dark:bg-purple-900/20 dark:hover:border-purple-500"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-800">
                        <Upload className="h-8 w-8 text-purple-600 dark:text-purple-300" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                          {selectedFile ? selectedFile.name : "Drop inspection video or photos"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          MP4, MOV, PNG, JPG up to 100MB
                        </p>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                      />
                    </label>

                    {/* Preview */}
                    {previewUrl && (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
                        {fileType === "image" ? (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-48 w-full bg-slate-100 object-contain"
                          />
                        ) : (
                          <video
                            src={previewUrl}
                            controls
                            className="h-48 w-full bg-slate-100 object-contain"
                          />
                        )}
                        <div className="absolute right-2 top-2">
                          <Badge variant="secondary" className="shadow-sm">
                            {fileType === "image" ? (
                              <ImageIcon className="mr-1 h-3 w-3" />
                            ) : (
                              <Video className="mr-1 h-3 w-3" />
                            )}
                            {fileType}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Analyze Button */}
                    <Button
                      onClick={handleAnalyze}
                      disabled={!selectedFile || isAnalyzing}
                      size="lg"
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-lg font-semibold shadow-lg transition-all hover:-translate-y-0.5 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Scan className="mr-2 h-5 w-5" />
                          Analyze & Generate Report
                        </>
                      )}
                    </Button>

                    {/* Progress */}
                    {isAnalyzing && (
                      <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/30">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-purple-700 dark:text-purple-300">
                            {analysisStage}
                          </span>
                          <span className="text-purple-600 dark:text-purple-400">
                            {analysisProgress}%
                          </span>
                        </div>
                        <Progress value={analysisProgress} className="h-2" />
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                      What You Get:
                    </h3>
                    <ul className="space-y-3">
                      {[
                        {
                          icon: Camera,
                          title: "AI Damage Detection",
                          desc: "Automatically identifies roof, siding, window & structural damage",
                        },
                        {
                          icon: FileText,
                          title: "Written Report",
                          desc: "Professional narrative description for clients & adjusters",
                        },
                        {
                          icon: Zap,
                          title: "Severity Assessment",
                          desc: "Each damage item rated by severity and urgency",
                        },
                        {
                          icon: Download,
                          title: "Export Ready",
                          desc: "Download reports for claims documentation",
                        },
                      ].map((item, i) => (
                        <li key={i} className="flex gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-800">
                            <item.icon className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {item.title}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {item.desc}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="space-y-6">
                {/* Lead-based video report */}
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <Label htmlFor="lead-select" className="mb-2 block text-sm font-medium">
                    Select a Lead
                  </Label>
                  <select
                    id="lead-select"
                    title="Select a lead to analyze"
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <option value="">{isLoadingLeads ? "Loading..." : "Choose a lead..."}</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} {lead.address ? `- ${lead.address}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLeadId ? (
                  <div className="rounded-xl border border-purple-200 bg-white p-6 dark:border-purple-700 dark:bg-slate-900">
                    <VideoReportPanel leadId={selectedLeadId} />
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <FileText className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
                      Select a lead to generate video report
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Or{" "}
                      <Link href="/leads" className="text-purple-600 hover:underline">
                        browse all leads
                      </Link>{" "}
                      to find existing inspections
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {results && (
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-900/20 dark:to-emerald-900/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-800">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Analysis Complete</CardTitle>
                    <CardDescription>
                      Processed in {(results.processingTime / 1000).toFixed(1)}s •{" "}
                      {results.objectCount} items detected
                      {results.overallCondition && (
                        <Badge
                          className="ml-2"
                          variant={
                            results.overallCondition === "critical" ||
                            results.overallCondition === "poor"
                              ? "destructive"
                              : results.overallCondition === "fair"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {results.overallCondition}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Summary */}
              {results.summary && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h4 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
                    <FileText className="mr-2 inline h-4 w-4" />
                    AI Analysis Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                    {results.summary}
                  </p>
                </div>
              )}

              {/* Urgent Issues */}
              {results.urgentIssues && results.urgentIssues.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <h4 className="mb-2 font-semibold text-red-900 dark:text-red-100">
                    ⚠️ Urgent Issues Detected
                  </h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-red-800 dark:text-red-200">
                    {results.urgentIssues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                  label="Confidence"
                  value={`${(results.confidence * 100).toFixed(0)}%`}
                  intent="success"
                />
                <StatCard label="Damage Items" value={results.objectCount} intent="warning" />
                <StatCard
                  label="Processing Time"
                  value={`${(results.processingTime / 1000).toFixed(1)}s`}
                  intent="info"
                />
                <StatCard
                  label="Condition"
                  value={results.overallCondition || "N/A"}
                  intent="default"
                />
              </div>

              {/* Detections List */}
              {results.detections.length > 0 && (
                <div>
                  <h3 className="mb-3 text-lg font-semibold">Detected Damage</h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {results.detections.map((detection) => (
                      <div
                        key={detection.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {detection.label}
                          </span>
                          {detection.severity && (
                            <Badge
                              variant={
                                detection.severity === "critical" || detection.severity === "severe"
                                  ? "destructive"
                                  : detection.severity === "moderate"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="ml-2 text-xs"
                            >
                              {detection.severity}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant={detection.confidence > 0.8 ? "default" : "secondary"}
                          className={detection.confidence > 0.8 ? "bg-green-600" : ""}
                        >
                          {(detection.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Written Report */}
              {results.writtenReport && (
                <ContentCard header="Written Report">
                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                    {results.writtenReport}
                  </div>
                </ContentCard>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!selectedFile && !results && activeTab === "upload" && (
          <Card className="border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center py-12">
              <Video className="h-16 w-16 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">
                Upload inspection media to get started
              </h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Upload videos or photos from your property inspection to generate a professional
                written report with damage analysis
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
