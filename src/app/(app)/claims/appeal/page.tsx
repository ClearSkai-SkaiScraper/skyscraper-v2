"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Send,
  Upload,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface AppealHistoryItem {
  id: string;
  title: string;
  createdAt: string;
  metadata: {
    appealType: string;
    requestedAmount?: number;
    generatedAt: string;
  };
  fileUrl?: string;
}

export default function ClaimsAppealPage() {
  const searchParams = useSearchParams();
  const claimId = searchParams?.get("claimId") ?? null;

  const [appealType, setAppealType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [additionalEvidence, setAdditionalEvidence] = useState("");
  const [supportingDocs, setSupportingDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [appealHistory, setAppealHistory] = useState<AppealHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (claimId) {
      fetchAppealHistory();
    }
  }, [claimId]);

  const fetchAppealHistory = async () => {
    if (!claimId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/appeal`);
      if (res.ok) {
        const data = await res.json();
        setAppealHistory(data.appeals || []);
      }
    } catch (err) {
      logger.error("Failed to fetch appeal history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimId) {
      setError("Claim ID is required. Please provide ?claimId=... in the URL.");
      return;
    }

    if (!appealType || !reason) {
      setError("Appeal type and reason are required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setGeneratedDocument(null);

    try {
      const payload: any = {
        appealType,
        reason,
        additionalEvidence: additionalEvidence || undefined,
        supportingDocs: supportingDocs.length > 0 ? supportingDocs : undefined,
      };

      if (requestedAmount) {
        const amount = parseFloat(requestedAmount.replace(/[^0-9.-]+/g, ""));
        if (!isNaN(amount)) {
          payload.requestedAmount = amount;
        }
      }

      const res = await fetch(`/api/claims/${claimId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate appeal");
      }

      setGeneratedDocument(data.document);
      setReportId(data.reportId);
      setSuccess(true);
      fetchAppealHistory(); // Refresh history
    } catch (err) {
      setError(err.message || "An error occurred while generating the appeal");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedDocument) return;
    const blob = new Blob([generatedDocument], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claim_appeal_${appealType}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setAppealType("");
    setReason("");
    setRequestedAmount("");
    setAdditionalEvidence("");
    setSupportingDocs([]);
    setSuccess(false);
    setError(null);
    setGeneratedDocument(null);
    setReportId(null);
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">AI Claims Appeals</h1>
        <p className="mt-2 text-muted-foreground">
          Generate professional appeal letters powered by GPT-4o for claim denials, undervaluations,
          bad faith, or delays.
        </p>
      </div>

      {!claimId && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Missing Claim ID</AlertTitle>
          <AlertDescription>
            Please provide a claim ID in the URL: ?claimId=YOUR_CLAIM_ID
          </AlertDescription>
        </Alert>
      )}

      {claimId && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  New Appeal
                </CardTitle>
                <CardDescription>
                  Complete the form below to generate an AI-powered appeal document.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="appealType">Appeal Type</Label>
                    <Select value={appealType} onValueChange={setAppealType}>
                      <SelectTrigger id="appealType">
                        <SelectValue placeholder="Select appeal type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="denial">Claim Denial</SelectItem>
                        <SelectItem value="undervaluation">Undervaluation</SelectItem>
                        <SelectItem value="bad_faith">Bad Faith</SelectItem>
                        <SelectItem value="delay">Unreasonable Delay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Appeal</Label>
                    <Textarea
                      id="reason"
                      placeholder="Describe the basis for your appeal..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={5}
                      className="resize-none"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Minimum 10 characters. Be specific about policy provisions, evidence, or
                      procedural issues.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="requestedAmount">Requested Amount (optional)</Label>
                    <Input
                      id="requestedAmount"
                      type="text"
                      placeholder="$0.00"
                      value={requestedAmount}
                      onChange={(e) => setRequestedAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="additionalEvidence">Additional Evidence (optional)</Label>
                    <Textarea
                      id="additionalEvidence"
                      placeholder="Summarize any additional evidence, expert reports, or documentation..."
                      value={additionalEvidence}
                      onChange={(e) => setAdditionalEvidence(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="supportingDocs">Supporting Documents (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="supportingDocs"
                        type="text"
                        placeholder="Document name or reference"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.currentTarget.value.trim()) {
                            e.preventDefault();
                            setSupportingDocs([...supportingDocs, e.currentTarget.value.trim()]);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const input = document.getElementById(
                            "supportingDocs"
                          ) as HTMLInputElement;
                          if (input?.value.trim()) {
                            setSupportingDocs([...supportingDocs, input.value.trim()]);
                            input.value = "";
                          }
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    {supportingDocs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {supportingDocs.map((doc, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() =>
                              setSupportingDocs(supportingDocs.filter((_, i) => i !== idx))
                            }
                          >
                            {doc} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button type="submit" disabled={loading || !appealType || !reason}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Generate Appeal
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Generated Document */}
            {success && generatedDocument && (
              <Card className="border-green-500/20 bg-green-50/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    Appeal Generated Successfully
                  </CardTitle>
                  <CardDescription>
                    Report ID: {reportId} • Review the document below and download when ready.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-h-96 overflow-y-auto rounded-lg border bg-card p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm">{generatedDocument}</pre>
                  </div>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Appeal Document
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Appeal History */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  Appeal History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : appealHistory.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No appeals generated yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {appealHistory.map((appeal) => (
                      <div
                        key={appeal.id}
                        className="rounded-lg border p-3 transition hover:bg-accent/5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="line-clamp-1 text-sm font-medium">{appeal.title}</p>
                            <Badge variant="outline" className="mt-1 text-[10px]">
                              {appeal.metadata.appealType.replace("_", " ").toUpperCase()}
                            </Badge>
                          </div>
                          {appeal.fileUrl && (
                            <Button size="icon" variant="ghost" asChild>
                              <a
                                href={appeal.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Download appeal document"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(appeal.createdAt).toLocaleString()}
                        </p>
                        {appeal.metadata.requestedAmount && (
                          <p className="text-xs text-muted-foreground">
                            Requested: ${appeal.metadata.requestedAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li>• Be specific about policy language and coverage provisions</li>
                  <li>• Reference all available evidence and documentation</li>
                  <li>• Include specific dollar amounts when disputing valuations</li>
                  <li>• Cite applicable case law or regulations if known</li>
                  <li>• Review and edit the generated document before submission</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
