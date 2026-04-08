"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function MeasurementsError({
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
      module="Claims_Measurements"
      fallbackHref="/claims"
      fallbackLabel="Back to Claims"
    />
  );
}
