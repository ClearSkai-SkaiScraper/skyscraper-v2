"use client";

import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

export interface ClaimContext {
  id: string;
  address?: string;
  client?: {
    clientEmail?: string;
    clientName?: string;
  };
  insurance?: {
    carrier?: string;
    policyNumber?: string;
  };
  photosCount: number;
  documentsCount: number;
  timeline?: Array<{
    id: string;
    event: string;
    timestamp: Date;
  }>;
}

export function useClaimContext(claimId: string | undefined) {
  const [context, setContext] = useState<ClaimContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    fetch(`/api/claims/${claimId}/context`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (mounted) {
          setContext(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          logger.error("Failed to load claim context:", err);
          setError(err.message || "Failed to load claim context");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [claimId]);

  return { context, loading, error };
}
