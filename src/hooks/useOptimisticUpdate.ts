"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface OptimisticOptions<T> {
  /** The async API call to perform */
  action: () => Promise<T>;
  /** Optimistic value to show immediately */
  optimisticValue: T;
  /** Value to revert to on failure */
  rollbackValue: T;
  /** Success message for toast */
  successMessage?: string;
  /** Error message for toast */
  errorMessage?: string;
  /** Callback on success */
  onSuccess?: (data: T) => void;
  /** Callback on failure */
  onError?: (error: Error) => void;
}

/**
 * Hook for optimistic updates with automatic rollback on failure.
 *
 * Usage:
 *   const { execute, value, isPending } = useOptimistic({
 *     initialValue: claim.status,
 *   });
 *
 *   const handleStatusChange = (newStatus: string) => {
 *     execute({
 *       action: () => api.patch(`/api/claims/${id}`, { body: { status: newStatus } }),
 *       optimisticValue: newStatus,
 *       rollbackValue: claim.status,
 *       successMessage: "Status updated",
 *       errorMessage: "Failed to update status. Reverting...",
 *     });
 *   };
 */
export function useOptimisticUpdate<T>(opts: { initialValue: T }) {
  const [value, setValue] = useState<T>(opts.initialValue);
  const [isPending, setIsPending] = useState(false);
  const rollbackRef = useRef<T>(opts.initialValue);

  const execute = useCallback(async (options: OptimisticOptions<T>) => {
    const {
      action,
      optimisticValue,
      rollbackValue,
      successMessage,
      errorMessage = "Something went wrong. Changes reverted.",
      onSuccess,
      onError,
    } = options;

    // Store rollback value
    rollbackRef.current = rollbackValue;

    // Apply optimistic update immediately
    setValue(optimisticValue);
    setIsPending(true);

    try {
      const result = await action();

      if (successMessage) {
        toast.success(successMessage);
      }

      onSuccess?.(result);
      return result;
    } catch (error) {
      // ROLLBACK: Revert to previous value
      setValue(rollbackRef.current);

      const err = error instanceof Error ? error : new Error(String(error));

      toast.error(errorMessage, {
        action: {
          label: "Retry",
          onClick: () => execute(options),
        },
      });

      onError?.(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { value, setValue, isPending, execute };
}

/**
 * Hook for mutation with automatic retry toast.
 *
 * Simpler than useOptimistic — just wraps an API call with loading state
 * and error handling with retry action in the toast.
 */
interface MutationOptions<TInput, TResult> {
  mutationFn: (input: TInput) => Promise<TResult>;
  onSuccess?: (data: TResult) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useMutation<TInput = void, TResult = unknown>({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage = "Something went wrong",
}: MutationOptions<TInput, TResult>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastInput = useRef<TInput | null>(null);

  const mutate = useCallback(
    async (input: TInput) => {
      lastInput.current = input;
      setIsPending(true);
      setError(null);

      try {
        const result = await mutationFn(input);

        if (successMessage) {
          toast.success(successMessage);
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        toast.error(errorMessage, {
          action:
            lastInput.current !== null
              ? {
                  label: "Retry",
                  onClick: () => {
                    if (lastInput.current !== null) {
                      void mutate(lastInput.current);
                    }
                  },
                }
              : undefined,
        });

        onError?.(error);
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn, onSuccess, onError, successMessage, errorMessage]
  );

  return { mutate, isPending, error };
}
