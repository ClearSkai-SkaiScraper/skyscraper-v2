import { logger } from "@/lib/logger";

/**
 * Form Instrumentation Utility
 *
 * Lightweight tracking for form submissions to prevent silent failures.
 * Use in all onboarding-like flows.
 *
 * @example
 * const tracker = createFormTracker("trades-onboarding");
 * tracker.stepAdvance(1, 2);
 * tracker.submitClick();
 * tracker.submitStarted({ firstName: "John" });
 * tracker.submitSuccess({ profileId: "123" });
 * // or
 * tracker.submitFailure(new Error("API failed"));
 */

export interface FormEvent {
  form: string;
  event: string;
  step?: number;
  data?: Record<string, unknown>;
  error?: string;
  timestamp: string;
}

// In-memory buffer for debugging (last 50 events)
const eventBuffer: FormEvent[] = [];
const MAX_BUFFER_SIZE = 50;

function logEvent(event: FormEvent) {
  // Always log to console for debugging
  logger.debug(`[FormTracker:${event.form}] ${event.event}`, event.data || "");

  // Buffer for debugging
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift();
  }

  // Optional: Send to analytics/Sentry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window !== "undefined" && (window as any).Sentry) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Sentry.addBreadcrumb({
      category: "form",
      message: `${event.form}: ${event.event}`,
      data: event.data,
      level: event.error ? "error" : "info",
    });
  }
}

export function createFormTracker(formName: string) {
  let currentStep = 1;

  return {
    /**
     * Track step navigation
     */
    stepAdvance(fromStep: number, toStep: number) {
      currentStep = toStep;
      logEvent({
        form: formName,
        event: "step_advance",
        step: toStep,
        data: { from: fromStep, to: toStep },
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Track step validation failure
     */
    stepBlocked(step: number, reason: string) {
      logEvent({
        form: formName,
        event: "step_blocked",
        step,
        data: { reason },
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Track submit button click (before validation)
     */
    submitClick() {
      logEvent({
        form: formName,
        event: "submit_click",
        step: currentStep,
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Track submit started (after validation, API call begins)
     */
    submitStarted(data?: Record<string, unknown>) {
      logEvent({
        form: formName,
        event: "submit_started",
        step: currentStep,
        data,
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Track successful submit
     */
    submitSuccess(data?: Record<string, unknown>) {
      logEvent({
        form: formName,
        event: "submit_success",
        step: currentStep,
        data,
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Track failed submit
     */
    submitFailure(error: Error | string) {
      const errorMessage = error instanceof Error ? error.message : error;
      logEvent({
        form: formName,
        event: "submit_failure",
        step: currentStep,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Track form abandoned (navigated away without completing)
     */
    abandoned(lastStep: number) {
      logEvent({
        form: formName,
        event: "abandoned",
        step: lastStep,
        timestamp: new Date().toISOString(),
      });
    },

    /**
     * Track skip action
     */
    skipped(step: number) {
      logEvent({
        form: formName,
        event: "skipped",
        step,
        timestamp: new Date().toISOString(),
      });
    },
  };
}

/**
 * Get buffered events for debugging
 */
export function getFormEventBuffer(): FormEvent[] {
  return [...eventBuffer];
}

/**
 * Clear event buffer
 */
export function clearFormEventBuffer() {
  eventBuffer.length = 0;
}

/**
 * Higher-order wrapper for form submission with guaranteed feedback
 *
 * @example
 * const result = await withFormFeedback(
 *   () => fetch("/api/submit", { method: "POST", body: JSON.stringify(data) }),
 *   {
 *     onSuccess: () => router.push("/success"),
 *     successMessage: "Profile created!",
 *     errorMessage: "Failed to create profile",
 *   }
 * );
 */
export async function withFormFeedback<T>(
  submitFn: () => Promise<T>,
  options: {
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    errorMessage?: string;
    loadingSetter?: (loading: boolean) => void;
    toast: {
      success: (msg: string) => void;
      error: (msg: string) => void;
    };
  }
): Promise<{ success: boolean; result?: T; error?: Error }> {
  const { onSuccess, onError, successMessage, errorMessage, loadingSetter, toast } = options;

  try {
    loadingSetter?.(true);
    const result = await submitFn();

    // ALWAYS show feedback
    if (successMessage) {
      toast.success(successMessage);
    }

    onSuccess?.(result);
    return { success: true, result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    // ALWAYS show feedback
    toast.error(errorMessage || error.message || "Something went wrong");

    onError?.(error);
    return { success: false, error };
  } finally {
    loadingSetter?.(false);
  }
}
