"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function SettingsBillingError({
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
      module="Billing Settings"
      fallbackHref="/settings"
      fallbackLabel="Settings"
    />
  );
}
