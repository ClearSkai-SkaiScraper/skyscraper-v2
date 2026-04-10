"use client";

import {
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Loader2,
  Play,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Schedule {
  id: string;
  claimNumber: string;
  claimTitle: string;
  crewLead: { name: string | null; headshot_url: string | null } | null;
  crewMembers: { id: string; name: string | null; headshot_url?: string | null }[];
  scheduledDate: string;
  startTime: string | null;
  estimatedDuration: string | null;
  complexity: string | null;
  status: string;
  scopeOfWork: string | null;
  weatherRisk: string | null;
}

interface TeamMember {
  id: string;
  name: string | null;
}

interface CrewScheduleCardProps {
  schedule: Schedule;
  teamMembers: TeamMember[];
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  in_progress: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
  completed: "bg-green-500/20 text-green-600 dark:text-green-400",
  cancelled: "bg-red-500/20 text-red-600 dark:text-red-400",
};

const nextStatus: Record<string, { label: string; value: string; icon: typeof Play }> = {
  scheduled: { label: "Start Work", value: "in_progress", icon: Play },
  in_progress: { label: "Mark Complete", value: "completed", icon: CheckCircle },
};

export function CrewScheduleCard({ schedule: s, teamMembers }: CrewScheduleCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    scopeOfWork: s.scopeOfWork || "",
    startTime: s.startTime || "08:00",
    estimatedDuration: s.estimatedDuration || "8",
    complexity: s.complexity || "medium",
    specialInstructions: "",
  });

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crews/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crews/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scopeOfWork: editForm.scopeOfWork || null,
          startTime: editForm.startTime,
          estimatedDuration: parseInt(editForm.estimatedDuration) || 8,
          complexity: editForm.complexity,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Schedule updated");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (memberId: string) => {
    const existingIds = s.crewMembers.map((m) => m.id);
    if (existingIds.includes(memberId)) {
      toast.error("Member already assigned");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/crews/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewMemberIds: [...existingIds, memberId] }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Member added");
      setAddingMember(false);
      router.refresh();
    } catch {
      toast.error("Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const newIds = s.crewMembers.map((m) => m.id).filter((id) => id !== memberId);
    setLoading(true);
    try {
      const res = await fetch(`/api/crews/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewMemberIds: newIds }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Member removed");
      router.refresh();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crews/${s.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Schedule deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const next = nextStatus[s.status];
  const availableMembers = teamMembers.filter((m) => !s.crewMembers.some((cm) => cm.id === m.id));

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl transition-all hover:border-[color:var(--border-bright)]">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[s.status] || ""}`}
            >
              {s.status.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-400">{s.complexity} complexity</span>
            {s.weatherRisk && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {s.weatherRisk}
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-[color:var(--text)]">
            {s.claimTitle}{" "}
            <span className="text-sm font-normal text-slate-500">({s.claimNumber})</span>
          </h3>
          {s.scopeOfWork && !editing && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{s.scopeOfWork}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-sm text-[color:var(--text)]">
            <Calendar className="h-4 w-4" /> {s.scheduledDate}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" /> {s.startTime} · {s.estimatedDuration}h
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {next && s.status !== "cancelled" && (
          <button
            onClick={() => handleStatusChange(next.value)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <next.icon className="h-3 w-3" />
            )}
            {next.label}
          </button>
        )}
        {s.status !== "cancelled" && s.status !== "completed" && (
          <button
            onClick={() => handleStatusChange("cancelled")}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircle className="h-3 w-3" /> Cancel
          </button>
        )}
        <button
          onClick={() => setEditing(!editing)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
        >
          <Edit2 className="h-3 w-3" /> Edit
        </button>
        <button
          onClick={() => setAddingMember(!addingMember)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--text)] transition hover:bg-[var(--surface-2)]"
        >
          <UserPlus className="h-3 w-3" /> Add Member
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:text-red-500"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>

      {/* Inline Edit Form */}
      {editing && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] p-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-500">Scope of Work</label>
            <input
              value={editForm.scopeOfWork}
              onChange={(e) => setEditForm({ ...editForm, scopeOfWork: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-glass)] px-3 py-2 text-sm text-[color:var(--text)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Start Time</label>
            <input
              type="time"
              value={editForm.startTime}
              onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-glass)] px-3 py-2 text-sm text-[color:var(--text)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Complexity</label>
            <select
              value={editForm.complexity}
              onChange={(e) => setEditForm({ ...editForm, complexity: e.target.value })}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-glass)] px-3 py-2 text-sm text-[color:var(--text)]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex items-end gap-2 md:col-span-4">
            <button
              onClick={handleSaveEdit}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--text)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Member Dropdown */}
      {addingMember && (
        <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[var(--surface-2)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Assign Team Member</span>
            <button onClick={() => setAddingMember(false)}>
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
          {availableMembers.length === 0 ? (
            <p className="text-xs text-slate-400">All team members are already assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleAddMember(m.id)}
                  disabled={loading}
                  className="rounded-full border border-blue-400 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  + {m.name || m.id.slice(0, 8)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Crew Members */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-medium uppercase text-slate-500">Crew Lead:</span>
        <div className="flex items-center gap-2">
          {s.crewLead?.headshot_url ? (
            <img
              src={s.crewLead.headshot_url}
              alt=""
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
              {(s.crewLead?.name || "?")[0]}
            </div>
          )}
          <span className="text-sm text-[color:var(--text)]">{s.crewLead?.name || "Unknown"}</span>
        </div>

        {s.crewMembers.length > 0 && (
          <>
            <span className="ml-4 text-xs text-slate-400">Members:</span>
            <div className="flex flex-wrap gap-1.5">
              {s.crewMembers.map((m) => (
                <div
                  key={m.id}
                  className="group relative flex items-center gap-1 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[color:var(--text)]"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-bold">
                    {(m.name || "?")[0]}
                  </div>
                  <span>{m.name || m.id.slice(0, 6)}</span>
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="ml-1 hidden text-red-400 hover:text-red-600 group-hover:inline"
                    title="Remove member"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
