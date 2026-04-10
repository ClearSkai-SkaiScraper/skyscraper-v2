"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type ClaimLite = {
  id: string;
  claimNumber: string | null;
  insured_name: string | null;
  lossAddress: string | null;
  lossCity: string | null;
  lossState: string | null;
  lossZip: string | null;
  createdAt: string | null;
};

type UseClaimsResult = {
  claims: ClaimLite[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useClaims(): UseClaimsResult {
  const [claims, setClaims] = useState<ClaimLite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try main claims endpoint, fallback to list-lite (better org resolution for trades users)
      let res = await fetch("/api/claims", { cache: "no-store" });

      if (!res.ok) {
        res = await fetch("/api/claims/list-lite", { cache: "no-store" });
      }

      if (!res.ok) {
        const msg = `Claims fetch failed (${res.status})`;
        setClaims([]);
        setError(msg);
        return;
      }

      const data = await res.json();

      // Accept either { claims: [] } or [] formats defensively
      const arr = Array.isArray(data) ? data : Array.isArray(data?.claims) ? data.claims : [];

      setClaims(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arr.map((c: any) => ({
          id: String(c.id),
          claimNumber: c.claimNumber ?? c.claim_number ?? null,
          insured_name: c.insured_name ?? c.insured_name ?? null,
          lossAddress: c.lossAddress ?? c.loss_address ?? null,
          lossCity: c.lossCity ?? c.loss_city ?? null,
          lossState: c.lossState ?? c.loss_state ?? null,
          lossZip: c.lossZip ?? c.loss_zip ?? null,
          createdAt: c.createdAt ?? null,
        }))
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setClaims([]);
      setError(e?.message || "Unknown error fetching claims");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      claims,
      isLoading,
      error,
      refresh,
    }),
    [claims, isLoading, error, refresh]
  );
}
