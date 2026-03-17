"use client";

import { useUser } from "@clerk/nextjs";
import { Brain, CheckSquare, Clock, Loader2, Plus, Target, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  dueDate?: string;
  source: string;
  assigneeRole?: string;
  claimId?: string;
  assignedTo?: {
    id: string;
    name?: string;
    email?: string;
  };
  createdBy?: {
    id: string;
    name?: string;
    email?: string;
  };
}

export default function TasksPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "normal" as Task["priority"],
    dueDate: "",
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch all tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const data = await res.json();
          // Normalize API response (Prisma stores UPPERCASE) to frontend lowercase
          const normalized = (data.tasks || []).map((t: any) => ({
            ...t,
            status: fromApiStatus(t.status || "TODO"),
            priority: fromApiPriority(t.priority || "MEDIUM"),
            dueDate: t.dueAt || t.dueDate,
            assignedTo: t.users || t.assignedTo,
          }));
          setTasks(normalized);
        }
      } catch (error) {
        logger.error("Failed to fetch tasks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Map frontend lowercase status → API uppercase status
  const toApiStatus = (s: string) => s.toUpperCase() as string;
  const fromApiStatus = (s: string) =>
    s.toLowerCase().replace("in_progress", "in_progress") as Task["status"];
  const toApiPriority = (p: string) =>
    ({ low: "LOW", normal: "MEDIUM", high: "HIGH", urgent: "URGENT" })[p] || "MEDIUM";
  const fromApiPriority = (p: string): Task["priority"] =>
    (
      ({ LOW: "low", MEDIUM: "normal", HIGH: "high", URGENT: "urgent" }) as Record<
        string,
        Task["priority"]
      >
    )[p] || "normal";

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: toApiStatus(newStatus),
          completedAt: newStatus === "done" ? new Date().toISOString() : null,
        }),
      });

      if (response.ok) {
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task))
        );
        toast.success("Task updated");
      } else {
        toast.error("Failed to update task");
      }
    } catch (error) {
      logger.error("Update task error:", error);
      toast.error("Failed to update task");
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title.trim(),
          description: newTask.description.trim() || undefined,
          priority: toApiPriority(newTask.priority),
          dueAt: newTask.dueDate || undefined,
          source: "user",
          status: "TODO",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const created = data.task || data;
        const normalizedTask: Task = {
          id: created.id || Date.now().toString(),
          title: created.title || newTask.title.trim(),
          description: created.description || newTask.description.trim(),
          status: fromApiStatus(created.status || "TODO"),
          priority: fromApiPriority(created.priority || "MEDIUM"),
          dueDate: created.dueAt || newTask.dueDate,
          source: "user",
        };
        setTasks((prev) => [normalizedTask, ...prev]);
        setShowCreateDialog(false);
        setNewTask({ title: "", description: "", priority: "normal", dueDate: "" });
        toast.success("Task created successfully");
      } else {
        toast.error("Failed to create task");
      }
    } catch (error) {
      logger.error("Create task error:", error);
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "🔴";
      case "high":
        return "🟠";
      case "normal":
        return "🟡";
      case "low":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterSource !== "all" && task.source !== filterSource) return false;
    return true;
  });

  const tasksByStatus = {
    todo: filteredTasks.filter((t) => t.status === "todo"),
    in_progress: filteredTasks.filter((t) => t.status === "in_progress"),
    done: filteredTasks.filter((t) => t.status === "done"),
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const daysUntilDue = task.dueDate
      ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <Card
        className={`mb-3 cursor-pointer p-4 transition-shadow hover:shadow-md ${
          daysUntilDue !== null && daysUntilDue < 0 ? "border-red-300" : ""
        }`}
      >
        <div className="mb-2 flex items-start justify-between">
          <h4 className="flex-1 text-sm font-medium">{task.title}</h4>
          <span className="ml-2 text-lg">{getPriorityIcon(task.priority)}</span>
        </div>

        {task.description && (
          <p className="mb-3 text-xs text-muted-foreground">{task.description}</p>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {task.priority}
          </Badge>
          {task.source === "skai_ai" && (
            <Badge variant="outline" className="text-xs">
              <Brain className="mr-1 h-3 w-3" />
              SkaiPDF
            </Badge>
          )}
          {task.assigneeRole && (
            <Badge variant="outline" className="text-xs">
              <User className="mr-1 h-3 w-3" />
              {task.assigneeRole.replace("_", " ")}
            </Badge>
          )}
        </div>

        {task.dueDate && (
          <div
            className={`flex items-center gap-1 text-xs ${
              daysUntilDue !== null && daysUntilDue < 0
                ? "font-semibold text-red-600"
                : "text-muted-foreground"
            }`}
          >
            <Clock className="h-3 w-3" />
            {daysUntilDue !== null && daysUntilDue < 0
              ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? "s" : ""}`
              : daysUntilDue === 0
                ? "Due today"
                : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`}
          </div>
        )}

        {task.claimId && (
          <div className="mt-2 border-t pt-2">
            <Link
              href={`/claims/${task.claimId}`}
              className="text-xs text-blue-600 hover:underline"
            >
              View Claim →
            </Link>
          </div>
        )}

        <div className="mt-3">
          <Select
            value={task.status}
            onValueChange={(value: string) => handleStatusChange(task.id, value as any)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
    );
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="jobs"
        title="Tasks"
        subtitle="Manage all tasks across your claims"
        icon={<CheckSquare className="h-6 w-6" />}
      >
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-white/20 hover:bg-white/30"
            size="sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            Create Task
          </Button>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[180px] border-white/30 bg-white/20 text-white">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="skai_ai">SkaiPDF</SelectItem>
              <SelectItem value="user">User Created</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHero>

      {/* Create Task Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="mx-4 w-full max-w-md p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create New Task</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="task-title">Title *</Label>
                <Input
                  id="task-title"
                  placeholder="e.g. Follow up with adjuster"
                  value={newTask.title}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="task-desc">Description</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Optional details..."
                  value={newTask.description}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(v) =>
                      setNewTask((prev) => ({ ...prev, priority: v as Task["priority"] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Low</SelectItem>
                      <SelectItem value="normal">🟡 Normal</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="task-due">Due Date</Label>
                  <Input
                    id="task-due"
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} disabled={creating}>
                  {creating ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-4 w-4" />
                  )}
                  Create Task
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">No Tasks Yet</h3>
          <p className="mb-6 text-muted-foreground">
            Tasks will appear here when you accept SkaiPDF recommendations or create them manually.
          </p>
          <Button asChild>
            <Link href="/claims">View Claims</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* TO DO COLUMN */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-500" />
              <h3 className="font-semibold">To Do</h3>
              <Badge variant="secondary">{tasksByStatus.todo.length}</Badge>
            </div>
            <div>
              {tasksByStatus.todo.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasksByStatus.todo.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  No tasks to do
                </Card>
              )}
            </div>
          </div>

          {/* IN PROGRESS COLUMN */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <h3 className="font-semibold">In Progress</h3>
              <Badge variant="secondary">{tasksByStatus.in_progress.length}</Badge>
            </div>
            <div>
              {tasksByStatus.in_progress.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasksByStatus.in_progress.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  No tasks in progress
                </Card>
              )}
            </div>
          </div>

          {/* DONE COLUMN */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <h3 className="font-semibold">Done</h3>
              <Badge variant="secondary">{tasksByStatus.done.length}</Badge>
            </div>
            <div>
              {tasksByStatus.done.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasksByStatus.done.length === 0 && (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  No completed tasks
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
