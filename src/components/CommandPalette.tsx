"use client";

/**
 * CommandPalette (P3 Enhancement)
 *
 * VS Code-style Cmd+K / Ctrl+K command palette.
 * Provides quick navigation and actions throughout the app.
 *
 * Features:
 * - Fuzzy search across all actions
 * - Keyboard navigation (↑↓ to navigate, Enter to select, Esc to close)
 * - Recent actions shown first
 * - Context-aware actions based on current page
 */

import {
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListTodo,
  Plus,
  Search,
  Settings,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
  section: "navigation" | "actions" | "settings";
}

interface CommandPaletteProps {
  className?: string;
}

export function CommandPalette({ className }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Define all available commands
  const commands = useMemo<CommandItem[]>(
    () => [
      // Navigation
      {
        id: "nav-dashboard",
        label: "Go to Dashboard",
        description: "View your dashboard overview",
        icon: <LayoutDashboard className="h-4 w-4" />,
        action: () => router.push("/dashboard"),
        keywords: ["home", "overview", "main"],
        section: "navigation",
      },
      {
        id: "nav-claims",
        label: "Go to Claims",
        description: "View and manage claims",
        icon: <FileText className="h-4 w-4" />,
        action: () => router.push("/claims"),
        keywords: ["jobs", "projects"],
        section: "navigation",
      },
      {
        id: "nav-field",
        label: "Open Field Mode",
        description: "Mobile field inspection tool",
        icon: <Smartphone className="h-4 w-4" />,
        action: () => router.push("/field"),
        keywords: ["inspection", "mobile", "camera", "photos"],
        section: "navigation",
      },
      {
        id: "nav-calendar",
        label: "Go to Calendar",
        description: "View scheduled inspections",
        icon: <Calendar className="h-4 w-4" />,
        action: () => router.push("/calendar"),
        keywords: ["schedule", "appointments"],
        section: "navigation",
      },
      {
        id: "nav-tasks",
        label: "Go to Tasks",
        description: "View your task list",
        icon: <ListTodo className="h-4 w-4" />,
        action: () => router.push("/tasks"),
        keywords: ["todo", "checklist"],
        section: "navigation",
      },
      {
        id: "nav-contacts",
        label: "Go to Contacts",
        description: "View contacts and homeowners",
        icon: <Users className="h-4 w-4" />,
        action: () => router.push("/contacts"),
        keywords: ["homeowners", "customers", "people"],
        section: "navigation",
      },
      {
        id: "nav-documents",
        label: "Go to Documents",
        description: "View all documents",
        icon: <FolderOpen className="h-4 w-4" />,
        action: () => router.push("/documents"),
        keywords: ["files", "pdfs", "reports"],
        section: "navigation",
      },
      {
        id: "nav-reports",
        label: "Go to Reports",
        description: "View analytics and reports",
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => router.push("/reports"),
        keywords: ["analytics", "insights", "stats"],
        section: "navigation",
      },
      // Actions
      {
        id: "action-new-claim",
        label: "Create New Claim",
        description: "Start a new insurance claim",
        icon: <Plus className="h-4 w-4" />,
        action: () => router.push("/claims/new"),
        keywords: ["add", "start", "insurance", "claim"],
        section: "actions",
      },
      {
        id: "action-new-lead",
        label: "Create New Lead",
        description: "Add a new lead from a door knock, referral, or call",
        icon: <Plus className="h-4 w-4" />,
        action: () => router.push("/leads/new"),
        keywords: ["add", "start", "lead", "prospect"],
        section: "actions",
      },
      {
        id: "action-new-job",
        label: "Create New Job",
        description: "Start a new job — choose insurance, OOP, financed, or repair",
        icon: <Plus className="h-4 w-4" />,
        action: () => router.push("/jobs/retail/new"),
        keywords: ["add", "start", "new job", "retail", "repair"],
        section: "actions",
      },
      {
        id: "action-quick-scope",
        label: "Quick AI Scope",
        description: "Generate scope with AI",
        icon: <Zap className="h-4 w-4" />,
        action: () => router.push("/field"),
        keywords: ["ai", "estimate", "automatic"],
        section: "actions",
      },
      // Settings
      {
        id: "settings-account",
        label: "Account Settings",
        description: "Manage your account",
        icon: <Settings className="h-4 w-4" />,
        action: () => router.push("/settings"),
        keywords: ["profile", "preferences", "config"],
        section: "settings",
      },
      {
        id: "settings-billing",
        label: "Billing & Subscription",
        description: "Manage your subscription",
        icon: <CreditCard className="h-4 w-4" />,
        action: () => router.push("/settings/billing"),
        keywords: ["payment", "plan", "upgrade"],
        section: "settings",
      },
      {
        id: "settings-team",
        label: "Team Settings",
        description: "Manage team members",
        icon: <Users className="h-4 w-4" />,
        action: () => router.push("/settings/team"),
        keywords: ["members", "invite", "roles"],
        section: "settings",
      },
    ],
    [router]
  );

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower));
      return labelMatch || descMatch || keywordMatch;
    });
  }, [commands, search]);

  // Group commands by section
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      actions: [],
      settings: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.section].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setSearch("");
        setSelectedIndex(0);
      }

      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle navigation within palette
  const handleKeyNavigation = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = filteredCommands.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
          cmd.action();
          setIsOpen(false);
        }
      }
    },
    [filteredCommands, selectedIndex]
  );

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const executeCommand = useCallback((cmd: CommandItem) => {
    cmd.action();
    setIsOpen(false);
  }, []);

  if (!isOpen) return null;

  // Calculate flat index for keyboard navigation
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div
        className={cn(
          "fixed left-1/2 top-1/4 z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
          className
        )}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyNavigation}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-800">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found for "{search}"
            </div>
          ) : (
            <>
              {/* Navigation */}
              {groupedCommands.navigation.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Navigation
                  </div>
                  {groupedCommands.navigation.map((cmd) => {
                    const isSelected = flatIndex === selectedIndex;
                    const currentIndex = flatIndex;
                    flatIndex++;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            isSelected
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-800/50"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                          )}
                        >
                          {cmd.icon}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground">{cmd.description}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              {groupedCommands.actions.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Actions
                  </div>
                  {groupedCommands.actions.map((cmd) => {
                    const isSelected = flatIndex === selectedIndex;
                    const currentIndex = flatIndex;
                    flatIndex++;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            isSelected
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-800/50"
                              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-800/50"
                          )}
                        >
                          {cmd.icon}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground">{cmd.description}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Settings */}
              {groupedCommands.settings.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">
                    Settings
                  </div>
                  {groupedCommands.settings.map((cmd) => {
                    const isSelected = flatIndex === selectedIndex;
                    const currentIndex = flatIndex;
                    flatIndex++;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "bg-blue-50 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            isSelected
                              ? "bg-blue-100 text-blue-600 dark:bg-blue-800/50"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                          )}
                        >
                          {cmd.icon}
                        </span>
                        <div>
                          <div className="text-sm font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground">{cmd.description}</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-muted-foreground dark:border-slate-700">
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 dark:border-slate-700 dark:bg-slate-800">
              ↑↓
            </kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 dark:border-slate-700 dark:bg-slate-800">
              ↵
            </kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 dark:border-slate-700 dark:bg-slate-800">
              ⌘K
            </kbd>
            <span>Toggle</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default CommandPalette;
