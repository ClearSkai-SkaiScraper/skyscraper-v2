"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import { startStormIntake } from "@/lib/storm-intake/api";

/**
 * Public storm intake start page.
 * GET /storm-intake/new
 * Automatically creates a new intake session and redirects to it.
 */
export default function NewStormIntakePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createIntake = async () => {
      try {
        const intake = await startStormIntake({
          source: "PUBLIC",
        });
        router.push(`/storm-intake/${intake.id}`);
      } catch (err) {
        logger.error("Failed to create intake:", err);
        setError("Failed to start intake. Please try again.");
      }
    };

    createIntake();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-500 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">Starting your assessment...</p>
      </div>
    </div>
  );
}
