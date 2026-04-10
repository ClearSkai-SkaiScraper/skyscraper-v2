"use client";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DocActionsMenu } from "@/components/documents/DocActionsMenu";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";

interface PermitDocument {
  id: string;
  title: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  category: string | null;
  notes: string | null;
  createdAt: string;
}

interface Permit {
  id: string;
  permitNumber: string;
  permitType: string;
  jurisdiction: string | null;
  status: string;
  appliedAt: string;
  approvedAt: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  inspectionDate: string | null;
  inspectionNotes: string | null;
  fee: number | null;
  notes: string | null;
  documentUrl: string | null;
}

const statuses = [
  "applied",
  "approved",
  "issued",
  "inspection_scheduled",
  "passed",
  "failed",
  "expired",
] as const;

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  applied: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: <Clock className="h-4 w-4" />,
  },
  approved: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  issued: {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    icon: <FileCheck className="h-4 w-4" />,
  },
  inspection_scheduled: {
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    icon: <Calendar className="h-4 w-4" />,
  },
  passed: {
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  failed: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  expired: {
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    icon: <Clock className="h-4 w-4" />,
  },
};

// Timeline step order for the progress tracker
const TIMELINE_STEPS = [
  { key: "applied", label: "Applied" },
  { key: "approved", label: "Approved" },
  { key: "issued", label: "Issued" },
  { key: "inspection_scheduled", label: "Inspection" },
  { key: "passed", label: "Passed" },
];

export default function PermitDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<PermitDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    status: "",
    inspectionDate: "",
    inspectionNotes: "",
    expiresAt: "",
    fee: "",
    notes: "",
    documentUrl: "",
  });

  const fetchPermit = useCallback(async () => {
    try {
      const res = await fetch(`/api/permits/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const p: Permit = data.data?.permit ?? data.permit;
      setPermit(p);
      setForm({
        status: p.status,
        inspectionDate: p.inspectionDate?.split("T")[0] ?? "",
        inspectionNotes: p.inspectionNotes ?? "",
        expiresAt: p.expiresAt?.split("T")[0] ?? "",
        fee: p.fee != null ? String(p.fee) : "",
        notes: p.notes ?? "",
        documentUrl: p.documentUrl ?? "",
      });
    } catch {
      toast.error("Permit not found");
      router.push("/permits");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void fetchPermit();
    void fetchDocuments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPermit]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/permits/${id}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data?.documents || []);
      }
    } catch {
      // Non-critical — empty docs list
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // 1. Upload the file to Supabase storage
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "permitDocuments");
        const uploadRes = await fetch("/api/upload/supabase", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        const uploadData = await uploadRes.json();

        // 2. Register the document with the permit
        const docRes = await fetch(`/api/permits/${id}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name,
            url: uploadData.url,
            mimeType: file.type,
            sizeBytes: file.size,
            category: "permit",
            linkToJob: true,
          }),
        });
        if (docRes.ok) {
          toast.success(`${file.name} uploaded`);
        }
      }
      await fetchDocuments();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Remove this document?")) return;
    try {
      const res = await fetch(`/api/permits/${id}/documents?docId=${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        toast.success("Document removed");
      }
    } catch {
      toast.error("Failed to remove document");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = {
        status: form.status,
        inspectionNotes: form.inspectionNotes || null,
        notes: form.notes || null,
        documentUrl: form.documentUrl || null,
        fee: form.fee ? Number(form.fee) : null,
      };
      if (form.inspectionDate) body.inspectionDate = form.inspectionDate;
      if (form.expiresAt) body.expiresAt = form.expiresAt;

      if (form.status === "approved" && !permit?.approvedAt) {
        body.approvedAt = new Date().toISOString();
      }
      if (form.status === "issued" && !permit?.issuedAt) {
        body.issuedAt = new Date().toISOString();
      }

      const res = await fetch(`/api/permits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Permit updated successfully");
      router.refresh();
      void fetchPermit();
    } catch {
      toast.error("Failed to save permit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this permit? This action cannot be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/permits/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Permit deleted");
      router.push("/permits");
    } catch {
      toast.error("Failed to delete permit");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!permit) return null;

  const dateStr = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");
  const currentStatus = statusConfig[permit.status] || statusConfig.applied;
  const currentStepIdx = TIMELINE_STEPS.findIndex((s) => s.key === permit.status);

  // Calculate days since applied
  const daysSinceApplied = Math.floor(
    (Date.now() - new Date(permit.appliedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check expiration warning
  const isExpiringSoon =
    permit.expiresAt &&
    new Date(permit.expiresAt).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 &&
    new Date(permit.expiresAt).getTime() > Date.now();
  const isExpired = permit.expiresAt && new Date(permit.expiresAt).getTime() < Date.now();

  return (
    <PageContainer>
      {/* Back link */}
      <Link
        href="/permits"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-[color:var(--primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Permits
      </Link>

      {/* Hero */}
      <PageHero
        section="jobs"
        title={`Permit #${permit.permitNumber}`}
        subtitle={`${permit.permitType} · ${permit.jurisdiction || "No jurisdiction"} · ${daysSinceApplied} days since applied`}
        icon={<FileCheck className="h-5 w-5" />}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${currentStatus.bgColor} ${currentStatus.color}`}
          >
            {currentStatus.icon}
            {permit.status.replace(/_/g, " ")}
          </span>
        </div>
      </PageHero>

      {/* Expiration Warning Banner */}
      {(isExpiringSoon || isExpired) && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            isExpired
              ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
              : "border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30"
          }`}
        >
          <AlertCircle className={`h-5 w-5 ${isExpired ? "text-red-500" : "text-yellow-600"}`} />
          <div>
            <p
              className={`text-sm font-medium ${isExpired ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}
            >
              {isExpired
                ? `This permit expired on ${dateStr(permit.expiresAt)}`
                : `This permit expires on ${dateStr(permit.expiresAt)} — renew soon`}
            </p>
          </div>
        </div>
      )}

      {/* Progress Tracker */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h3 className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          PERMIT PROGRESS
        </h3>
        <div className="flex items-center justify-between">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIdx && currentStepIdx >= 0;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? isCurrent
                          ? "border-[color:var(--primary)] bg-[color:var(--primary)] text-white shadow-lg shadow-blue-500/30"
                          : "border-green-500 bg-green-500 text-white"
                        : "border-slate-300 bg-[var(--surface-2)] text-slate-400 dark:border-slate-600"
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCompleted
                        ? "text-[color:var(--text)]"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 ${
                      idx < currentStepIdx ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Info Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-blue-50 to-sky-50 p-4 dark:from-blue-950/30 dark:to-sky-950/30">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
            <Calendar className="h-3.5 w-3.5" /> Applied
          </div>
          <div className="text-sm font-semibold text-[color:var(--text)]">
            {dateStr(permit.appliedAt)}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:from-green-950/30 dark:to-emerald-950/30">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </div>
          <div className="text-sm font-semibold text-[color:var(--text)]">
            {dateStr(permit.approvedAt)}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-emerald-50 to-teal-50 p-4 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <FileCheck className="h-3.5 w-3.5" /> Issued
          </div>
          <div className="text-sm font-semibold text-[color:var(--text)]">
            {dateStr(permit.issuedAt)}
          </div>
        </div>
        <div className="rounded-xl border border-[color:var(--border)] bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            <DollarSign className="h-3.5 w-3.5" /> Fee
          </div>
          <div className="text-sm font-semibold text-[color:var(--text)]">
            {permit.fee != null ? `$${Number(permit.fee).toLocaleString()}` : "—"}
          </div>
        </div>
      </div>

      {/* ─── Document Upload & Files ─── */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
            <FileText className="h-5 w-5 text-blue-500" />
            Permit Documents
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>

        {/* Legacy document URL */}
        {permit.documentUrl && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <FileText className="h-5 w-5 text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[color:var(--text)]">Legacy Document Link</p>
              <p className="truncate text-xs text-slate-500">{permit.documentUrl}</p>
            </div>
            <a
              href={permit.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          </div>
        )}

        {/* Uploaded Documents */}
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[color:var(--text)]">
                    {doc.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)} KB` : ""}
                    {doc.category ? ` · ${doc.category}` : ""}
                    {doc.createdAt ? ` · ${new Date(doc.createdAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <DocActionsMenu
                  doc={{
                    id: doc.id,
                    title: doc.title,
                    url: doc.url,
                    mimeType: doc.mimeType,
                  }}
                  showArchive={false}
                  showAttach={false}
                  onDelete={async (docId) => {
                    try {
                      const res = await fetch(`/api/permits/${id}/documents?docId=${docId}`, {
                        method: "DELETE",
                      });
                      if (res.ok) {
                        setDocuments((prev) => prev.filter((d) => d.id !== docId));
                        toast.success("Document removed");
                      }
                    } catch {
                      toast.error("Failed to remove document");
                    }
                  }}
                  compact
                />
              </div>
            ))}
          </div>
        ) : (
          !permit.documentUrl && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-slate-200 p-8 text-center transition hover:border-blue-400 dark:border-slate-700"
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Drop files here or click to upload
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PDF, images, or Word documents up to 25 MB
              </p>
            </div>
          )
        )}
      </div>

      {/* Edit Form */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
          <Save className="h-5 w-5 text-[color:var(--primary)]" />
          Edit Permit Details
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Status */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm capitalize text-[color:var(--text)] transition-colors focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Fee */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fee ($)
            </label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="0.01"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] py-3 pl-9 pr-4 text-sm text-[color:var(--text)] transition-colors focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Inspection Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Inspection Date
            </label>
            <input
              type="date"
              value={form.inspectionDate}
              onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)] transition-colors focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Expires At */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Expiration Date
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)] transition-colors focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Inspection Notes */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Inspection Notes
            </label>
            <textarea
              rows={3}
              value={form.inspectionNotes}
              onChange={(e) => setForm({ ...form, inspectionNotes: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)] transition-colors focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Notes from the inspector..."
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              General Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)] transition-colors focus:border-[color:var(--primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Additional notes about this permit..."
            />
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] pt-5">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={saving}
            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" /> Delete Permit
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
