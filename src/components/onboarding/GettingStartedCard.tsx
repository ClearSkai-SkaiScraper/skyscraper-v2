"use client";

import { CheckCircle2, Circle, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}

const ONBOARDING_TASKS: Omit<OnboardingTask, "completed">[] = [
  {
    id: "create_client",
    title: "Create your first client",
    description: "Add a homeowner or property owner to your network",
    href: "/contacts",
  },
  {
    id: "create_claim",
    title: "Create your first claim",
    description: "Start a new insurance claim for a client",
    href: "/claims/new",
  },
  {
    id: "upload_photos",
    title: "Upload 3 photos",
    description: "Add damage photos to your claim for documentation",
    href: "/claims",
  },
  {
    id: "run_ai_estimate",
    title: "Run AI Estimate",
    description: "Generate an AI-powered scope of work and estimate",
    href: "/claims",
  },
  {
    id: "export_pdf",
    title: "Export your first branded PDF",
    description: "Download a professional report with your branding",
    href: "/reports",
  },
];

const STORAGE_KEY = "skaiscraper_onboarding_tasks";

export default function GettingStartedCard() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadTasksFromStorage();
  }, []);

  const loadTasksFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const dismissedFlag = localStorage.getItem(`${STORAGE_KEY}_dismissed`);

      if (dismissedFlag === "true") {
        setDismissed(true);
        return;
      }

      if (stored) {
        const completedIds = JSON.parse(stored) as string[];
        const loadedTasks = ONBOARDING_TASKS.map((task) => ({
          ...task,
          completed: completedIds.includes(task.id),
        }));
        setTasks(loadedTasks);
      } else {
        const initialTasks = ONBOARDING_TASKS.map((task) => ({
          ...task,
          completed: false,
        }));
        setTasks(initialTasks);
      }
    } catch (error) {
      logger.error("Failed to load onboarding tasks:", error);
      const initialTasks = ONBOARDING_TASKS.map((task) => ({
        ...task,
        completed: false,
      }));
      setTasks(initialTasks);
    }
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    // Save to localStorage
    const completedIds = updatedTasks.filter((t) => t.completed).map((t) => t.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedIds));
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(`${STORAGE_KEY}_dismissed`, "true");
  };

  const resetOnboarding = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}_dismissed`);
    setDismissed(false);
    loadTasksFromStorage();
  };

  // Don't render until mounted (avoid hydration mismatch)
  if (!mounted) {
    return null;
  }

  if (dismissed) {
    return null;
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const allCompleted = completedCount === totalCount;

  return (
    <div className="relative rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-blue-200 hover:text-slate-600"
        aria-label="Dismiss getting started card"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">🚀 Getting Started</h2>
        <p className="mt-1 text-sm text-slate-600">
          Complete these steps to unlock the full power of SkaiScraper
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {completedCount} of {totalCount} completed
          </span>
          <span className="font-bold text-blue-600">{progress}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Getting started progress"
          {...{ "aria-valuenow": progress, "aria-valuemin": 0, "aria-valuemax": 100 }}
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            {...{ style: { width: `${progress}%` } }}
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={task.id}
            className={`group relative flex items-start gap-3 rounded-md p-3 transition-all ${
              task.completed ? "bg-green-50 hover:bg-green-100" : "bg-white hover:bg-slate-50"
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleTask(task.id)}
              className="mt-0.5 flex-shrink-0"
              aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {task.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-slate-400 group-hover:text-slate-600" />
              )}
            </button>

            {/* Task Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className={`font-medium ${
                    task.completed ? "text-green-900 line-through" : "text-slate-900"
                  }`}
                >
                  {task.title}
                </h3>
                {!task.completed && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    Step {index + 1}
                  </span>
                )}
              </div>
              <p className={`mt-1 text-sm ${task.completed ? "text-green-700" : "text-slate-600"}`}>
                {task.description}
              </p>
            </div>

            {/* Action Link */}
            {!task.completed && (
              <Link
                href={task.href}
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-blue-300 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Go
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Completion Message */}
      {allCompleted && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-4">
          <p className="text-center text-sm font-medium text-green-900">
            🎉 Congratulations! You&apos;ve completed all onboarding steps.
          </p>
          <p className="mt-1 text-center text-xs text-green-700">
            You&apos;re ready to manage claims like a pro!
          </p>
        </div>
      )}

      // eslint-disable-next-line react/jsx-no-comment-textnodes
      {/* Reset Link (hidden, for testing) */}
      // eslint-disable-next-line no-restricted-syntax
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={resetOnboarding}
          className="mt-3 text-xs text-slate-500 underline hover:text-slate-700"
        >
          Reset onboarding
        </button>
      )}
    </div>
  );
}
