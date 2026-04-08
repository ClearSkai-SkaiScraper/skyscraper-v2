"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function SupplementError({
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
      module="Claims_Supplement"
      fallbackHref="/claims"
      fallbackLabel="Back to Claims"
    />
  );
}
