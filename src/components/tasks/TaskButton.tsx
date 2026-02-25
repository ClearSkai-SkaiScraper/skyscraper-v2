"use client";

import { ListTodo } from "lucide-react";

import { cn } from "@/lib/utils";

import { useTaskSlideOver, type TaskPanelOptions } from "./TaskSlideOverContext";

/**
 * TaskButton — reusable button to open the Task Slide-Over panel.
 * Drop this on any page that needs task creation.
 *
 * Variants:
 *  - "floating" — fixed position button (bottom-right, above the help lightbulb)
 *  - "inline"   — standard inline button for toolbars/action bars
 *  - "icon"     — minimal icon-only button for table rows
 */
export function TaskButton({
  variant = "floating",
  label = "New Task",
  options,
  className,
}: {
  variant?: "floating" | "inline" | "icon";
  label?: string;
  options?: TaskPanelOptions;
  className?: string;
}) {
  const { openTaskPanel } = useTaskSlideOver();

  if (variant === "floating") {
    return (
      <button
        onClick={() => openTaskPanel(options)}
        className={cn(
          "group fixed bottom-6 right-20 z-40 flex items-center gap-2",
          "rounded-full bg-gradient-to-br from-blue-500 to-indigo-600",
          "px-4 py-3 text-sm font-semibold text-white",
          "shadow-lg shadow-blue-500/25 transition-all duration-300",
          "hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40",
          "active:scale-95",
          className
        )}
        title="Create a task"
      >
        <ListTodo className="h-5 w-5" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={() => openTaskPanel(options)}
        className={cn(
          "rounded-lg p-1.5 text-slate-400 transition-colors",
          "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400",
          className
        )}
        title="Create task"
      >
        <ListTodo className="h-4 w-4" />
      </button>
    );
  }

  // inline variant
  return (
    <button
      onClick={() => openTaskPanel(options)}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2",
        "text-sm font-medium text-blue-700 transition-colors",
        "hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30",
        className
      )}
    >
      <ListTodo className="h-4 w-4" />
      {label}
    </button>
  );
}
