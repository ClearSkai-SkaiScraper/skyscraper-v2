"use client";

import { ChevronRight, Lightbulb, Play, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getHelpForRoute, type HelpContent } from "@/lib/helpContent";
import { cn } from "@/lib/utils";

/**
 * FeatureHelp — contextual help panel that slides open from the right.
 * Triggered via custom event "toggle-feature-help" dispatched from QuickActionsMenu.
 * Shows tips, steps, and best practices for every page in the app.
 */
export function FeatureHelp() {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "/";
  const [isOpen, setIsOpen] = useState(false);
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load dismissed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("skai-help-dismissed");
      if (saved) setDismissed(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // Listen for toggle event from QuickActionsMenu
  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggle-feature-help", handler);
    return () => window.removeEventListener("toggle-feature-help", handler);
  }, []);

  // Update help content when route changes
  useEffect(() => {
    const content = getHelpForRoute(pathname);
    setHelpContent(content);
    setIsOpen(false); // Close when navigating
  }, [pathname]);

  const dismissForRoute = () => {
    const next = new Set(dismissed);
    next.add(pathname);
    setDismissed(next);
    setIsOpen(false);
    try {
      localStorage.setItem("skai-help-dismissed", JSON.stringify([...next]));
    } catch {}
  };

  // Don't render if no help content for this route
  if (!helpContent) return null;

  return (
    <>
      {/* Help Panel — slides in from right */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div
            className={cn(
              "fixed bottom-0 right-0 top-0 z-50 w-full max-w-sm",
              "border-l border-[color:var(--border)] bg-white shadow-2xl dark:bg-slate-900",
              "duration-300 animate-in slide-in-from-right",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 p-2">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[color:var(--text)]">Feature Guide</h3>
                  <p className="text-xs text-slate-500">{pathname}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {/* Title + Description */}
              <div>
                <h2 className="text-xl font-bold text-[color:var(--text)]">{helpContent.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {helpContent.description}
                </p>
              </div>

              {/* Steps */}
              {helpContent.steps && helpContent.steps.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                    <ChevronRight className="h-4 w-4 text-blue-500" />
                    How to Use
                  </h4>
                  <ol className="space-y-2">
                    {helpContent.steps.map((step, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg bg-blue-50/60 p-3 dark:bg-blue-950/20"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tips */}
              {helpContent.tips && helpContent.tips.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[color:var(--text)]">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Pro Tips
                  </h4>
                  <ul className="space-y-2">
                    {helpContent.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-yellow-50/60 p-3 dark:bg-yellow-950/20"
                      >
                        <span className="mt-0.5 text-yellow-500">💡</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Video Link */}
              {helpContent.videoUrl && (
                <a
                  href={helpContent.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 transition-colors hover:bg-purple-100 dark:border-purple-800/40 dark:bg-purple-950/20 dark:hover:bg-purple-950/40"
                >
                  <div className="rounded-lg bg-purple-500 p-2">
                    <Play className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Watch Tutorial
                    </p>
                    <p className="text-xs text-purple-500">Learn this feature in 2 minutes</p>
                  </div>
                </a>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[color:var(--border)] px-5 py-3">
              <button
                onClick={dismissForRoute}
                className="w-full rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Got it — don&apos;t show for this page
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
