"use client";

/**
 * AIDamageRetryButton — Retry button for failed AI damage analyses
 *
 * Shows a retry button when AI damage detection fails.
 * Includes exponential backoff and max retries.
 */

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface AIDamageRetryButtonProps {
  claimId: string;
  photoId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSuccess?: (result: any) => void;
  className?: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY = 2000; // 2 seconds

export function AIDamageRetryButton({
  claimId,
  photoId,
  onSuccess,
  className,
}: AIDamageRetryButtonProps) {
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleRetry = useCallback(async () => {
    if (retryCount >= MAX_RETRIES) {
      toast.error("Maximum retries reached. Please try again later or contact support.");
      return;
    }

    setLoading(true);
    setLastError(null);

    try {
      // Exponential backoff
      if (retryCount > 0) {
        const delay = BASE_DELAY * Math.pow(2, retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const res = await fetch("/api/ai/damage-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, photoId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }

      const result = await res.json();
      setRetryCount(0);
      toast.success("AI analysis completed!");
      onSuccess?.(result);
    } catch (err) {
      const msg = (err as Error).message;
      setLastError(msg);
      setRetryCount((c) => c + 1);
      toast.error(`AI analysis failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [claimId, photoId, retryCount, onSuccess]);

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        disabled={loading || retryCount >= MAX_RETRIES}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            {retryCount > 0 ? `Retry (${retryCount}/${MAX_RETRIES})` : "Retry AI Analysis"}
          </>
        )}
      </Button>

      {lastError && (
        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          {lastError}
        </p>
      )}

      {retryCount >= MAX_RETRIES && (
        <p className="mt-1 text-xs text-muted-foreground">
          Max retries reached. Try refreshing the page or contact support.
        </p>
      )}
    </div>
  );
}
