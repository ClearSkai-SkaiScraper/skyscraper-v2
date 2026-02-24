"use client";

import { Calendar, Clock, HardHat, Package, Plus, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Claim {
  id: string;
  claimNumber: string | null;
  title: string | null;
}

interface TeamMember {
  id: string;
  name: string | null;
}

interface CrewScheduleFormProps {
  claims: Claim[];
  teamMembers: TeamMember[];
}

type ScheduleType = "labor" | "delivery" | "inspection";

export function CrewScheduleForm({ claims, teamMembers }: CrewScheduleFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("labor");

  const [form, setForm] = useState({
    claimId: "",
    crewLeadId: "",
    crewMemberIds: [] as string[],
    scheduledDate: "",
    startTime: "08:00",
    estimatedDuration: 8,
    complexity: "medium",
    scopeOfWork: "",
    specialInstructions: "",
  });

  const toggleMember = (id: string) => {
    setForm((prev) => ({
      ...prev,
      crewMemberIds: prev.crewMemberIds.includes(id)
        ? prev.crewMemberIds.filter((m) => m !== id)
        : [...prev.crewMemberIds, id],
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.claimId || !form.scheduledDate) {
      toast.error("Claim and scheduled date are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          crewLeadId: form.crewLeadId || teamMembers[0]?.id || "system",
          scheduleType,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message || "Failed to create schedule");
      }
      toast.success(
        scheduleType === "delivery"
          ? "Delivery scheduled!"
          : scheduleType === "inspection"
            ? "Inspection scheduled!"
            : "Crew scheduled!"
      );
      setOpen(false);
      setForm({
        claimId: "",
        crewLeadId: "",
        crewMemberIds: [],
        scheduledDate: "",
        startTime: "08:00",
        estimatedDuration: 8,
        complexity: "medium",
        scopeOfWork: "",
        specialInstructions: "",
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create schedule");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            setScheduleType("labor");
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <HardHat className="h-4 w-4" />
          Schedule Labor
        </button>
        <button
          onClick={() => {
            setScheduleType("delivery");
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          <Truck className="h-4 w-4" />
          Schedule Delivery
        </button>
        <button
          onClick={() => {
            setScheduleType("inspection");
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white shadow transition hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          <Package className="h-4 w-4" />
          Schedule Inspection
        </button>
      </div>
    );
  }

  const typeLabel =
    scheduleType === "delivery"
      ? "Material Delivery"
      : scheduleType === "inspection"
        ? "Inspection"
        : "Crew Labor";
  const typeColor =
    scheduleType === "delivery"
      ? "from-emerald-600 to-teal-600"
      : scheduleType === "inspection"
        ? "from-amber-600 to-orange-600"
        : "from-blue-600 to-indigo-600";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[color:var(--text)]">
          <span
            className={`inline-flex rounded-lg bg-gradient-to-r ${typeColor} px-3 py-1 text-xs font-bold text-white`}
          >
            {typeLabel}
          </span>
          New Schedule
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Claim */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Claim *</label>
          <select
            required
            value={form.claimId}
            onChange={(e) => setForm({ ...form, claimId: e.target.value })}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
          >
            <option value="">Select a claim...</option>
            {claims.map((c) => (
              <option key={c.id} value={c.id}>
                {c.claimNumber || c.id.slice(0, 8)} — {c.title || "Untitled"}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            <Calendar className="mr-1 inline h-3 w-3" />
            Scheduled Date *
          </label>
          <input
            type="date"
            required
            value={form.scheduledDate}
            onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
          />
        </div>

        {/* Time */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            <Clock className="mr-1 inline h-3 w-3" />
            Start Time
          </label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
          />
        </div>

        {/* Crew Lead */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {scheduleType === "delivery" ? "Delivery Contact" : "Crew Lead"}
          </label>
          <select
            value={form.crewLeadId}
            onChange={(e) => setForm({ ...form, crewLeadId: e.target.value })}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
          >
            <option value="">Select...</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Est. Duration (hrs)
          </label>
          <input
            type="number"
            min={1}
            max={24}
            value={form.estimatedDuration}
            onChange={(e) => setForm({ ...form, estimatedDuration: parseInt(e.target.value) || 8 })}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
          />
        </div>

        {/* Complexity */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Complexity</label>
          <select
            value={form.complexity}
            onChange={(e) => setForm({ ...form, complexity: e.target.value })}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Scope of Work */}
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {scheduleType === "delivery" ? "Delivery Details" : "Scope of Work"}
          </label>
          <input
            value={form.scopeOfWork}
            onChange={(e) => setForm({ ...form, scopeOfWork: e.target.value })}
            placeholder={
              scheduleType === "delivery"
                ? "Materials, supplier, PO number..."
                : "Tear-off, underlayment, shingle install..."
            }
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)] placeholder-slate-400"
          />
        </div>

        {/* Special Instructions */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Special Instructions
          </label>
          <input
            value={form.specialInstructions}
            onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
            placeholder="Gate code, parking, access..."
            className="w-full rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[color:var(--text)] placeholder-slate-400"
          />
        </div>
      </div>

      {/* Crew Members */}
      {scheduleType === "labor" && teamMembers.length > 0 && (
        <div className="mt-4">
          <label className="mb-2 block text-xs font-medium text-slate-500">
            Assign Crew Members
          </label>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((m) => {
              const selected = form.crewMemberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "border-blue-500 bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      : "border-[color:var(--border)] text-slate-500 hover:border-blue-400"
                  }`}
                >
                  {selected ? "✓ " : ""}
                  {m.name || m.id.slice(0, 8)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className={`rounded-xl bg-gradient-to-r ${typeColor} px-6 py-3 font-semibold text-white shadow disabled:opacity-50`}
        >
          {loading ? "Saving..." : `Schedule ${typeLabel}`}
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
