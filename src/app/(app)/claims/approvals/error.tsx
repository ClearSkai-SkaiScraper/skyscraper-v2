"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function ClaimsApprovalsError({
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
      module="Approvals"
      fallbackHref="/claims"
      fallbackLabel="Claims"
    />
  );
}
