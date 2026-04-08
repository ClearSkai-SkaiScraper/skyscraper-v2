"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function SettingsTeamError({
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
      module="Team Settings"
      fallbackHref="/settings"
      fallbackLabel="Settings"
    />
  );
}
