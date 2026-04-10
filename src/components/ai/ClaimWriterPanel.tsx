/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-unused-vars */
/**
 * Claim Writer Panel Component
 *
 * Phase 38: AI-powered insurance claim generation
 * Generates complete claims with scope, narrative, rebuttals, and summary
 */

"use client";

import {
  AlertCircle,
  CheckCircle,
  Download,
  FileDown,
  FileText,
  Loader2,
  Package,
  Send,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface ClaimWriterPanelProps {
  leadId: string;
}

interface ClaimData {
  id: string;
  scopeJson: {
    categories: Array<{
      name: string;
      items: Array<{
        code: string;
        description: string;
        quantity: number;
        unit: string;
        notes?: string;
      }>;
    }>;
  };
  narrative: string;
  carrierNotes: {
    wearAndTear: string;
    functionalDamage: string;
    priorDamage: string;
  };
  summary: string;
  createdAt: string;
}

interface GenerationStage {
  name: string;
  label: string;
  status: "pending" | "in-progress" | "complete" | "error";
}

export function ClaimWriterPanel({ leadId }: ClaimWriterPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<GenerationStage[]>([
    { name: "scope", label: "Generating Xactimate Scope", status: "pending" },
    { name: "narrative", label: "Writing Claim Narrative", status: "pending" },
    { name: "rebuttals", label: "Preparing Carrier Rebuttals", status: "pending" },
  ]);

  const updateStage = (stageName: string, status: GenerationStage["status"]) => {
    setStages((prev) =>
      prev.map((stage) => (stage.name === stageName ? { ...stage, status } : stage))
    );
  };

  const generateClaim = async () => {
    setIsGenerating(true);
    setError(null);
    setClaimData(null);

    // Reset stages
    setStages([
      { name: "scope", label: "Generating Xactimate Scope", status: "pending" },
      { name: "narrative", label: "Writing Claim Narrative", status: "pending" },
      { name: "rebuttals", label: "Preparing Carrier Rebuttals", status: "pending" },
    ]);

    try {
      // Stage 1: Generate scope
      updateStage("scope", "in-progress");
      await new Promise((resolve) => setTimeout(resolve, 500)); // Visual feedback

      // Stage 2: Generate narrative
      updateStage("scope", "complete");
      updateStage("narrative", "in-progress");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stage 3: Generate rebuttals
      updateStage("narrative", "complete");
      updateStage("rebuttals", "in-progress");

      // Make API call
      const response = await fetch("/api/ai/claim-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError("Insufficient AI tokens. Please upgrade your plan.");
          toast.error("Insufficient Tokens", {
            description: "Your organization needs more AI tokens to generate claims.",
          });
        } else if (response.status === 404) {
          setError("Lead not found. Please check the lead ID.");
          toast.error("Lead Not Found", {
            description: data.error || "Could not find the specified lead.",
          });
        } else {
          setError(data.error || "Failed to generate claim. Please try again.");
          toast.error("Generation Failed", {
            description: data.error || "An error occurred during claim generation.",
          });
        }
        updateStage("rebuttals", "error");
        return;
      }

      // Success
      updateStage("rebuttals", "complete");
      setClaimData(data.claim);

      toast.success("Claim Generated Successfully", {
        description: "Your AI-powered insurance claim is ready for review.",
      });
    } catch (error) {
      logger.error("Error generating claim:", error);
      setError("Network error. Please check your connection and try again.");
      updateStage("rebuttals", "error");
      toast.error("Network Error", {
        description: "Failed to connect to claim generation service.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportMarkdown = () => {
    if (!claimData) return;

    let markdown = `# Insurance Claim - ${new Date(claimData.createdAt).toLocaleDateString()}\n\n`;

    markdown += `## Executive Summary\n\n${claimData.summary}\n\n`;

    markdown += `## Claim Narrative\n\n${claimData.narrative}\n\n`;

    markdown += `## Scope of Work\n\n`;
    claimData.scopeJson.categories.forEach((category) => {
      markdown += `### ${category.name}\n\n`;
      markdown += `| Code | Description | Quantity | Unit | Notes |\n`;
      markdown += `|------|-------------|----------|------|-------|\n`;
      category.items.forEach((item) => {
        markdown += `| ${item.code} | ${item.description} | ${item.quantity} | ${item.unit} | ${item.notes || "-"} |\n`;
      });
      markdown += `\n`;
    });

    markdown += `## Carrier Rebuttals\n\n`;
    markdown += `### Wear and Tear\n${claimData.carrierNotes.wearAndTear}\n\n`;
    markdown += `### Functional Damage\n${claimData.carrierNotes.functionalDamage}\n\n`;
    markdown += `### Prior Damage\n${claimData.carrierNotes.priorDamage}\n\n`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claim-${leadId}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Exported to Markdown", {
      description: "Claim document downloaded successfully.",
    });
  };

  const exportPDF = () => {
    if (!claimData) return;

    // TODO: Implement PDF export with proper formatting
    // For now, show a message
    toast.info("PDF Export Coming Soon", {
      description: "Use Markdown export for now, or copy from the browser.",
    });
  };

  const sendToAdjuster = () => {
    if (!claimData) return;

    // TODO: Implement email/send functionality
    toast.info("Send Feature Coming Soon", {
      description: "For now, export and send manually via email.",
    });
  };

  const getStageIcon = (status: GenerationStage["status"]) => {
    switch (status) {
      case "pending":
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
      case "in-progress":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case "complete":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">AI Claim Writer</CardTitle>
                <CardDescription>
                  Generate complete insurance claims with professional narratives
                </CardDescription>
              </div>
            </div>
            {claimData && (
              <Badge variant="outline" className="ml-auto">
                <Sparkles className="mr-1 h-3 w-3" />
                Generated {new Date(claimData.createdAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!claimData && !isGenerating && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <div className="rounded-full bg-blue-100 p-6 dark:bg-blue-900/30">
                <FileText className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Claim Generated Yet</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Generate an AI-powered insurance claim including scope of work, narrative, carrier
                  rebuttals, and executive summary. Ready for submission to adjusters.
                </p>
              </div>
              <Button size="lg" onClick={generateClaim} className="bg-blue-600 hover:bg-blue-700">
                <FileText className="mr-2 h-4 w-4" />
                Generate Insurance Claim
              </Button>
              <p className="text-xs text-muted-foreground">Cost: 15 AI tokens</p>
            </div>
          )}

          {isGenerating && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-semibold">Generating Your Claim...</h3>
                <p className="text-sm text-muted-foreground">This will take about 30-60 seconds</p>
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              </div>

              // eslint-disable-next-line react/jsx-no-comment-textnodes
              <div className="mx-auto max-w-md space-y-4">
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                {stages.map((stage, index) => (
                  <div key={stage.name} className="flex items-center gap-3">
                    <div className="flex-shrink-0">{getStageIcon(stage.status)}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{stage.label}</div>
                      {stage.status === "in-progress" && (
                        <div className="text-xs text-muted-foreground">Processing...</div>
                      )}
                      {stage.status === "complete" && (
                        <div className="text-xs text-green-600">Complete</div>
                      )}
                      {stage.status === "error" && (
                        <div className="text-xs text-red-600">Failed</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {claimData && (
        <>
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportMarkdown} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Markdown
            </Button>
            <Button onClick={exportPDF} variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={sendToAdjuster} variant="outline">
              <Send className="mr-2 h-4 w-4" />
              Send to Adjuster
            </Button>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch("/api/export/complete-packet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ leadId }),
                  });
                  const data = await response.json();
                  if (response.ok && data.downloadUrl) {
                    window.open(data.downloadUrl, "_blank");
                    toast.success("Complete Packet Ready", {
                      description: "Downloading claim + estimate bundle...",
                    });
                  } else {
                    toast.error("Export Failed", { description: data.error });
                  }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_error) {
                  toast.error("Export Failed", { description: "Network error" });
                }
              }}
              variant="default"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Package className="mr-2 h-4 w-4" />
              Download Complete Packet (ZIP)
            </Button>
            <Button onClick={generateClaim} variant="ghost" size="sm" className="ml-auto">
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{claimData.summary}</p>
            </CardContent>
          </Card>

          {/* Claim Narrative */}
          <Card>
            <CardHeader>
              <CardTitle>Claim Narrative</CardTitle>
              <CardDescription>Professional narrative ready for submission</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{claimData.narrative}</p>
            </CardContent>
          </Card>

          {/* Scope of Work */}
          <Card>
            <CardHeader>
              <CardTitle>Scope of Work</CardTitle>
              <CardDescription>Xactimate-structured line items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {claimData.scopeJson.categories.map((category, idx) => (
                  <div key={idx}>
                    <h4 className="mb-3 font-semibold">{category.name}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Code</th>
                            <th className="p-2 text-left">Description</th>
                            <th className="p-2 text-right">Quantity</th>
                            <th className="p-2 text-left">Unit</th>
                            <th className="p-2 text-left">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.items.map((item, itemIdx) => (
                            <tr key={itemIdx} className="border-b">
                              <td className="p-2 font-mono text-xs">{item.code}</td>
                              <td className="p-2">{item.description}</td>
                              <td className="p-2 text-right">{item.quantity}</td>
                              <td className="p-2">{item.unit}</td>
                              <td className="p-2 text-muted-foreground">{item.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Carrier Rebuttals */}
          <Card>
            <CardHeader>
              <CardTitle>Carrier Rebuttals</CardTitle>
              <CardDescription>Pre-prepared responses to common denials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Wear and Tear Arguments</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {claimData.carrierNotes.wearAndTear}
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Functional Damage Arguments</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {claimData.carrierNotes.functionalDamage}
                  </p>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Prior Damage Arguments</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {claimData.carrierNotes.priorDamage}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
