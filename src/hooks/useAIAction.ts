/**
 * Universal AI Action Hook
 *
 * Provides a consistent interface for all AI operations with:
 * - Loading states
 * - Error handling
 * - Success feedback
 * - History tracking
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";

export interface UseAIActionOptions {
  endpoint: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export interface AIActionState {
  isLoading: boolean;
  error: Error | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  history: any[];
}

export function useAIAction(options: UseAIActionOptions) {
  const {
    endpoint,
    onSuccess,
    onError,
    successMessage = "AI action completed successfully",
    errorMessage = "AI action failed. Please try again.",
  } = options;

  const [state, setState] = useState<AIActionState>({
    isLoading: false,
    error: null,
    result: null,
    history: [],
  });

  const execute = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (payload: any) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        // Handle non-ok responses gracefully
        if (!response.ok || !data.ok) {
          throw new Error(data.error || data.message || "Request failed");
        }

        setState((prev) => ({
          isLoading: false,
          error: null,
          result: data,
          history: [data, ...prev.history],
        }));

        toast.success(successMessage);
        onSuccess?.(data);

        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
        }));

        toast.error(errorMessage);
        onError?.(err);

        return null;
      }
    },
    [endpoint, onSuccess, onError, successMessage, errorMessage]
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      history: [],
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    clearError,
  };
}

/**
 * Specialized hook for weather reports
 */
export function useWeatherReport() {
  return useAIAction({
    endpoint: "/api/weather/report",
    successMessage: "Weather report generated successfully",
    errorMessage: "Failed to generate weather report",
  });
}

/**
 * Specialized hook for rebuttal generation
 */
export function useRebuttal() {
  return useAIAction({
    endpoint: "/api/ai/rebuttal",
    successMessage: "Rebuttal letter generated successfully",
    errorMessage: "Failed to generate rebuttal letter",
  });
}

/**
 * Specialized hook for damage assessment
 */
export function useDamageBuilder() {
  return useAIAction({
    endpoint: "/api/ai/damage-builder",
    successMessage: "Damage assessment completed",
    errorMessage: "Failed to generate damage assessment",
  });
}

/**
 * Specialized hook for claim summary
 */
export function useClaimSummary() {
  return useAIAction({
    endpoint: "/api/ai/claim-summary",
    successMessage: "Claim summary generated",
    errorMessage: "Failed to generate claim summary",
  });
}

/**
 * Specialized hook for supplement builder
 */
export function useSupplementBuilder() {
  return useAIAction({
    endpoint: "/api/ai/supplement",
    successMessage: "Supplement generated successfully",
    errorMessage: "Failed to generate supplement",
  });
}

/**
 * Specialized hook for AI mockup generation
 */
export function useAIMockup() {
  return useAIAction({
    endpoint: "/api/mockup/generate",
    successMessage: "Mockup generated successfully",
    errorMessage: "Failed to generate mockup",
  });
}
