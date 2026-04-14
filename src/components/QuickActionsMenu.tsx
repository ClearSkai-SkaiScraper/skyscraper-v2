"use client";

/**
 * QuickActionsMenu (P10 Enhancement)
 *
 * A radial/expandable floating action button that provides quick access to:
 * - New Claim
 * - New Job
 * - Quick Photo Upload (Field Mode)
 * - Search (Cmd+K)
 * - New Task
 *
 * Positioned bottom-right, expands on click to reveal action options.
 * Replaces the single TaskButton FAB with a unified quick actions menu.
 */

import {
  Camera,
  FileText,
  Hammer,
  Lightbulb,
  ListTodo,
  Plus,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

import { useTaskSlideOver } from "./tasks/TaskSlideOverContext";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  color: string;
}

export function QuickActionsMenu({
  onSearch,
  className,
}: {
  onSearch?: () => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { openTaskPanel } = useTaskSlideOver();

  const handleSearch = useCallback(() => {
    setIsOpen(false);
    if (onSearch) {
      onSearch();
    } else {
      // Dispatch keyboard event for cmdk
      const event = new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    }
  }, [onSearch]);

  const handleNewTask = useCallback(() => {
    setIsOpen(false);
    openTaskPanel();
  }, [openTaskPanel]);

  const handlePageHelp = useCallback(() => {
    setIsOpen(false);
    // Dispatch custom event to open FeatureHelp panel
    window.dispatchEvent(new CustomEvent("toggle-feature-help"));
  }, []);

  const actions: QuickAction[] = [
    {
      id: "new-task",
      label: "New Task",
      icon: <ListTodo className="h-4 w-4" />,
      onClick: handleNewTask,
      color: "from-indigo-500 to-purple-600",
    },
    {
      id: "search",
      label: "Search (⌘K)",
      icon: <Search className="h-4 w-4" />,
      onClick: handleSearch,
      color: "from-slate-500 to-slate-600",
    },
    {
      id: "new-claim",
      label: "New Claim",
      icon: <FileText className="h-4 w-4" />,
      href: "/claims/new",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "new-lead",
      label: "New Lead",
      icon: <UserPlus className="h-4 w-4" />,
      href: "/leads/new",
      color: "from-emerald-500 to-green-600",
    },
    {
      id: "new-job",
      label: "New Job",
      icon: <Hammer className="h-4 w-4" />,
      href: "/jobs/new",
      color: "from-amber-500 to-orange-500",
    },
    {
      id: "field-mode",
      label: "Field Mode",
      icon: <Camera className="h-4 w-4" />,
      href: "/field",
      color: "from-emerald-500 to-teal-500",
    },
    {
      id: "page-help",
      label: "Page Help",
      icon: <Lightbulb className="h-4 w-4" />,
      onClick: handlePageHelp,
      color: "from-yellow-400 to-orange-500",
    },
  ];

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action items - positioned above the main button */}
      <div
        className={cn(
          "absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3 transition-all duration-300",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        {actions.map((action, index) => {
          const content = (
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-md dark:bg-slate-800 dark:text-slate-300">
                {action.label}
              </span>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg transition-transform hover:scale-110",
                  action.color
                )}
              >
                {action.icon}
              </div>
            </div>
          );

          // Add staggered animation delay
          const style = {
            transitionDelay: isOpen ? `${index * 50}ms` : "0ms",
          };

          if (action.href) {
            return (
              <Link
                key={action.id}
                href={action.href}
                style={style}
                className={cn(
                  "transition-all duration-200",
                  isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                )}
                onClick={() => setIsOpen(false)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              style={style}
              className={cn(
                "transition-all duration-200",
                isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              )}
              onClick={action.onClick}
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* Main FAB button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300",
          isOpen
            ? "rotate-45 scale-110 bg-slate-600"
            : "bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-105"
        )}
      >
        {isOpen ? <X className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
        {/* Pulse animation when closed */}
        {!isOpen && (
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
        )}
      </button>
    </div>
  );
}
