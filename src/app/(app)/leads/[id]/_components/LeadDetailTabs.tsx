"use client";

import { Clock, FileText, Loader2, MessageSquare, Paperclip, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "notes", label: "Notes", icon: MessageSquare },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "files", label: "Files", icon: Paperclip },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface TimelineEntry {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NoteEntry {
  id: string;
  content: string;
  createdAt: string;
  author?: string;
}

interface FileEntry {
  id: string;
  name: string;
  url?: string;
  type?: string;
  size?: number;
  createdAt: string;
}

export default function LeadDetailTabs({ leadId }: { leadId: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("notes");
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();

    (async () => {
      try {
        if (activeTab === "notes") {
          const res = await fetch(`/api/leads/${leadId}/notes`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            setNotes(data.notes || data || []);
          }
        } else if (activeTab === "timeline") {
          const res = await fetch(`/api/leads/${leadId}/timeline`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            setTimeline(data.timeline || data.events || data || []);
          }
        } else if (activeTab === "files") {
          const res = await fetch(`/api/leads/${leadId}/files`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            setFiles(data.files || data || []);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.warn(`Failed to load ${activeTab}:`, err);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeTab, leadId]);

  const handleAddNote = async () => {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.note || data, ...prev]);
        setNewNote("");
      }
    } catch {
      console.warn("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      {/* Tab bar */}
      <div className="flex border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <CardContent className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* NOTES TAB */}
            {activeTab === "notes" && (
              <div className="space-y-4">
                {/* Add note form */}
                <div className="space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this lead..."
                    className="min-h-[80px] resize-none"
                  />
                  <Button onClick={handleAddNote} disabled={!newNote.trim() || saving} size="sm">
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add Note
                  </Button>
                </div>

                {notes.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No notes yet. Add the first note above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-800"
                      >
                        <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDate(note.createdAt)}
                          {note.author && ` • ${note.author}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === "timeline" && (
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No timeline events yet.
                  </p>
                ) : (
                  <div className="relative border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                    {timeline.map((entry) => (
                      <div key={entry.id} className="relative mb-4 pb-4">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-teal-500 bg-white dark:bg-slate-900" />
                        <p className="text-sm font-medium">{entry.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FILES TAB */}
            {activeTab === "files" && (
              <div className="space-y-3">
                {files.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No files attached to this lead.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <FileText className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(file.createdAt)}
                            {file.size && ` • ${(file.size / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-teal-600 hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
