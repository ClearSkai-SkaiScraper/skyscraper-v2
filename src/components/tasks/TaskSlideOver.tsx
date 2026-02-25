"use client";

import { CalendarDays, CheckCircle2, ListTodo, Loader2, Plus, Send, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { useTaskSlideOver } from "./TaskSlideOverContext";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  avatarUrl: string | null;
}

interface QuickTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo?: { name?: string };
  dueAt?: string;
}

/**
 * TaskSlideOver — global right-side slide-over panel for creating & managing tasks.
 * Opens when any "Task" button is clicked across the app.
 * Mirrors the FeatureHelp slide-over pattern (hand-rolled, fixed position).
 */
export function TaskSlideOver() {
  const { isOpen, options, closeTaskPanel } = useTaskSlideOver();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Team members for assignment dropdown
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Recent tasks for this context
  const [recentTasks, setRecentTasks] = useState<QuickTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Load team members when panel opens (exclude self — "Myself" option covers that)
  useEffect(() => {
    if (!isOpen) return;
    setLoadingMembers(true);
    fetch("/api/team/members")
      .then((r) => r.json())
      .then((data) => {
        const allMembers = data.members || [];
        const currentId = data.currentUserId;
        setMembers(currentId ? allMembers.filter((m: any) => m.id !== currentId) : allMembers);
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [isOpen]);

  // Load recent tasks when panel opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingTasks(true);
    fetch("/api/tasks?limit=5")
      .then((r) => r.json())
      .then((data) => setRecentTasks(data.tasks?.slice(0, 5) || []))
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, [isOpen]);

  // Prefill form from options
  useEffect(() => {
    if (isOpen) {
      setTitle(options.prefillTitle || "");
      setDescription(options.prefillDescription || "");
      setAssigneeId("");
      setPriority("normal");
      setDueDate("");
    }
  }, [isOpen, options]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          priority: priority.toUpperCase(),
          dueAt: dueDate || undefined,
          claimId: options.claimId || undefined,
          projectId: options.projectId || undefined,
          notes: options.context ? `Created from: ${options.context}` : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      const task = await res.json();
      toast.success("Task created successfully");

      // Add to recent list
      setRecentTasks((prev) => [
        { id: task.id, title: task.title, status: task.status, priority: task.priority },
        ...prev.slice(0, 4),
      ]);

      // Reset form
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setPriority("normal");
      setDueDate("");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickStatusChange(taskId: string, newStatus: string) {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          completedAt: newStatus === "done" ? new Date().toISOString() : null,
        }),
      });
      setRecentTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update task");
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={closeTaskPanel}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 w-full max-w-md",
          "border-l border-[color:var(--border)] bg-white shadow-2xl dark:bg-slate-900",
          "duration-300 animate-in slide-in-from-right",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
              <ListTodo className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[color:var(--text)]">Task Manager</h3>
              {options.context && (
                <p className="text-xs capitalize text-slate-500">Context: {options.context}</p>
              )}
            </div>
          </div>
          <button
            onClick={closeTaskPanel}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Create Task Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
              <Plus className="h-4 w-4 text-blue-500" />
              Create Task
            </h4>

            {/* Title */}
            <input
              type="text"
              placeholder="Task title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-slate-700 dark:bg-slate-800"
              autoFocus
            />

            {/* Description */}
            <textarea
              placeholder="Description (optional)…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[color:var(--text)] placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-slate-700 dark:bg-slate-800"
            />

            <div className="grid grid-cols-2 gap-3">
              {/* Assignee */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  <User className="mr-1 inline h-3 w-3" />
                  Assign To
                </label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-[color:var(--text)] focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">Myself</option>
                  {loadingMembers ? (
                    <option disabled>Loading…</option>
                  ) : (
                    members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email} ({m.role})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as typeof priority)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-[color:var(--text)] focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="low">🟢 Low</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                <CalendarDays className="mr-1 inline h-3 w-3" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-[color:var(--text)] focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Creating…" : "Create Task"}
            </button>
          </form>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* Recent Tasks */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
              <ListTodo className="h-4 w-4 text-indigo-500" />
              Recent Tasks
            </h4>
            {loadingTasks ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                No tasks yet. Create your first task above.
              </p>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <button
                      onClick={() =>
                        handleQuickStatusChange(
                          task.id,
                          task.status === "done"
                            ? "todo"
                            : task.status === "in_progress"
                              ? "done"
                              : "in_progress"
                        )
                      }
                      className={cn(
                        "mt-0.5 shrink-0 rounded-full p-0.5 transition-colors",
                        task.status === "done"
                          ? "text-green-500 hover:text-green-700"
                          : task.status === "in_progress"
                            ? "text-blue-500 hover:text-blue-700"
                            : "text-slate-300 hover:text-slate-500"
                      )}
                      title={
                        task.status === "done"
                          ? "Mark as todo"
                          : task.status === "in_progress"
                            ? "Mark as done"
                            : "Start task"
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          task.status === "done"
                            ? "text-slate-400 line-through"
                            : "text-[color:var(--text)]"
                        )}
                      >
                        {task.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            task.status === "done"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : task.status === "in_progress"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                          )}
                        >
                          {task.status === "in_progress"
                            ? "In Progress"
                            : task.status === "done"
                              ? "Done"
                              : "To Do"}
                        </span>
                        {task.assignedTo?.name && (
                          <span className="text-[10px] text-slate-400">
                            → {task.assignedTo.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[color:var(--border)] px-5 py-3">
          <a
            href="/tasks"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <ListTodo className="h-3.5 w-3.5" />
            View All Tasks
          </a>
        </div>
      </div>
    </>
  );
}
