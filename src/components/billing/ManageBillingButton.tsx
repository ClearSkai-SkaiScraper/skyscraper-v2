"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { logger } from "@/lib/logger";

interface ManageBillingButtonProps {
  orgId: string;
  hasSubscription: boolean;
}

export function ManageBillingButton({ orgId, hasSubscription }: ManageBillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    if (!hasSubscription) {
      toast.info("Please subscribe to a plan first to access billing management.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      logger.error("Billing portal error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to open billing portal");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center gap-2 rounded border border-[color:var(--border)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--surface-2)] disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
      Manage Billing
    </button>
  );
}
