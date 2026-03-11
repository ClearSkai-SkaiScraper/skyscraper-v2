"use client";

import { ReactNode } from "react";

import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { useRetryQueue } from "@/hooks/useRetryQueue";

/**
 * Client-side layout wrapper that provides error boundary protection
 * for all authenticated app routes.
 * Also replays any failed API saves from the retry queue on mount.
 */
export function AppLayoutClient({ children }: { children: ReactNode }) {
  // Auto-replay failed saves from previous sessions
  useRetryQueue();

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
