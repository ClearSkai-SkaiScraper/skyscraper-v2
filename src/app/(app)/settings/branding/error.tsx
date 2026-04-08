"use client";

import { ErrorCard } from "@/components/ui/error-card";

export default function SettingsBrandingError({
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
      module="Branding Settings"
      fallbackHref="/settings"
      fallbackLabel="Settings"
    />
  );
}
