"use client";

import { GenericErrorBoundary } from "@/components/errors/GenericErrorBoundary";

export default function EmployeesError({
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
      title="Team Error"
      description="We couldn't load your team data. Please try again."
    />
  );
}
