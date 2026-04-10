"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function PermitForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    permitNumber: "",
    permitType: "roofing",
    jurisdiction: "",
    fee: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/permits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fee: form.fee ? Number(form.fee) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to save permit");
      }
      toast.success("Permit created successfully");
      setOpen(false);
      setForm({ permitNumber: "", permitType: "roofing", jurisdiction: "", fee: "", notes: "" });
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to save permit");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <Plus className="h-4 w-4" /> Add Permit
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl"
    >
      <h2 className="mb-4 text-lg font-semibold text-[color:var(--text)]">New Permit</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <input
          value={form.permitNumber}
          onChange={(e) => setForm({ ...form, permitNumber: e.target.value })}
          placeholder="Permit Number *"
          required
          className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder-slate-400"
        />
        <select
          value={form.permitType}
          onChange={(e) => setForm({ ...form, permitType: e.target.value })}
          className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)]"
        >
          <option value="building">Building</option>
          <option value="roofing">Roofing</option>
          <option value="electrical">Electrical</option>
          <option value="plumbing">Plumbing</option>
          <option value="mechanical">Mechanical</option>
          <option value="demolition">Demolition</option>
          <option value="other">Other</option>
        </select>
        <input
          value={form.jurisdiction}
          onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
          placeholder="Jurisdiction (City/County)"
          className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder-slate-400"
        />
        <input
          type="number"
          step="0.01"
          value={form.fee}
          onChange={(e) => setForm({ ...form, fee: e.target.value })}
          placeholder="Fee ($)"
          className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder-slate-400"
        />
        <input
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Notes"
          className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[color:var(--text)] placeholder-slate-400 md:col-span-2"
        />
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Permit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-[color:var(--border)] px-6 py-3 text-[color:var(--text)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
