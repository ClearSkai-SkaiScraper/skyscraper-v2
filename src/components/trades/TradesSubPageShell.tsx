"use client";

import { ArrowLeft, Maximize2, Minimize2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface TradesSubPageShellProps {
  children: React.ReactNode;
  /** Page title shown in the nav bar */
  title: string;
  /** Where the back button goes — defaults to /trades */
  backHref?: string;
  /** Label for the back button — defaults to "Network Hub" */
  backLabel?: string;
  /** Optional right-side actions */
  actions?: React.ReactNode;
}

/**
 * TradesSubPageShell
 *
 * Wraps any trades sub-page (groups, portfolio, orders, vendor-network, etc.)
 * with a consistent top nav bar that includes:
 * - ← Back to Network Hub
 * - Page title
 * - Full-view toggle (expands to cover sidebar + topbar)
 * - Optional action buttons
 */
export function TradesSubPageShell({
  children,
  title,
  backHref = "/trades",
  backLabel = "Network Hub",
  actions,
}: TradesSubPageShellProps) {
  const [isFullView, setIsFullView] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  const content = (
    <>
      {/* ── Sub-page Nav Bar ── */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 px-4">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h1>
            </div>
          </div>

          {/* Right: Actions + Full-View Toggle */}
          <div className="flex items-center gap-2">
            {actions}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullView(!isFullView)}
              className="gap-1.5 text-xs text-slate-500 hover:text-slate-700"
              title={isFullView ? "Exit full view" : "Enter full view"}
            >
              {isFullView ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exit Full View</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Full View</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="flex-1">{children}</div>
    </>
  );

  // Full-view mode: fixed overlay covering the entire viewport
  if (isFullView) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {content}
      </div>
    );
  }

  // Normal mode: render inline (the app shell sidebar/topbar remain visible)
  return <div className="flex flex-col">{content}</div>;
}
