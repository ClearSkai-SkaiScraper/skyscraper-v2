/**
 * Sprint 27 — Remote View Banner
 *
 * Persistent top banner when viewing as another team member.
 * Shows who is being viewed + an "Exit Remote View" button.
 * Also applies a read-only overlay to the entire workspace.
 */

"use client";

import { Eye, LogOut, Shield } from "lucide-react";

import { useRemoteView } from "./RemoteViewContext";

export function RemoteViewBanner() {
  const { active, target, stopRemoteView, loading } = useRemoteView();

  if (!active || !target) return null;

  return (
    <>
      {/* ─── Banner ─────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-between gap-4 border-b border-amber-500/40 bg-amber-950/95 px-4 py-2 text-amber-100 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
            <Eye className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-400">
              Remote View — Read Only
            </span>
            <span className="text-sm font-semibold">
              Viewing as <span className="text-amber-300">{target.name || target.email}</span>
              <span className="ml-2 text-xs text-amber-500">({target.role})</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-md bg-amber-900/50 px-2.5 py-1 text-xs text-amber-400">
            <Shield className="h-3 w-3" />
            All mutations disabled
          </div>
          <button
            onClick={stopRemoteView}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {loading ? "Exiting…" : "Exit Remote View"}
          </button>
        </div>
      </div>

      {/* ─── Read-Only Overlay ──────────────────────────────────── */}
      {/* This intercepts all clicks on forms/buttons within the main content */}
      <RemoteViewReadOnlyOverlay />
    </>
  );
}

/**
 * Transparent overlay that intercepts pointer events on interactive elements.
 * Uses CSS to disable forms, buttons, inputs, selects, textareas while
 * keeping navigation (links) clickable.
 */
function RemoteViewReadOnlyOverlay() {
  return (
    <style jsx global>{`
      /* Sprint 27: Remote View read-only mode */
      body[data-remote-view="true"] button:not([data-remote-view-allow]),
      body[data-remote-view="true"] input:not([data-remote-view-allow]),
      body[data-remote-view="true"] textarea:not([data-remote-view-allow]),
      body[data-remote-view="true"] select:not([data-remote-view-allow]),
      body[data-remote-view="true"] [role="button"]:not([data-remote-view-allow]),
      body[data-remote-view="true"] [contenteditable]:not([data-remote-view-allow]) {
        pointer-events: none !important;
        opacity: 0.6 !important;
        cursor: not-allowed !important;
      }

      /* Keep nav links and the exit button interactive */
      body[data-remote-view="true"] a,
      body[data-remote-view="true"] [data-remote-view-allow] {
        pointer-events: auto !important;
        opacity: 1 !important;
        cursor: pointer !important;
      }

      /* Push content down when banner is visible */
      body[data-remote-view="true"] {
        padding-top: 52px !important;
      }
    `}</style>
  );
}

/**
 * Hook to set data-remote-view attribute on body.
 * Call this in a layout or provider.
 */
export function RemoteViewBodyAttribute() {
  const { active } = useRemoteView();

  if (typeof document !== "undefined") {
    if (active) {
      document.body.setAttribute("data-remote-view", "true");
    } else {
      document.body.removeAttribute("data-remote-view");
    }
  }

  return null;
}
