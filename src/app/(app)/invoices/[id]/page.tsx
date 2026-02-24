"use client";

import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice_no: string;
  job_id: string;
  kind: string;
  line_items: any[];
  totals: {
    total?: number;
    subtotal?: number;
    tax?: number;
    paidAmount?: number;
    balanceDue?: number;
    status?: string;
  };
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-600",
  sent: "bg-blue-500/20 text-blue-600",
  paid: "bg-green-500/20 text-green-600",
  partial: "bg-yellow-500/20 text-yellow-700",
  voided: "bg-red-500/20 text-red-600",
  overdue: "bg-red-500/20 text-red-600",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusVal, setStatusVal] = useState("draft");
  const [notes, setNotes] = useState("");

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const inv: Invoice = data.data?.invoice ?? data.invoice;
      setInvoice(inv);
      setStatusVal(inv.totals?.status || "draft");
      setNotes(inv.notes || "");
    } catch {
      toast.error("Invoice not found");
      router.push("/invoices");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          status: statusVal,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice updated");
      fetchInvoice();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invoice deleted");
      router.push("/invoices");
    } catch {
      toast.error("Failed to delete");
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
  if (!invoice) return null;

  const totals = invoice.totals || {};
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const fmt = (n: number | undefined) =>
    "$" +
    (n ?? 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Invoices
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--text)]">
            Invoice #{invoice.invoice_no}
          </h1>
          <p className="mt-1 text-sm capitalize text-slate-500">
            {invoice.kind} · Created {new Date(invoice.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${statusColors[totals.status || "draft"] || ""}`}
        >
          {totals.status || "draft"}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Subtotal", value: fmt(totals.subtotal || totals.total) },
          { label: "Tax", value: fmt(totals.tax) },
          { label: "Total", value: fmt(totals.total) },
          { label: "Balance Due", value: fmt(totals.balanceDue ?? totals.total) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-4 backdrop-blur-xl"
          >
            <div className="mb-1 text-xs text-slate-500">{item.label}</div>
            <div className="text-lg font-bold text-[color:var(--text)]">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Line items */}
      {lineItems.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl">
          <div className="border-b border-[color:var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold text-[color:var(--text)]">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {lineItems.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-[color:var(--text)]">
                      {item.description || item.name || `Item ${i + 1}`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {item.qty ?? item.quantity ?? 1}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {fmt(item.unitPrice ?? item.rate ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-[color:var(--text)]">
                      {fmt(item.total ?? item.amount ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit section */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--text)]">Update Invoice</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
            <select
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm capitalize text-[color:var(--text)]"
            >
              {["draft", "sent", "paid", "partial", "voided", "overdue"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1" />
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
              placeholder="Invoice notes..."
            />
          </div>
        </div>
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
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
