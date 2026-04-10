/**
 * UNIVERSAL REPORT EDITOR CLIENT
 * Client-side wrapper with auto-save, finalize, and submit actions
 */

"use client";

import { ArrowLeft, CheckCircle, Lock, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { SubmitReportModal } from "@/components/claims/SubmitReportModal";
import { UniversalReportEditor } from "@/components/reports/UniversalReportEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface UniversalReportEditorClientProps {
  claim: {
    id: string;
    title: string;
    claimNumber: string;
    status: string;
    insured_name: string | null;
    propertyAddress: string;
  };
  initialReport: {
    id: string;
    claimId: string;
    version: number;
    status: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coverPage: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executiveSummary: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    damageSummary: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    damagePhotos: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weatherVerification: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    codeCompliance: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    systemFailure: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scopeOfWork: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    professionalOpinion: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signatures: any;
    pdfUrl: string | null;
    pdfGeneratedAt: string | null;
    createdAt: string;
    updatedAt: string;
    finalizedAt: string | null;
    submittedAt: string | null;
  };
}

export function UniversalReportEditorClient({
  claim,
  initialReport,
}: UniversalReportEditorClientProps) {
  const router = useRouter();
  const [reportStatus, setReportStatus] = useState(initialReport.status);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date>(new Date(initialReport.updatedAt));

  const isReadOnly = reportStatus === "submitted";
  const canFinalize = reportStatus === "draft";
  const canSubmit = reportStatus === "finalized";

  // Auto-save function
  const handleSave = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (reportData: any) => {
      if (isReadOnly) {
        toast.error("Cannot edit a submitted report");
        return;
      }

      try {
        const response = await fetch(`/api/claims/${claim.id}/report`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coverPage: reportData.coverPage,
            executiveSummary: reportData.executiveSummary,
            damageSummary: reportData.damageSummary,
            damagePhotos: reportData.damagePhotos,
            weatherVerification: reportData.weatherVerification,
            codeCompliance: reportData.codeCompliance,
            systemFailure: reportData.systemFailure,
            scopeOfWork: reportData.scopeOfWork,
            professionalOpinion: reportData.professionalOpinion,
            signatures: reportData.signatures,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || "Failed to save report");
          return;
        }

        setLastSaved(new Date());
        toast.success("Report saved");
      } catch (error) {
        logger.error("Save error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to save report");
        throw error;
      }
    },
    [claim.id, isReadOnly]
  );

  // Generate PDF
  const handleGeneratePDF = useCallback(async () => {
    try {
      const response = await fetch(`/api/claims/${claim.id}/report/pdf`);
      if (!response.ok) {
        toast.error("Failed to generate PDF");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `claim-${claim.claimNumber}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded");
    } catch (error) {
      logger.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
  }, [claim.id, claim.claimNumber]);

  // Finalize report
  const handleFinalize = async () => {
    if (!canFinalize) return;

    const confirmed = window.confirm(
      "Finalize this report? This will lock it for review and submission. You can reopen it later if needed."
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/claims/${claim.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize" }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to finalize report");
        setIsProcessing(false);
        return;
      }

      setReportStatus("finalized");
      toast.success("Report finalized");
      router.refresh();
    } catch (error) {
      logger.error("Finalize error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to finalize report");
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit to carrier
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSubmit = async (carrierName: string) => {
    if (!canSubmit) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/claims/${claim.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          carrierName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to submit report");
        setIsProcessing(false);
        return;
      }

      setReportStatus("submitted");
      setShowSubmitModal(false);
      toast.success("Report submitted to carrier");
      router.refresh();
    } catch (error) {
      logger.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit report");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reopen report (admin only)
  const handleReopen = async () => {
    if (reportStatus !== "submitted") return;

    const confirmed = window.confirm(
      "Reopen this submitted report? This should only be done if there is an error that needs correction."
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/claims/${claim.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reopen",
          reason: "Admin correction needed",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to reopen report");
        setIsProcessing(false);
        return;
      }

      setReportStatus("draft");
      toast.success("Report reopened for editing");
      router.refresh();
    } catch (error) {
      logger.error("Reopen error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to reopen report");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/claims/${claim.id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Claim
          </Button>
          <div className="h-6 w-px bg-neutral-200" />
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Universal Claims Report</h1>
            <p className="text-sm text-neutral-600">
              {claim.insured_name || claim.title} • {claim.propertyAddress}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Badge */}
          {reportStatus === "draft" && <Badge variant="secondary">Draft</Badge>}
          {reportStatus === "finalized" && (
            <Badge variant="default" className="bg-sky-600">
              <CheckCircle className="mr-1 h-3 w-3" />
              Finalized
            </Badge>
          )}
          {reportStatus === "submitted" && (
            <Badge variant="default" className="bg-green-600">
              <Lock className="mr-1 h-3 w-3" />
              Submitted
            </Badge>
          )}

          {/* Last Saved */}
          <span className="text-xs text-neutral-500">Saved {lastSaved.toLocaleTimeString()}</span>

          {/* Actions */}
          {canFinalize && (
            <Button onClick={handleFinalize} disabled={isProcessing} variant="default">
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize Report
            </Button>
          )}

          {canSubmit && (
            <Button
              onClick={() => setShowSubmitModal(true)}
              disabled={isProcessing}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="mr-2 h-4 w-4" />
              Submit to Carrier
            </Button>
          )}

          {reportStatus === "submitted" && (
            <Button onClick={handleReopen} disabled={isProcessing} variant="outline" size="sm">
              Reopen (Admin)
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      {isReadOnly && (
        <div className="bg-yellow-50 px-6 py-3 text-center text-sm text-yellow-800">
          This report has been submitted and is read-only. Contact an admin to reopen if changes are
          needed.
        </div>
      )}

      <UniversalReportEditor
        report={{
          ...initialReport,
          status: initialReport.status as "draft" | "finalized" | "submitted" | "under_review",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          systemFailureAnalysis: initialReport.systemFailure as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          signaturesAndContact: initialReport.signatures as any,
          finalizedAt: initialReport.finalizedAt ?? undefined,
          submittedAt: initialReport.submittedAt ?? undefined,
          pdfGeneratedAt: initialReport.pdfGeneratedAt ?? undefined,
          pdfUrl: initialReport.pdfUrl ?? undefined,
        }}
        onSave={handleSave}
        onGeneratePDF={handleGeneratePDF}
      />

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitReportModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          claimId={claim.id}
          claimNumber={claim.claimNumber}
          onSuccess={() => {
            setReportStatus("submitted");
            setShowSubmitModal(false);
            toast.success("Report submitted to carrier");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
