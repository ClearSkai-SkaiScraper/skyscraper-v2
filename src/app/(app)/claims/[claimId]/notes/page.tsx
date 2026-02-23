// src/app/(app)/claims/[claimId]/notes/page.tsx
"use client";

import { Loader2, StickyNote, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { logger } from "@/lib/logger";
import { textareaBase } from "@/lib/ui/inputStyles";

import SectionCard from "../_components/SectionCard";

interface Note {
  id: string;
  content: string;
  isClientVisible: boolean;
  createdAt: string;
  authorName: string;
}

export default function NotesPage() {
  const params = useParams();
  const claimIdParam = params?.claimId;
  const claimId = Array.isArray(claimIdParam) ? claimIdParam[0] : claimIdParam;
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label?: string } | null>(null);

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  if (!claimId) return null;

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/notes`);
      const data = await res.json();
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (error) {
      logger.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newNote.trim() || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNote,
          isClientVisible,
        }),
      });

      if (res.ok) {
        setNewNote("");
        setIsClientVisible(false);
        await fetchNotes();
      }
    } catch (error) {
      logger.error("Save error:", error);
      alert("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (noteId: string) => {
    setDeleteTarget({ id: noteId });
  };

  const confirmDeleteNote = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/claims/${claimId}/notes/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      }
    } catch (error) {
      logger.error("Delete error:", error);
    }
  };

  return (
    <SectionCard
      title="Notes"
      action={
        <button
          onClick={handleSave}
          disabled={saving || !newNote.trim()}
          className="rounded-lg border border-blue-500/30 bg-blue-500/20 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500/30 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Note"}
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Note Input */}
          <div className="space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className={textareaBase + " px-3 py-2 text-sm"}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isClientVisible}
                onChange={(e) => setIsClientVisible(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Visible to client
            </label>
          </div>

          {/* Notes List */}
          {notes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                <StickyNote className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="mb-2 text-slate-700 dark:text-slate-300">No notes yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add team-only or client-visible notes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {note.authorName}
                        </span>
                        {note.isClientVisible && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Client Visible
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Delete note"
                      title="Delete note"
                    >
                      <Trash2 className="h-4 w-4 text-red-400 hover:text-red-300" />
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Note"
        description="This note will be permanently removed."
        showArchive={false}
        onConfirmDelete={confirmDeleteNote}
      />
    </SectionCard>
  );
}
