"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function IntelError({
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
      module="Claims_Intel"
      fallbackHref="/claims"
      fallbackLabel="Back to Claims"
    />
  );
}
