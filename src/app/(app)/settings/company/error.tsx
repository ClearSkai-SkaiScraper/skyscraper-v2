"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function SettingsCompanyError({
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
      module="Company Settings"
      fallbackHref="/settings"
      fallbackLabel="Settings"
    />
  );
}
