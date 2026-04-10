import { logger } from "@/lib/logger";

"use client";

// Legacy Skai Assistant deprecated. Provide no-op compatibility exports only.
// This keeps existing imports (openSkaiAssistant, SKaiAssistant) from crashing build.

export function openSkaiAssistant(seedPrompt?: string) {
  if (typeof document !== "undefined") {
    const btn = document.querySelector('[data-testid="ask-dominus-toggle"]');
    if (btn instanceof HTMLButtonElement) {
      btn.click();
    }
    if (seedPrompt) {
      // Fire a custom event so Ask Dominus widget can optionally pick up a seed prompt.
      window.dispatchEvent(
        new CustomEvent("ask-dominus-seed", { detail: { prompt: seedPrompt } })
      );
    }
  }
  // Warn in console for any lingering calls.
  // eslint-disable-next-line no-restricted-syntax
  if (process.env.NODE_ENV === "development") {
    logger.warn("openSkaiAssistant() called. Skai Assistant is deprecated; redirected to Ask Dominus widget.");
  }
}

export function SKaiAssistant() {
  return null; // Render nothing; legacy component retired.
}

export default SKaiAssistant;
