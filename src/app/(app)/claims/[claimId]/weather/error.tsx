"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function WeatherError({
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
      module="Claims_Weather"
      fallbackHref="/claims"
      fallbackLabel="Back to Claims"
    />
  );
}
