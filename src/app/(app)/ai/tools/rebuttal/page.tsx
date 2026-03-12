"use client";

import {
  AlertTriangle,
  Copy,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Scale,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ClaimContextHeader } from "@/components/claims/ClaimContextHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useClaims } from "@/hooks/useClaims";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  extractedText: string;
  status: "uploading" | "extracting" | "ready" | "error";
}

// ---------------------------------------------------------------------------
// Text Extraction Utility
// ---------------------------------------------------------------------------

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    return file.text();
  }

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return `[PDF Document: ${file.name} — paste the denial text in the text box below for best results, or the AI will analyze based on claim data.]`;
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    return `[Word Document: ${file.name} — paste the denial text in the text box below for best results.]`;
  }

  if (file.type.startsWith("image/")) {
    return `[Image: ${file.name} — for scanned denial letters, paste the text in the text box below.]`;
  }

  try {
    return await file.text();
  } catch {
    return `[Could not extract text from ${file.name}]`;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RebuttalBuilderPage() {
  const searchParams = useSearchParams();
  const claimIdFromUrl = searchParams?.get("claimId");
  const { claims } = useClaims();

  // --- State ---
  const [claimId, setClaimId] = useState(claimIdFromUrl || "");
  const [carrierResponse, setCarrierResponse] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [tone, setTone] = useState<string>("professional");
  const [generatedRebuttal, setGeneratedRebuttal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [activeTab, setActiveTab] = useState("input");

  // --- Document Upload ---
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newDoc: UploadedDocument = {
        id: docId,
        name: file.name,
        size: file.size,
        type: file.type,
        extractedText: "",
        status: "extracting",
      };

      setUploadedDocs((prev) => [...prev, newDoc]);

      try {
        const text = await extractTextFromFile(file);
        setUploadedDocs((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, extractedText: text, status: "ready" } : d))
        );
        toast.success(`Processed ${file.name}`);
      } catch {
        setUploadedDocs((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, status: "error" } : d))
        );
        toast.error(`Failed to process ${file.name}`);
      }
    }
  }, []);

  const removeDocument = (docId: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  // --- Build combined denial text from all sources ---
  const buildDenialText = useCallback(() => {
    const parts: string[] = [];

    if (carrierResponse.trim()) {
      parts.push(carrierResponse.trim());
    }

    const extractedTexts = uploadedDocs
      .filter((d) => d.status === "ready" && d.extractedText)
      .map((d) => `--- Document: ${d.name} ---\n${d.extractedText}`);

    if (extractedTexts.length > 0) {
      parts.push(...extractedTexts);
    }

    if (additionalContext.trim()) {
      parts.push(`--- Additional Context from Contractor ---\n${additionalContext.trim()}`);
    }

    return parts.join("\n\n");
  }, [carrierResponse, uploadedDocs, additionalContext]);

  // --- Generate ---
  const handleGenerate = async () => {
    if (!claimId) {
      toast.error("Please select a claim first");
      return;
    }

    const allDenialText = buildDenialText();
    if (!allDenialText.trim()) {
      toast.error("Please provide the carrier's denial — paste it or upload a document");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/rebuttal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          denialText: allDenialText,
          tone,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate rebuttal");

      const data = await response.json();
      const rebuttal = data.rebuttal?.response || data;
      const rebuttalText = rebuttal.letter || rebuttal.rebuttal || rebuttal.content || "";

      setGeneratedRebuttal(rebuttalText);
      setActiveTab("output");
      toast.success("Rebuttal generated successfully!");
    } catch {
      toast.error("Failed to generate rebuttal. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Export PDF ---
  const handleExportPDF = async () => {
    if (!generatedRebuttal || !claimId) {
      toast.error("Generate a rebuttal first");
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/ai/rebuttal/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, rebuttalText: generatedRebuttal }),
      });

      if (!response.ok) throw new Error("Failed to export PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rebuttal-${claimId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF exported successfully!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // --- Helpers ---
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readyDocsCount = uploadedDocs.filter((d) => d.status === "ready").length;
  const hasInput = carrierResponse.trim() || readyDocsCount > 0;

  return (
    <PageContainer maxWidth="7xl">
      <ClaimContextHeader
        title="Rebuttal Builder"
        subtitle="Generate professional, evidence-based rebuttals to carrier denials using AI"
        icon={<Scale className="h-6 w-6" />}
        claims={claims.map((c) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          propertyAddress: c.lossAddress,
          dateOfLoss: null,
        }))}
        selectedClaimId={claimId}
        onClaimChange={setClaimId}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="input" className="gap-2">
            <FileText className="h-4 w-4" />
            Input & Upload
          </TabsTrigger>
          <TabsTrigger value="output" className="gap-2" disabled={!generatedRebuttal}>
            <Sparkles className="h-4 w-4" />
            Generated Rebuttal
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* INPUT TAB                                                        */}
        {/* ================================================================ */}
        <TabsContent value="input">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column — Carrier Response + Upload */}
            <div className="space-y-6 lg:col-span-2">
              {/* Denial Letter Upload */}
              <Card className="border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Upload className="h-5 w-5 text-sky-600" />
                    Upload Denial Letters
                  </CardTitle>
                  <CardDescription>
                    Upload the carrier&apos;s denial letter, reduction notice, or any related
                    correspondence. AI will analyze the content alongside your claim data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="group relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 transition-all hover:border-sky-400 hover:bg-sky-50/30 dark:border-slate-700 dark:bg-slate-950/30 dark:hover:border-sky-600 dark:hover:bg-sky-950/20"
                    onClick={() => document.getElementById("denial-upload")?.click()}
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
                    <Paperclip className="mb-2 h-8 w-8 text-slate-400 group-hover:text-sky-500" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      Drop denial letters here or{" "}
                      <span className="text-sky-600 underline">browse</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">PDF, DOCX, TXT, or images</p>
                    <input
                      id="denial-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </div>

                  {/* Uploaded Documents List */}
                  {uploadedDocs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                                {doc.name}
                              </p>
                              <p className="text-xs text-slate-400">{formatFileSize(doc.size)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.status === "extracting" && (
                              <Badge
                                variant="secondary"
                                className="gap-1 bg-amber-100 text-amber-700"
                              >
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
                </CardContent>
              </Card>

              {/* Paste Carrier Response */}
              <Card className="border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
                <CardHeader>
                  <CardTitle className="text-lg">Carrier Response Text</CardTitle>
                  <CardDescription>
                    Paste the carrier&apos;s denial or reduction response directly, or use the
                    uploader above.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={carrierResponse}
                    onChange={(e) => setCarrierResponse(e.target.value)}
                    placeholder="Paste the carrier's response, denial letter, or reduction notice here..."
                    className="min-h-[200px] bg-white font-mono text-sm dark:bg-slate-950"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column — Settings & Context */}
            <div className="space-y-6">
              {/* Tone Selector */}
              <Card className="border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
                <CardHeader>
                  <CardTitle className="text-lg">Response Tone</CardTitle>
                  <CardDescription>
                    Select the tone for the AI-generated rebuttal letter.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">
                        Professional — Standard business correspondence
                      </SelectItem>
                      <SelectItem value="firm">
                        Firm — Assertive with regulatory citations
                      </SelectItem>
                      <SelectItem value="legal">
                        Legal — Formal with legal precedent references
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Additional Context */}
              <Card className="border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Additional Context for AI
                  </CardTitle>
                  <CardDescription>
                    Add any last-minute details, specific arguments, field observations, or facts
                    you want the AI to incorporate into the rebuttal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder={`e.g., "The adjuster missed the entire east-facing slope. We have 47 photos showing Class 4 hail damage consistent with the NOAA report from 6/15/2025. The denial claims pre-existing damage but the home was re-roofed in 2019."`}
                    className="min-h-[160px] bg-white text-sm dark:bg-slate-950"
                  />
                  <Label className="mt-2 block text-xs text-slate-400">
                    This will be sent to the AI as extra context alongside the denial text and your
                    claim data.
                  </Label>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !hasInput || !claimId}
                className="w-full rounded-xl py-6 text-base shadow-lg shadow-sky-500/20"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    AI Generating Rebuttal...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Rebuttal
                  </>
                )}
              </Button>

              {/* Status Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Input Summary
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-500">
                  <li className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${claimId ? "bg-green-500" : "bg-slate-300"}`}
                    />
                    Claim selected: {claimId ? "Yes" : "No"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${carrierResponse.trim() ? "bg-green-500" : "bg-slate-300"}`}
                    />
                    Carrier response: {carrierResponse.trim() ? "Provided" : "Empty"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${readyDocsCount > 0 ? "bg-green-500" : "bg-slate-300"}`}
                    />
                    Documents uploaded: {readyDocsCount}
                  </li>
                  <li className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${additionalContext.trim() ? "bg-green-500" : "bg-slate-300"}`}
                    />
                    Additional context: {additionalContext.trim() ? "Added" : "None"}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ================================================================ */}
        {/* OUTPUT TAB                                                       */}
        {/* ================================================================ */}
        <TabsContent value="output">
          <div className="space-y-6">
            <Card className="border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Generated Rebuttal</CardTitle>
                    <CardDescription>
                      Review, edit, and export the AI-generated rebuttal letter.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedRebuttal).then(
                          () => toast.success("Copied to clipboard!"),
                          () => toast.error("Failed to copy")
                        );
                      }}
                    >
                      <Copy className="mr-1.5 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExportPDF}
                      disabled={isExporting || !generatedRebuttal || !claimId}
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-1.5 h-4 w-4" />
                          Export PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generatedRebuttal}
                  onChange={(e) => setGeneratedRebuttal(e.target.value)}
                  className="min-h-[500px] bg-white font-mono text-sm leading-relaxed dark:bg-slate-950"
                />
              </CardContent>
            </Card>

            {/* Regenerate & Back */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setActiveTab("input")} className="flex-1">
                ← Back to Input
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
