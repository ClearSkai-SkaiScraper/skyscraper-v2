"use client";

import {
  CheckCircleIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

import { logger } from "@/lib/logger";

interface DenialReason {
  category: string;
  reason: string;
  severity: string;
}

interface AppealArgument {
  reason: string;
  rebuttal: string;
  citations: string[];
  strength: string;
}

interface LegalCitation {
  type: string;
  reference: string;
  text: string;
  relevance: string;
}

interface DenialResponse {
  id: string;
  claimId: string;
  orgId: string;
  denialPdfUrl: string;
  extractedText: string;
  denialReasons: DenialReason[];
  appealArguments: AppealArgument[];
  legalCitations: LegalCitation[];
  appealSummary: string;
  emailDraft: string;
  successRate: number;
  tone: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function DenialResponsePanel({ claimId }: { claimId: string }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [denialResponse, setDenialResponse] = useState<DenialResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<"professional" | "firm" | "legal">(
    "professional"
  );

  useEffect(() => {
    void fetchDenialResponse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const fetchDenialResponse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/denial/${claimId}`);
      if (response.ok) {
        const data = await response.json();
        setDenialResponse(data);
        setSelectedTone(data.tone || "professional");
      } else {
        setDenialResponse(null);
      }
    } catch (err) {
      logger.error("Error fetching denial response:", err);
      setError("Failed to load denial response");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file.type.includes("pdf")) {
        setError("Please upload a PDF file");
        return;
      }

      try {
        setGenerating(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("tone", selectedTone);

        const response = await fetch(`/api/denial/${claimId}`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate appeal");
        }

        const data = await response.json();
        setDenialResponse(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        logger.error("Error generating appeal:", err);
        setError(err.message || "Failed to generate appeal");
      } finally {
        setGenerating(false);
      }
    },
    [claimId, selectedTone]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: generating,
  });

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "severe":
        return "text-red-600 bg-red-50 border-red-200";
      case "moderate":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "minor":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength.toLowerCase()) {
      case "strong":
        return "text-green-600 bg-green-50";
      case "moderate":
        return "text-yellow-600 bg-yellow-50";
      case "weak":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading denial response...</p>
      </div>
    );
  }

  if (!denialResponse) {
    return (
      <div className="p-6">
        {/* Tone Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">Appeal Tone</label>
          <div className="flex gap-2">
            {(["professional", "firm", "legal"] as const).map((tone) => (
              <button
                key={tone}
                onClick={() => setSelectedTone(tone)}
                className={`rounded-lg border px-4 py-2 capitalize transition-colors ${
                  selectedTone === tone
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          } ${generating ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Upload Denial Letter</h3>
          <p className="mt-2 text-gray-600">
            {isDragActive ? "Drop the PDF here..." : "Drag & drop a denial PDF, or click to select"}
          </p>
          <p className="mt-1 text-sm text-gray-500">PDF files only</p>
          {generating && (
            <div className="mt-6">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Analyzing denial letter...</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Denial Response Analysis</h2>
          <p className="mt-1 text-gray-600">AI-powered appeal generation</p>
        </div>
        <div className="flex gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              denialResponse.status === "approved"
                ? "bg-green-100 text-green-800"
                : denialResponse.status === "denied"
                  ? "bg-red-100 text-red-800"
                  : denialResponse.status === "sent"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {denialResponse.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Success Rate */}
      <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Estimated Success Rate</p>
            <p className="mt-1 text-4xl font-bold text-blue-600">{denialResponse.successRate}%</p>
          </div>
          <CheckCircleIcon className="h-16 w-16 text-blue-400 opacity-30" />
        </div>
      </div>

      {/* Denial Reasons */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Denial Reasons Identified</h3>
        <div className="space-y-3">
          {denialResponse.denialReasons.map((reason, idx) => (
            <div key={idx} className={`rounded-lg border p-4 ${getSeverityColor(reason.severity)}`}>
              <div className="flex items-start gap-3">
                <ExclamationCircleIcon className="mt-0.5 h-5 w-5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold capitalize">{reason.category}</span>
                    <span className="rounded-full border px-2 py-0.5 text-xs uppercase capitalize">
                      {reason.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{reason.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Appeal Arguments */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">AI-Generated Appeal Arguments</h3>
        <div className="space-y-6">
          {denialResponse.appealArguments.map((arg, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-3 flex items-start justify-between">
                <p className="font-semibold text-gray-900">{arg.reason}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs capitalize ${getStrengthColor(arg.strength)}`}
                >
                  {arg.strength}
                </span>
              </div>
              <p className="mb-3 text-gray-700">{arg.rebuttal}</p>
              {arg.citations.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="mb-2 text-sm font-medium text-gray-700">Legal Citations:</p>
                  <ul className="space-y-1">
                    {arg.citations.map((citation, citIdx) => (
                      <li key={citIdx} className="text-sm text-blue-600">
                        • {citation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legal Citations */}
      {denialResponse.legalCitations.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Legal Citations Database</h3>
          <div className="space-y-3">
            {denialResponse.legalCitations.map((citation, idx) => (
              <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium uppercase text-blue-700">
                    {citation.type}
                  </span>
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {citation.reference}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{citation.text}</p>
                <p className="mt-1 text-xs text-gray-500">Relevance: {citation.relevance}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Appeal Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Appeal Summary</h3>
        <p className="whitespace-pre-line text-gray-700">{denialResponse.appealSummary}</p>
      </div>

      {/* Email Draft */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Email Draft</h3>
          <button
            onClick={() => copyToClipboard(denialResponse.emailDraft)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            Copy
          </button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
          <pre className="whitespace-pre-wrap">{denialResponse.emailDraft}</pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 pt-4">
        <button
          onClick={fetchDenialResponse}
          className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium transition-colors hover:bg-gray-50"
        >
          Refresh
        </button>
        <button
          onClick={() => window.open(denialResponse.denialPdfUrl, "_blank")}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          View Original PDF
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
