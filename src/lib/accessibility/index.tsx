"use client";

import { useCallback,useEffect, useRef } from "react";

/**
 * Accessibility Utilities
 *
 * Production-grade accessibility helpers for WCAG 2.1 AA compliance.
 */

// ─── Skip to Content ────────────────────────────────────────────────────────

/**
 * Skip-to-content link component.
 * Renders a visually-hidden link that becomes visible on focus.
 * Must be the first focusable element in the DOM.
 *
 * Usage: <SkipToContent targetId="main-content" />
 */
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}

// ─── Live Announcer ─────────────────────────────────────────────────────────

let announcer: HTMLDivElement | null = null;

function getAnnouncer(): HTMLDivElement {
  if (announcer) return announcer;

  if (typeof document === "undefined") {
    return null as unknown as HTMLDivElement;
  }

  announcer = document.createElement("div");
  announcer.setAttribute("aria-live", "polite");
  announcer.setAttribute("aria-atomic", "true");
  announcer.setAttribute("role", "status");
  announcer.className = "sr-only"; // Tailwind screen-reader only
  announcer.id = "skai-live-announcer";
  document.body.appendChild(announcer);

  return announcer;
}

/**
 * Announce a message to screen readers via aria-live region.
 *
 * Usage: announce("Claim saved successfully");
 */
export function announce(message: string, priority: "polite" | "assertive" = "polite") {
  const el = getAnnouncer();
  if (!el) return;

  el.setAttribute("aria-live", priority);
  // Clear then set — ensures re-announcement of same message
  el.textContent = "";
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

// ─── Focus Trap ─────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(", ");

/**
 * Hook to trap focus within a container element.
 * Essential for modals, dialogs, and drawers.
 *
 * Usage:
 *   const trapRef = useFocusTrap(isOpen);
 *   return <div ref={trapRef}>...</div>;
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store previously focused element
    previousFocus.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstFocusable.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Shift+Tab: wrap to last element
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: wrap to first element
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      // Restore focus when trap is deactivated
      previousFocus.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

// ─── Reduced Motion ─────────────────────────────────────────────────────────

/**
 * Hook to detect user's reduced motion preference.
 *
 * Usage:
 *   const prefersReducedMotion = useReducedMotion();
 *   const transition = prefersReducedMotion ? "none" : "all 0.3s ease";
 */
export function useReducedMotion(): boolean {
  if (typeof window === "undefined") return false;

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  return mediaQuery.matches;
}

// ─── Keyboard Navigation ────────────────────────────────────────────────────

/**
 * Hook for keyboard navigation within a list (arrow keys, home, end).
 * Works with role="listbox", role="menu", etc.
 *
 * Usage:
 *   const { onKeyDown, activeIndex } = useKeyboardNavigation({
 *     itemCount: items.length,
 *     onSelect: (index) => selectItem(items[index]),
 *   });
 */
export function useKeyboardNavigation({
  itemCount,
  onSelect,
  orientation = "vertical",
}: {
  itemCount: number;
  onSelect?: (index: number) => void;
  orientation?: "vertical" | "horizontal";
}) {
  const activeIndex = useRef(0);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
      const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          activeIndex.current = Math.max(0, activeIndex.current - 1);
          break;
        case nextKey:
          e.preventDefault();
          activeIndex.current = Math.min(itemCount - 1, activeIndex.current + 1);
          break;
        case "Home":
          e.preventDefault();
          activeIndex.current = 0;
          break;
        case "End":
          e.preventDefault();
          activeIndex.current = itemCount - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onSelect?.(activeIndex.current);
          break;
      }
    },
    [itemCount, onSelect, orientation]
  );

  return { onKeyDown, activeIndex: activeIndex.current };
}

// ─── ARIA Helpers ───────────────────────────────────────────────────────────

/**
 * Generate unique IDs for ARIA labeling.
 */
let idCounter = 0;
export function generateAriaId(prefix = "skai"): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Get ARIA description for loading states.
 */
export function getLoadingAriaProps(isLoading: boolean) {
  return {
    "aria-busy": isLoading,
    "aria-live": "polite" as const,
  };
}
