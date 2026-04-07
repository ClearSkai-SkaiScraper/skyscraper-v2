"use client";

import { Clock, Download, Loader2, MessageSquare, Pin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import {
  downloadPDF,
  exportClaimSummaryToPDF,
  exportTimelineToPDF,
} from "@/lib/pdf/exportTimeline";

interface TimelineEvent {
  id: string;
  title: string | null;
  description: string | null;
  eventType: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface Note {
  id: string;
  body: string | null;
  noteType: string | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

interface TimelineNotesSectionProps {
  claimId: string;
  timeline: TimelineEvent[];
  notes: Note[];
}

export default function TimelineNotesSection({
  claimId,
  timeline,
  notes,
}: TimelineNotesSectionProps) {
  const router = useRouter();
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    eventType: "update",
    visibleToClient: false,
  });

  const [newNote, setNewNote] = useState({
    body: "",
    noteType: "internal",
    isPinned: false,
    visibleToClient: false,
  });

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      alert("Event title is required");
      return;
    }

    setIsSavingEvent(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });

      if (!res.ok) {
        const errorText = await res.text();
        alert(`Failed to add event: ${errorText}`);
        setIsSavingEvent(false);
        return;
      }

      const result = await res.json();
      logger.debug("Event added:", result);

      setNewEvent({ title: "", description: "", eventType: "update", visibleToClient: false });
      setIsAddingEvent(false);
      router.refresh();
    } catch (error) {
      logger.error("Error adding event:", error);
      alert(error instanceof Error ? error.message : "Failed to add event. Please try again.");
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.body.trim()) {
      alert("Note body is required");
      return;
    }

    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNote),
      });

      if (!res.ok) {
        const errorText = await res.text();
        alert(`Failed to add note: ${errorText}`);
        setIsSavingNote(false);
        return;
      }

      const result = await res.json();
      logger.debug("Note added:", result);

      setNewNote({ body: "", noteType: "internal", isPinned: false, visibleToClient: false });
      setIsAddingNote(false);
      router.refresh();
    } catch (error) {
      logger.error("Error adding note:", error);
      alert(error instanceof Error ? error.message : "Failed to add note. Please try again.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleExportTimeline = async () => {
    try {
      const claimData = {
        claimNumber: claimId,
        status: "Active",
        insured_name: "Unknown",
        propertyAddress: "Unknown",
      };

      const timelineForPdf = timeline.map((event) => ({
        id: event.id,
        title: event.title ?? "(untitled)",
        description: event.description ?? undefined,
        eventType: event.eventType ?? "update",
        createdAt: event.createdAt,
        createdBy: event.createdBy ?? undefined,
      }));

      // Map notes to TimelineNote format expected by PDF export
      const notesForPdf = notes.map((n) => ({
        createdAt: n.createdAt,
        noteType: n.noteType ?? undefined,
        note: n.body ?? "",
      }));

      const blob = await exportTimelineToPDF(claimData, timelineForPdf, notesForPdf);
      downloadPDF(blob, `claim-${claimId}-timeline.pdf`);
    } catch (error) {
      logger.error("Failed to export timeline:", error);
      alert("Failed to export timeline. Please try again.");
    }
  };

  const handleExportSummary = async () => {
    try {
      const claimData = {
        claimNumber: claimId,
        status: "Active",
        insured_name: "Unknown",
        propertyAddress: "Unknown",
      };

      const timelineForPdf = timeline.map((event) => ({
        id: event.id,
        title: event.title ?? "(untitled)",
        description: event.description ?? undefined,
        eventType: event.eventType ?? "update",
        createdAt: event.createdAt,
        createdBy: event.createdBy ?? undefined,
      }));

      const blob = await exportClaimSummaryToPDF(claimData, timelineForPdf);
      downloadPDF(blob, `claim-${claimId}-summary.pdf`);
    } catch (error) {
      logger.error("Failed to export summary:", error);
      alert("Failed to export summary. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeline Section */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900">Timeline</h2>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExportTimeline}
              className="gap-2 bg-green-600 hover:bg-green-700"
              size="sm"
              title="Export timeline as PDF"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            {!isAddingEvent ? (
              <Button onClick={() => setIsAddingEvent(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setIsAddingEvent(false);
                  setNewEvent({
                    title: "",
                    description: "",
                    eventType: "update",
                    visibleToClient: false,
                  });
                }}
                variant="outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Add Event Form */}
        {isAddingEvent && (
          <div className="mb-6 space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Event Title *</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Inspection Scheduled"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional details about this event..."
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Event Type</label>
              <select
                value={newEvent.eventType}
                onChange={(e) => setNewEvent((prev) => ({ ...prev, eventType: e.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                aria-label="Event Type"
              >
                <option value="update">Update</option>
                <option value="status_change">Status Change</option>
                <option value="inspection">Inspection</option>
                <option value="payment">Payment</option>
                <option value="communication">Communication</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="event-visible-to-client"
                checked={newEvent.visibleToClient}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, visibleToClient: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <label
                htmlFor="event-visible-to-client"
                className="text-sm font-medium text-gray-700"
              >
                Visible to homeowner in client portal
              </label>
            </div>
            <Button onClick={handleAddEvent} disabled={isSavingEvent} className="w-full gap-2">
              {isSavingEvent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Event
                </>
              )}
            </Button>
          </div>
        )}

        {/* Timeline Events */}
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No timeline events yet. Add the first event above!
            </p>
          ) : (
            timeline.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-blue-100 bg-blue-50 p-4 transition-all hover:border-blue-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    {event.description && (
                      <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-1 text-blue-700">
                        {event.eventType || "update"}
                      </span>
                      <span>{new Date(event.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
          </div>
          {!isAddingNote ? (
            <Button
              onClick={() => setIsAddingNote(true)}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add Note
            </Button>
          ) : (
            <Button
              onClick={() => {
                setIsAddingNote(false);
                setNewNote({
                  body: "",
                  noteType: "internal",
                  isPinned: false,
                  visibleToClient: false,
                });
              }}
              variant="outline"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Add Note Form */}
        {isAddingNote && (
          <div className="mb-6 space-y-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Note *</label>
              <textarea
                value={newNote.body}
                onChange={(e) => setNewNote((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Write your note here..."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2 transition-all focus:border-transparent focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-gray-700">Note Type</label>
                <select
                  value={newNote.noteType}
                  onChange={(e) => setNewNote((prev) => ({ ...prev, noteType: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 transition-all focus:border-transparent focus:ring-2 focus:ring-green-500"
                  aria-label="Note Type"
                >
                  <option value="internal">Internal</option>
                  <option value="adjuster">Adjuster</option>
                  <option value="homeowner">Homeowner</option>
                  <option value="inspection">Inspection</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pin-note"
                  checked={newNote.isPinned}
                  onChange={(e) => setNewNote((prev) => ({ ...prev, isPinned: e.target.checked }))}
                  className="h-4 w-4 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                />
                <label htmlFor="pin-note" className="text-sm text-gray-700">
                  Pin note
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="note-visible-to-client"
                  checked={newNote.visibleToClient}
                  onChange={(e) =>
                    setNewNote((prev) => ({ ...prev, visibleToClient: e.target.checked }))
                  }
                  className="h-4 w-4 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                />
                <label htmlFor="note-visible-to-client" className="text-sm text-gray-700">
                  Visible to client
                </label>
              </div>
            </div>
            <Button
              onClick={handleAddNote}
              disabled={isSavingNote}
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              {isSavingNote ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Note
                </>
              )}
            </Button>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No notes yet. Add the first note above!
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`rounded-xl border p-4 transition-all ${
                  note.isPinned
                    ? "border-yellow-200 bg-yellow-50 hover:border-yellow-300"
                    : "border-green-100 bg-green-50 hover:border-green-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {note.isPinned && (
                      <div className="mb-2 flex items-center gap-1 text-yellow-600">
                        <Pin className="h-4 w-4" />
                        <span className="text-xs font-semibold">PINNED</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-gray-900">{note.body}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-green-700">
                        {note.noteType || "internal"}
                      </span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
