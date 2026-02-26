"use client";

import { GenericErrorBoundary } from "@/components/errors/GenericErrorBoundary";

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <GenericErrorBoundary
      error={error}
      reset={reset}
      title="Projects Error"
      description="We couldn't load your projects. Please try again or contact support."
    />
  );
}
