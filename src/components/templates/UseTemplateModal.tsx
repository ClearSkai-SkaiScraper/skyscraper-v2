"use client";

import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { clientFetch } from "@/lib/http/clientFetch";
import { logger } from "@/lib/logger";

interface UseTemplateModalProps {
  templateId: string;
  templateTitle: string;
  templateSlug?: string;
  onClose: () => void;
}

interface Claim {
  id: string;
  claimNumber: string;
  lossType: string | null;
  dateOfLoss: Date | null;
}

export function UseTemplateModal({
  templateId,
  templateTitle,
  templateSlug,
  onClose,
}: UseTemplateModalProps) {
  const router = useRouter();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [generatedArtifact, setGeneratedArtifact] = useState<any>(null);

  // Load claims on mount
  useState(() => {
    void loadClaims();
  });

  async function loadClaims() {
    try {
      setLoadingClaims(true);
      const response = await clientFetch("/api/claims?limit=100");
      const data = await response.json();
      setClaims(data.claims || []);
    } catch (err) {
      setError("Failed to load claims");
      console.error(err);
    } finally {
      setLoadingClaims(false);
    }
  }

  async function handleGenerate() {
    if (!selectedClaimId) {
      setError("Please select a claim");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Best-effort: ensure this marketplace template is copied into the
      // company's "My Templates" library before generating. This call is
      // resilient and should NOT block PDF generation if it fails for
      // non-critical reasons (e.g. duplicate, missing org, etc.).
      try {
        const addResponse = await clientFetch("/api/templates/add-from-marketplace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Use slug when available so the server can resolve by id OR slug,
            // matching the behavior of the /api/templates/generate endpoint.
            templateId: templateSlug || templateId,
          }),
        });

        if (!addResponse.ok) {
          // Log but do not block generation; My Templates enrichment is a
          // stabilization enhancement, not a hard requirement for report creation.
          logger.warn("[UseTemplateModal] add-from-marketplace failed", addResponse.status);
        }
      } catch (addError) {
        logger.warn("[UseTemplateModal] add-from-marketplace error", addError);
      }

      const response = await clientFetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: templateSlug || templateId,
          claimId: selectedClaimId,
          customTitle: customTitle || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      const data = await response.json();
      setGeneratedArtifact(data.artifact);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (success && generatedArtifact) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-6 flex items-center justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">
            PDF Generated Successfully!
          </h2>
          <p className="mb-6 text-center text-sm text-slate-600">
            Your report has been created and saved to the claim.
          </p>

          <div className="mb-6 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">{generatedArtifact.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              Created {new Date(generatedArtifact.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href={generatedArtifact.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-sky-700"
            >
              Open PDF
            </a>
            <a
              href={generatedArtifact.pdfUrl}
              download
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Download
            </a>
          </div>

          <div className="mt-3 flex gap-3">
            <button
              onClick={() => router.push(`/claims/${generatedArtifact.claimId}`)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View Claim
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-sky-100 p-2">
            <FileText className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Generate Report</h2>
            <p className="text-sm text-slate-600">{templateTitle}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Select Claim <span className="text-red-500">*</span>
          </label>
          {loadingClaims ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading claims...
            </div>
          ) : (
            <select
              value={selectedClaimId}
              onChange={(e) => setSelectedClaimId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              disabled={loading}
              aria-label="Select a claim"
            >
              <option value="">Choose a claim...</option>
              {claims.map((claim) => (
                <option key={claim.id} value={claim.id}>
                  {claim.claimNumber} {claim.lossType ? `- ${claim.lossType}` : ""}
                </option>
              ))}
            </select>
          )}
          {claims.length === 0 && !loadingClaims && (
            <p className="mt-2 text-xs text-slate-500">
              No claims found. Create a claim first to generate reports.
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Custom Title <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={`${templateTitle} - [Claim Number]`}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            disabled={loading}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading || !selectedClaimId || loadingClaims}
            className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate PDF"
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
