"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function ClaimsReportsError({
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
      module="Claim Reports"
      fallbackHref="/claims"
      fallbackLabel="Claims"
    />
  );
}
