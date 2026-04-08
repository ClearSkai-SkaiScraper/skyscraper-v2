"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function OverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorCard
      error={error}
      reset={reset}
      module="Claims_Overview"
      fallbackHref="/claims"
      fallbackLabel="Back to Claims"
    />
  );
}
