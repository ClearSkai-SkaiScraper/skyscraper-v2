// src/app/(app)/claims/[claimId]/timeline/page.tsx
"use client";

import { Clock, Loader2, Plus, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { logger } from "@/lib/logger";
import { inputBase, selectBase, textareaBase } from "@/lib/ui/inputStyles";

import SectionCard from "../_components/SectionCard";

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  createdAt: string;
  createdBy: string;
}

const EVENT_TYPES = [
  { value: "status_change", label: "Status Change", color: "bg-blue-500" },
  { value: "inspection", label: "Inspection", color: "bg-purple-500" },
  { value: "payment", label: "Payment", color: "bg-green-500" },
  { value: "communication", label: "Communication", color: "bg-yellow-500" },
  { value: "document", label: "Document", color: "bg-orange-500" },
  { value: "other", label: "Other", color: "bg-gray-500" },
];

export default function TimelinePage() {
  const params = useParams();
  const claimIdParam = params?.claimId;
  const claimId = Array.isArray(claimIdParam) ? claimIdParam[0] : claimIdParam;
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventType: "other",
  });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label?: string } | null>(null);

  useEffect(() => {
    void fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  // SECURITY: Early return AFTER all hooks to avoid React Hook ordering violation
  if (!claimId) return null;

  const fetchTimeline = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/timeline`);
      const data = await res.json();
      if (data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      logger.error("Failed to fetch timeline:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !formData.title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        alert("❌ Failed to add event. Please try again.");
        setSaving(false);
        return;
      }

      setFormData({ title: "", description: "", eventType: "other" });
      setShowForm(false);
      void fetchTimeline();
    } catch (error) {
      logger.error("Failed to add event:", error);
      alert("Failed to add event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (eventId: string) => {
    setDeleteTarget({ id: eventId });
  };

  const confirmDeleteEvent = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/timeline`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: deleteTarget.id }),
      });

      if (!res.ok) {
        alert("❌ Failed to delete event. Please try again.");
        return;
      }
      void fetchTimeline();
    } catch (error) {
      logger.error("Failed to delete event:", error);
      alert("Failed to delete event");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getEventColor = (type: string) => {
    return EVENT_TYPES.find((t) => t.value === type)?.color || "bg-gray-500";
  };

  if (loading) {
    return (
      <SectionCard title="Timeline">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Timeline"
      action={
        !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
        )
      }
    >
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Event Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={inputBase + " px-3 py-2"}
              placeholder="Called adjuster for update"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={textareaBase + " px-3 py-2"}
              rows={3}
              placeholder="Additional details..."
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Event Type
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className={selectBase + " px-3 py-2"}
              aria-label="Select event type"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Event"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <Clock className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="mb-4 text-slate-600 dark:text-slate-400">No events yet</p>
          <p className="text-sm text-slate-500 dark:text-white/50">
            Activity will appear here as you work on the claim
          </p>
        </div>
      ) : (
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <div className="relative space-y-4">
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <div className="absolute bottom-0 left-1 top-0 w-px bg-slate-200 dark:bg-white/10" />
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          {events.map((event, index) => (
            <div key={event.id} className="relative flex items-start gap-4 pl-6">
              <div
                className={`absolute left-0 mt-2 h-3 w-3 rounded-full ${getEventColor(event.eventType)}`}
              />
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{event.title}</h3>
                    {event.description && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-white/70">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="rounded-lg border border-red-500/30 bg-red-500/20 p-1 text-red-400 transition-colors hover:bg-red-500/30"
                    aria-label="Delete event"
                    title="Delete event"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-white/50">
                  <span
                    className={`rounded-full px-2 py-0.5 ${getEventColor(event.eventType)} text-white`}
                  >
                    {EVENT_TYPES.find((t) => t.value === event.eventType)?.label || event.eventType}
                  </span>
                  <span>•</span>
                  <span>{formatDate(event.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Event"
        description="This timeline event will be permanently removed."
        showArchive={false}
        onConfirmDelete={confirmDeleteEvent}
      />
    </SectionCard>
  );
}
