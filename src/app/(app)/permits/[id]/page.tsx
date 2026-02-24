"use client";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Loader2,
  MapPin,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

const statusColors: Record<string, string> = {
  applied: "bg-blue-500/20 text-blue-600",
  approved: "bg-green-500/20 text-green-600",
  issued: "bg-emerald-500/20 text-emerald-600",
  inspection_scheduled: "bg-yellow-500/20 text-yellow-700",
  passed: "bg-green-600/20 text-green-700",
  failed: "bg-red-500/20 text-red-600",
  expired: "bg-slate-500/20 text-slate-600",
};

export default function PermitDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    fetchPermit();
  }, [fetchPermit]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        status: form.status,
        inspectionNotes: form.inspectionNotes || null,
        notes: form.notes || null,
        documentUrl: form.documentUrl || null,
        fee: form.fee ? Number(form.fee) : null,
      };
      if (form.inspectionDate) body.inspectionDate = form.inspectionDate;
      if (form.expiresAt) body.expiresAt = form.expiresAt;

      // Auto-set date fields based on status
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
      router.refresh(); // invalidate Router Cache so list page shows updated values
      fetchPermit(); // refresh detail view
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link
        href="/permits"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Permits
      </Link>

      {/* Title row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--text)]">
            Permit #{permit.permitNumber}
          </h1>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {permit.permitType} · {permit.jurisdiction || "No jurisdiction"}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${statusColors[permit.status] || ""}`}
        >
          {permit.status.replace("_", " ")}
        </span>
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Applied", date: permit.appliedAt, icon: Calendar },
          { label: "Approved", date: permit.approvedAt, icon: CheckCircle2 },
          { label: "Issued", date: permit.issuedAt, icon: FileCheck },
          { label: "Expires", date: permit.expiresAt, icon: Calendar },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-4 backdrop-blur-xl"
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </div>
            <div className="text-sm font-medium text-[color:var(--text)]">{dateStr(item.date)}</div>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--text)]">Edit Permit</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm capitalize text-[color:var(--text)]"
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
            <label className="mb-1 block text-xs font-medium text-slate-500">Fee ($)</label>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="0.01"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: e.target.value })}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] py-3 pl-9 pr-4 text-sm text-[color:var(--text)]"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Inspection Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Inspection Date</label>
            <input
              type="date"
              value={form.inspectionDate}
              onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
            />
          </div>

          {/* Expires At */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Expiration Date</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
            />
          </div>

          {/* Inspection Notes */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Inspection Notes
            </label>
            <textarea
              rows={2}
              value={form.inspectionNotes}
              onChange={(e) => setForm({ ...form, inspectionNotes: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
              placeholder="Notes from the inspector..."
            />
          </div>

          {/* Document URL */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Document URL</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={form.documentUrl}
                onChange={(e) => setForm({ ...form, documentUrl: e.target.value })}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] py-3 pl-9 pr-4 text-sm text-[color:var(--text)]"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">General Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
              placeholder="Additional notes..."
            />
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-6 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" /> Delete Permit
          </button>
        </div>
      </div>
    </div>
  );
}
