"use client";

import { Download, FileText, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ClaimContextHeader } from "@/components/claims/ClaimContextHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useClaims } from "@/hooks/useClaims";

export default function RebuttalBuilderPage() {
  const searchParams = useSearchParams();
  const claimIdFromUrl = searchParams?.get("claimId");
  const { claims } = useClaims();

  const [claimId, setClaimId] = useState(claimIdFromUrl || "");
  const [carrierResponse, setCarrierResponse] = useState("");
  const [generatedRebuttal, setGeneratedRebuttal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("professional");

  const handleGenerate = async () => {
    if (!claimId) {
      toast.error("Please select a claim first");
      return;
    }
    if (!carrierResponse.trim()) {
      toast.error("Please enter the carrier's response");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/rebuttal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, denialText: carrierResponse }),
      });

      if (!response.ok) throw new Error("Failed to generate rebuttal");

      const data = await response.json();
      setGeneratedRebuttal(data.letter || data.rebuttal || data.content || "");
      toast.success("Rebuttal generated successfully!");
    } catch {
      toast.error("Failed to generate rebuttal. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

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

  return (
    <PageContainer maxWidth="7xl">
      <ClaimContextHeader
        title="Rebuttal Builder"
        subtitle="Generate professional rebuttals to carrier responses using AI"
        icon={<FileText className="h-6 w-6" />}
        claims={claims.map((c) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          propertyAddress: c.lossAddress,
          dateOfLoss: null,
        }))}
        selectedClaimId={claimId}
        onClaimChange={setClaimId}
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
      />

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Card */}
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Carrier Response
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Paste the carrier's denial or reduction response
                </p>
              </div>
              <Textarea
                id="carrier-response"
                value={carrierResponse}
                onChange={(e) => setCarrierResponse(e.target.value)}
                placeholder="Enter the carrier's response here..."
                className="min-h-[400px] bg-white font-mono text-sm dark:bg-slate-950"
              />
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !carrierResponse.trim() || !claimId}
                className="w-full rounded-xl shadow-lg shadow-sky-500/20"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Rebuttal
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Output Card */}
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-6 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Generated Rebuttal
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  AI-generated response ready to review and send
                </p>
              </div>
              {generatedRebuttal ? (
                <>
                  <Textarea
                    value={generatedRebuttal}
                    onChange={(e) => setGeneratedRebuttal(e.target.value)}
                    className="min-h-[400px] bg-white font-mono text-sm dark:bg-slate-950"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedRebuttal).then(
                          () => toast.success("Copied to clipboard!"),
                          () => toast.error("Failed to copy")
                        );
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Copy to Clipboard
                    </Button>
                    <Button
                      onClick={handleExportPDF}
                      disabled={isExporting || !generatedRebuttal || !claimId}
                      className="flex-1 rounded-xl"
                    >
                      {isExporting ? (
                        <>
                          <Download className="mr-2 h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export Branded PDF
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10">
                      <FileText className="h-8 w-8 text-sky-600 dark:text-sky-400" />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Generated rebuttal will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
