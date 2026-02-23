"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { logger } from "@/lib/logger";

interface Claim {
  id: string;
  claim_number: string;
  property_address: string;
  status: string;
}

interface Job {
  id: string;
  title: string;
  contactName: string;
  type: "job";
}

interface OrgTemplate {
  id: string;
  name: string;
  title?: string;
  template?: {
    name: string;
    title?: string;
    category?: string;
    thumbnailUrl?: string;
  };
}

interface PreviewResult {
  ok: boolean;
  mergedData: any;
  missingFields: string[];
  mediaCount: number;
  weatherStatus: string;
  template: {
    id: string;
    title: string;
  };
}

interface RecentPDF {
  id: string;
  title: string;
  type: string;
  claimId: string;
  claimNumber?: string;
  pdfUrl: string;
  createdAt: string;
}

export default function PdfBuilderPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<OrgTemplate[]>([]);
  const [recentPDFs, setRecentPDFs] = useState<RecentPDF[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<string>("");
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingPDFs, setLoadingPDFs] = useState(true);
  const [aiNotes, setAiNotes] = useState<string>("");

  useEffect(() => {
    // Check for claimId query param
    const params = new URLSearchParams(window.location.search);
    const claimIdParam = params.get("claimId");

    // Fetch claims — try /api/damage-claims/list first, fallback to /api/claims
    fetch("/api/damage-claims/list")
      .then((res) => {
        if (!res.ok) throw new Error("damage-claims not found");
        return res.json();
      })
      .then((data) => {
        if (data.ok) {
          setClaims(data.claims || []);
          if (claimIdParam && data.claims?.some((c: Claim) => c.id === claimIdParam)) {
            setSelectedClaim(claimIdParam);
          }
        }
      })
      .catch(() => {
        // Fallback to /api/claims
        fetch("/api/claims")
          .then((res) => res.json())
          .then((data) => {
            const list = (data.claims || data.data || []).map((c: any) => ({
              id: c.id,
              claim_number: c.claimNumber || c.claim_number || c.id?.slice(0, 8),
              property_address: c.propertyAddress || c.property_address || "No address",
              status: c.status || "unknown",
            }));
            setClaims(list);
            if (claimIdParam && list.some((c: Claim) => c.id === claimIdParam)) {
              setSelectedClaim(claimIdParam);
            }
          })
          .catch(() => setClaims([]));
      });

    // Fetch jobs (leads with retail job categories)
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) {
          setJobs(
            data.jobs.map((j: any) => ({
              id: j.id,
              title: j.title,
              contactName: j.contactName || "Unknown",
              type: "job" as const,
            }))
          );
        }
      });

    // Fetch org templates
    fetch("/api/templates/company")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setTemplates(data.templates || []);
        }
      });

    // Fetch recent PDFs (GeneratedArtifacts)
    fetch("/api/reports/recent?limit=10")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setRecentPDFs(data.artifacts || []);
        }
      })
      .finally(() => setLoadingPDFs(false));
  }, []);

  const handlePreview = async () => {
    if (!selectedClaim || !selectedTemplate) return;

    setLoading(true);
    try {
      const res = await fetch("/api/reports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaim,
          orgTemplateId: selectedTemplate,
        }),
      });
      const data = await res.json();
      setPreview(data);
    } catch (error) {
      logger.error("Preview error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedClaim || !selectedTemplate) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaim,
          orgTemplateId: selectedTemplate,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${selectedClaim}-${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const error = await res.json();
        alert(`PDF generation failed: ${error.error}`);
      }
    } catch (error) {
      logger.error("Generate error:", error);
      alert("PDF generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageContainer>
      <PageHero
        section="reports"
        title="Report Builder"
        subtitle="Select a claim or job and template to generate a professional branded report"
        icon={<FileText className="h-6 w-6" />}
      />
      <div className="mt-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Claim / Job</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClaim} onValueChange={setSelectedClaim}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a claim or job..." />
                </SelectTrigger>
                <SelectContent>
                  {claims.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Claims
                      </div>
                      {claims.map((claim) => (
                        <SelectItem key={claim.id} value={claim.id}>
                          📋 {claim.claim_number} - {claim.property_address}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {jobs.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Jobs
                      </div>
                      {jobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          🔧 {job.title} - {job.contactName}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {claims.length === 0 && jobs.length === 0 && (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      No claims or jobs found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Select Template</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                      No templates found.{" "}
                      <a href="/reports/templates/marketplace" className="text-blue-600 underline">
                        Browse Marketplace
                      </a>
                    </div>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name || t.title || t.template?.name || "Untitled"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* AI Notes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              3. Additional Notes (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any additional summaries, notes, observations, or context you'd like included in the report. This is perfect for details not captured in the claim file - e.g., conversation notes with homeowner, special circumstances, recommended next steps, or anything else relevant to this job..."
              value={aiNotes}
              onChange={(e) => setAiNotes(e.target.value)}
              className="min-h-[120px] resize-y"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              These notes will be included in your generated report under an &ldquo;Additional
              Notes&rdquo; section.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={handlePreview}
            disabled={!selectedClaim || !selectedTemplate || loading}
            variant="outline"
          >
            {loading ? "Loading..." : "Preview Merge"}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedClaim || !selectedTemplate || generating || !preview?.ok}
          >
            {generating ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Merge Preview Inspector</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview.ok ? (
                <>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Template: {preview.template.title}</span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Missing fields: {preview.missingFields.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Media count: {preview.mediaCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={preview.weatherStatus === "available" ? "default" : "secondary"}
                      >
                        Weather: {preview.weatherStatus}
                      </Badge>
                    </div>
                  </div>

                  {preview.missingFields.length > 0 && (
                    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-semibold text-yellow-900">Missing placeholders:</p>
                          <ul className="mt-1 list-inside list-disc text-sm text-yellow-800">
                            {preview.missingFields.map((field) => (
                              <li key={field}>{field}</li>
                            ))}
                          </ul>
                          <p className="mt-2 text-xs text-yellow-700">
                            Fallback values will be used where available.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-md border p-4">
                    <p className="mb-2 font-semibold">Merged Data Preview:</p>
                    <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">
                      {JSON.stringify(preview.mergedData, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>Preview failed: {(preview as any).error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Recent PDFs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent PDFs</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPDFs ? (
              <div className="py-8 text-center text-sm text-slate-500">Loading recent PDFs...</div>
            ) : recentPDFs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <FileText className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                <p className="mb-2 font-semibold text-slate-700">No PDFs yet</p>
                <p className="text-sm text-slate-500">
                  Generate your first PDF from{" "}
                  <a href="/ai/tools/supplement" className="text-blue-600 underline">
                    Tools → Supplement
                  </a>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentPDFs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <h4 className="font-medium text-slate-900">{pdf.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {pdf.type}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        {pdf.claimNumber && <span>Claim: {pdf.claimNumber}</span>}
                        <span>•</span>
                        <span>{new Date(pdf.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pdf.pdfUrl && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(pdf.pdfUrl, "_blank")}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = pdf.pdfUrl;
                              a.download = `${pdf.title}.pdf`;
                              a.click();
                            }}
                            className="gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </>
                      )}
                      {pdf.claimId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/claims/${pdf.claimId}`)}
                        >
                          View Claim
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
