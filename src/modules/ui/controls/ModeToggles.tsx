"use client";

// ============================================================================
// MODE TOGGLES - Phase 5.1 Polish Pack
// ============================================================================
// Dark mode + field mode toggle buttons
// Hidden in production unless NEXT_PUBLIC_SHOW_SECOND_SCREEN=true

import { Monitor, Moon, Smartphone, Sun } from "lucide-react";

import { useTheme } from "../theme/useTheme";

// eslint-disable-next-line no-restricted-syntax
const SHOW_SECOND_SCREEN = process.env.NEXT_PUBLIC_SHOW_SECOND_SCREEN === "true";

export default function ModeToggles() {
  const { theme, setTheme, fieldMode, setFieldMode } = useTheme();

  // Hide in production unless explicitly enabled
  if (!SHOW_SECOND_SCREEN) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Dark Mode Toggle */}
      <div className="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => setTheme("light")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            theme === "light"
              ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          } `}
          title="Light mode"
        >
          <Sun className="h-4 w-4" />
          <span className="hidden sm:inline">Light</span>
        </button>

        <button
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            theme === "dark"
              ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          } `}
          title="Dark mode"
        >
          <Moon className="h-4 w-4" />
          <span className="hidden sm:inline">Dark</span>
        </button>
      </div>

      {/* Field Mode Toggle */}
      <div className="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
        <button
          onClick={() => setFieldMode(false)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !fieldMode
              ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          } `}
          title="Desktop mode"
        >
          <Monitor className="h-4 w-4" />
          <span className="hidden sm:inline">Desktop</span>
        </button>

        <button
          onClick={() => setFieldMode(true)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            fieldMode
              ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          } `}
          title="Field mode (mobile-optimized)"
        >
          <Smartphone className="h-4 w-4" />
          <span className="hidden sm:inline">Field</span>
        </button>
      </div>
    </div>
  );
}
