/**
 * OfflineBanner — Shows "You're offline" indicator (Sprint 8.4)
 *
 * Renders a warning banner when the user loses internet connectivity.
 * Automatically hides when the connection is restored.
 */

"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Check initial state
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
      <WifiOff className="h-4 w-4" />
      You&apos;re offline — some features may not be available
      <button
        onClick={() => window.location.reload()}
        className="ml-3 rounded-md bg-white/20 px-2 py-0.5 text-xs font-semibold transition hover:bg-white/30"
      >
        Retry
      </button>
    </div>
  );
}
