"use client";
import { Download, Eye, FileCheck, FileText, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import ClientDocumentSharing from "@/components/claims/ClientDocumentSharing";
import { DocumentForwardButton } from "@/components/documents/DocumentForwardButton";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/uploads";
import { clientFetch } from "@/lib/http/clientFetch";
import { logger } from "@/lib/logger";
/**
 * /claims/[claimId]/documents - Documents tab for specific claim
 * Lists all claim_documents records (depreciation, supplement, certificate PDFs)
 */

interface ClaimDocument {
  id: string;
  type: string;
  title: string;
  description: string | null;
  publicUrl: string;
  mimeType: string;
  fileSize: number | null;
  visibleToClient: boolean;
  createdAt: string;
  createdBy: {
    name: string;
    email: string;
  };
}

export default function ClaimDocumentsPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;
  const router = useRouter();
  const [documents, setDocuments] = useState<ClaimDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (claimId) fetchDocuments();
  }, [claimId]);

  async function fetchDocuments() {
    if (!claimId) return;
    setLoading(true);
    setError("");
    try {
      const data = await clientFetch<{ documents: ClaimDocument[] }>(
        `/api/claims/${claimId}/documents`
      );
      setDocuments(data.documents || []);
      setError(""); // Clear any previous errors
    } catch (err) {
      logger.error("[CLAIMS_DOCS] Fetch error:", {
        status: (err as any).status,
        message: (err as any).message,
        claimId,
      });
      // Handle specific error statuses
      if (err.status === 404) {
        setError(""); // No documents yet - show empty state
        setDocuments([]);
      } else if (err.status === 401 || err.status === 403) {
        setError("You don't have permission to view these documents");
      } else if (err.status >= 500) {
        // Demo hardening: avoid scary server-error banners
        setError("");
        setDocuments([]);
      } else {
        // Network/runtime edge cases: degrade to empty state
        setError("");
        setDocuments([]);
      }
    } finally {
      setLoading(false);
    }
  }

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      DEPRECIATION: "Depreciation Package",
      SUPPLEMENT: "Supplement Request",
      CERTIFICATE: "Completion Certificate",
      INVOICE: "Invoice",
      PHOTO: "Photo",
      CONTRACT: "Contract",
      OTHER: "Other",
    };
    return labels[type] || type;
  };

  const getDocTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      DEPRECIATION: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      SUPPLEMENT: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
      CERTIFICATE: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
      INVOICE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      PHOTO: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
      CONTRACT: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
      OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const toggleClientVisibility = async (documentId: string, currentValue: boolean) => {
    try {
      const response = await fetch(`/api/claims/${claimId}/files/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleToClient: !currentValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to update sharing status");
      }

      // Refresh documents list
      await fetchDocuments();
    } catch (err) {
      logger.error("Toggle share failed:", err);
      alert("Failed to update document sharing. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleUploadComplete = async (urls: string[]) => {
    // Refresh the documents list after successful upload
    await fetchDocuments();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Documents</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
            Generated PDFs, reports, and claim documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push(`/claims/${claimId}/completion`)} className="gap-2">
            <FileCheck className="h-5 w-5" />
            Generate Documents
          </Button>
        </div>
      </div>

      {/* Upload Component */}
      <div className="mb-8">
        <DocumentUpload claimId={claimId!} onUploadComplete={handleUploadComplete} />
      </div>

      {/* Client Document Sharing Component */}
      <div className="mb-8">
        <ClientDocumentSharing claimId={claimId!} onClientAdded={fetchDocuments} />
      </div>

      {/* Error - show friendly message during deployment drift */}
      {error && error !== "TEMPORARY" && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Temporary unavailable state (deployment drift) */}
      {error === "TEMPORARY" && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="mb-2 text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Documents temporarily unavailable
          </p>
          <p className="mb-3 text-xs text-yellow-700 dark:text-yellow-400">
            This can happen during deployment. The service should be back shortly.
          </p>
          <Button onClick={fetchDocuments} size="sm" variant="outline" className="gap-2">
            <Loader2 className="h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {/* Documents List */}
      {!error && documents.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
          <FileText className="mx-auto mb-4 h-16 w-16 text-gray-600 dark:text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            No documents yet
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400 dark:text-gray-600">
            Generate your first document using the completion tools
          </p>
          <Button onClick={() => router.push(`/claims/${claimId}/completion`)} className="gap-2">
            <FileCheck className="h-5 w-5" />
            Go to Completion
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    Visible to Client
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 dark:text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${getDocTypeBadgeColor(
                          doc.type
                        )}`}
                      >
                        {getDocTypeLabel(doc.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {doc.title}
                      </div>
                      {doc.description && (
                        <div className="max-w-md truncate text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                          {doc.description}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-600">
                      {doc.createdBy.name || doc.createdBy.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <button
                        onClick={() => toggleClientVisibility(doc.id, doc.visibleToClient)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                          doc.visibleToClient
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {doc.visibleToClient ? "Shared" : "Private"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => window.open(doc.publicUrl, "_blank")}
                          className="rounded p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:text-gray-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                          title="View document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={doc.publicUrl}
                          download
                          className="rounded p-2 text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-600 dark:text-gray-400 dark:text-gray-600 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
                          title="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <DocumentForwardButton
                          documentId={doc.id}
                          claimId={claimId!}
                          filename={doc.title}
                          onForwarded={fetchDocuments}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
