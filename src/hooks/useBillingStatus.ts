"use client";

import React, { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

export interface BillingStatus {
  plan: string;
  planTier: "solo" | "business" | "enterprise" | "free";
  isLimited: boolean;
  claimsRemaining: number;
  claimsUsed: number;
  claimsLimit: number;
  storageUsed: number;
  storageLimit: number;
}

export function useBillingStatus() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRef = React.useRef<() => Promise<void>>();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/billing/status");
        if (!res.ok) {
          throw new Error("Failed to fetch billing status");
        }
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        logger.error("Billing status error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        // Set default values on error
        setStatus({
          plan: "Free",
          planTier: "free",
          isLimited: true,
          claimsRemaining: 0,
          claimsUsed: 0,
          claimsLimit: 3,
          storageUsed: 0,
          storageLimit: 1024 * 1024 * 100, // 100MB
        });
      } finally {
        setLoading(false);
      }
    }
    loadRef.current = load;
    void load();
  }, []);

  return { status, loading, error, refetch: () => loadRef.current?.() };
}
