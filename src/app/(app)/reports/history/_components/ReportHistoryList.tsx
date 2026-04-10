"use client";

import {
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Document {
  id: string;
  type: string;
  version: number;
  document_name: string;
  description: string | null;
  status: string;
  file_url: string | null;
  file_format: string;
  file_size_bytes: number | null;
  sections: string[];
  tokens_used: number;
  estimated_cost_cents: number;
  signed_at: string | null;
  signed_by: string | null;
  is_immutable: boolean;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ReportHistoryListProps {
  documents: Document[];
  orgId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ReportHistoryList({ documents, orgId }: ReportHistoryListProps) {
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Loader2 className="h-4 w-4 text-gray-400" />;
      case "generating":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "ready":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "signed":
        return <FileCheck className="h-4 w-4 text-purple-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      queued: "bg-gray-100 text-gray-700",
      generating: "bg-blue-100 text-blue-700",
      ready: "bg-green-100 text-green-700",
      signed: "bg-purple-100 text-purple-700",
      error: "bg-red-100 text-red-700",
    };

    return <Badge className={variants[status] || variants.queued}>{status.toUpperCase()}</Badge>;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      PROPOSAL: "text-blue-600 bg-blue-50",
      PACKET: "text-green-600 bg-green-50",
      CLAIM_MASTER: "text-purple-600 bg-purple-50",
      SUPPLEMENT: "text-orange-600 bg-orange-50",
      REBUTTAL: "text-red-600 bg-red-50",
    };
    return colors[type] || "text-gray-600 bg-gray-50";
  };

  const filteredDocs = documents.filter((doc) => {
    if (filterType && doc.type !== filterType) return false;
    if (filterStatus && doc.status !== filterStatus) return false;
    return true;
  });

  const groupedDocs = filteredDocs.reduce(
    (acc, doc) => {
      const key = doc.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>
  );

  const uniqueTypes = [...new Set(documents.map((d) => d.type))];
  const uniqueStatuses = [...new Set(documents.map((d) => d.status))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-[color:var(--muted)]" />
          <div className="flex gap-2">
            <select
              value={filterType || ""}
              onChange={(e) => setFilterType(e.target.value || null)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm"
              title="Filter by Type"
              aria-label="Filter by Type"
            >
              <option value="">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={filterStatus || ""}
              onChange={(e) => setFilterStatus(e.target.value || null)}
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm"
              title="Filter by Status"
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.toUpperCase()}
                </option>
              ))}
            </select>

            {(filterType || filterStatus) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterType(null);
                  setFilterStatus(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Document Groups */}
      {Object.entries(groupedDocs).length === 0 ? (
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-[color:var(--muted)] opacity-50" />
          <p className="mt-4 text-[color:var(--muted)]">No documents found</p>
        </div>
      ) : (
        Object.entries(groupedDocs).map(([type, docs]) => (
          <div
            key={type}
            className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]"
          >
            <div className="border-b border-[color:var(--border)] bg-[color:var(--surface-3)] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--text)]">{type}</h2>
                  <p className="text-sm text-[color:var(--muted)]">
                    {docs.length} version{docs.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge className={getTypeColor(type)}>{type}</Badge>
              </div>
            </div>

            <div className="divide-y divide-[color:var(--border)]">
              {docs.map((doc) => (
                <div key={doc.id} className="p-6 transition hover:bg-[color:var(--surface-3)]">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-1 items-start gap-4">
                      {getStatusIcon(doc.status)}

                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <h3 className="font-medium text-[color:var(--text)]">
                            {doc.document_name}
                          </h3>
                          <Badge variant="outline">v{doc.version}</Badge>
                          {getStatusBadge(doc.status)}
                          {doc.is_immutable && (
                            <Badge className="bg-purple-100 text-purple-700">SIGNED</Badge>
                          )}
                        </div>

                        {doc.description && (
                          <p className="mb-3 text-sm text-[color:var(--muted)]">
                            {doc.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-[color:var(--muted)]">
                          <span>Created: {new Date(doc.created_at).toLocaleDateString()}</span>
                          {doc.tokens_used > 0 && (
                            <span>{doc.tokens_used.toLocaleString()} tokens</span>
                          )}
                          {doc.file_size_bytes && (
                            <span>{(doc.file_size_bytes / 1024).toFixed(0)} KB</span>
                          )}
                        </div>

                        {doc.error_message && (
                          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-sm text-red-700">{doc.error_message}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(doc.status === "ready" || doc.status === "signed") && (
                        <Button
                          size="sm"
                          onClick={() =>
                            window.open(`/api/generated-documents/${doc.id}/download`, "_blank")
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      )}

                      {doc.status === "ready" && !doc.is_immutable && (
                        <Button size="sm" variant="outline">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Regenerate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
