"use client";

import { Camera, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface ReceiptFile {
  id: string;
  file: File;
  preview: string;
  name: string;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobId, setJobId] = useState("");
  const [kind, setKind] = useState("standard");
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  /* ── Receipt Upload State ─────────────────────────────────────── */
  const [receipts, setReceipts] = useState<ReceiptFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  /* ── Receipt Upload Handlers ──────────────────────────────────── */
  const handleReceiptFiles = (files: FileList | null) => {
    if (!files) return;
    const accepted = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    Array.from(files).forEach((file) => {
      if (!accepted.some((t) => file.type.startsWith(t.split("/")[0]) || file.type === t)) {
        setError("Only images (JPG, PNG, WebP, HEIC) and PDFs are supported");
        return;
      }
      if (file.size > maxSize) {
        setError("Each file must be under 10 MB");
        return;
      }

      const id = `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      setReceipts((prev) => [...prev, { id, file, preview, name: file.name }]);
    });
  };

  const removeReceipt = (id: string) => {
    setReceipts((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((r) => r.id !== id);
    });
  };

  const handleReceiptDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleReceiptDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleReceiptFiles(e.dataTransfer.files);
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;

  const fmt = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobId.trim()) {
      setError("Job ID is required");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError("All line items need a description");
      return;
    }
    if (items.some((i) => i.quantity <= 0)) {
      setError("All line items must have a quantity greater than 0");
      return;
    }
    if (items.some((i) => i.unitPrice <= 0)) {
      setError("All line items must have a unit price greater than 0");
      return;
    }
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      setError("Please enter a valid email address");
      return;
    }
    if (total <= 0) {
      setError("Invoice total must be greater than $0.00");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Build the invoice payload
      const invoicePayload = {
        jobId,
        kind,
        items,
        taxRate,
        discount,
        notes: notes || undefined,
        dueDate: dueDate || undefined,
        customerEmail: customerEmail || undefined,
        receiptCount: receipts.length,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoicePayload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create invoice");
      }
      const invoiceData = await res.json();

      // Upload receipt files if any
      if (receipts.length > 0 && invoiceData.id) {
        const formData = new FormData();
        formData.append("invoiceId", invoiceData.id);
        receipts.forEach((r, i) => {
          formData.append(`receipt_${i}`, r.file);
        });
        // Fire and forget — receipts are supplementary
        fetch("/api/invoices/receipts", { method: "POST", body: formData }).catch(() => {});
      }

      router.push("/invoices");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHero
        section="finance"
        title="Create Invoice"
        subtitle="Build an invoice with line items, tax, and discounts"
        icon={<FileText className="h-6 w-6" />}
      />

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Details */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Invoice Details
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Job ID *
              </label>
              <input
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                placeholder="Paste job ID from CRM"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Invoice Type
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="standard">Standard</option>
                <option value="progress">Progress Billing</option>
                <option value="final">Final Invoice</option>
                <option value="supplement">Supplement</option>
                <option value="change_order">Change Order</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                Customer Email
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Line Items</h2>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="flex-1">
                  {i === 0 && (
                    <label className="mb-1 block text-xs text-slate-500">Description</label>
                  )}
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="Roof replacement - labor"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="w-20">
                  {i === 0 && <label className="mb-1 block text-xs text-slate-500">Qty</label>}
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
                    min={0}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="w-32">
                  {i === 0 && (
                    <label className="mb-1 block text-xs text-slate-500">Unit Price</label>
                  )}
                  <input
                    type="number"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))}
                    min={0}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div className="w-28 py-2 text-right font-mono text-sm text-slate-900 dark:text-white">
                  {fmt(item.quantity * item.unitPrice)}
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 transition-colors hover:border-blue-500 hover:text-blue-500 dark:border-slate-600"
          >
            <Plus className="h-4 w-4" /> Add Line Item
          </button>
        </div>

        {/* Material Receipts / Photos */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80">
          <div className="mb-1 flex items-center gap-2">
            <Camera className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Material Receipts &amp; Photos
            </h2>
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Upload photos of receipts, material invoices, or scan documents. Accepted: JPG, PNG,
            WebP, HEIC, PDF (max 10 MB each).
          </p>

          {/* Drop zone */}
          <div
            onDragEnter={handleReceiptDrag}
            onDragLeave={handleReceiptDrag}
            onDragOver={handleReceiptDrag}
            onDrop={handleReceiptDrop}
            onClick={() => receiptInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-slate-300 hover:border-blue-500 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800/50"
            }`}
          >
            <Upload className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Drag &amp; drop receipts here, or click to browse
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Take a photo of your material receipt or scan the document
            </p>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => handleReceiptFiles(e.target.files)}
            />
          </div>

          {/* Receipt previews */}
          {receipts.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800"
                >
                  {receipt.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receipt.preview}
                      alt={receipt.name}
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <FileText className="h-10 w-10 text-slate-400" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                      {receipt.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(receipt.file.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeReceipt(receipt.id);
                    }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Discount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  min={0}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Payment terms, additional notes..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Subtotal</span>
                  <span className="font-mono">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>Tax ({taxRate}%)</span>
                  <span className="font-mono">{fmt(taxAmount)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                    <span>Discount</span>
                    <span className="font-mono">−{fmt(discount)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
                  <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span className="font-mono">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-slate-200 px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:scale-[1.02] hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
