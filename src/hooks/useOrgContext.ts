"use client";

import { useAuth } from "@clerk/nextjs";
import { logger } from "@/lib/logger";
import { useCallback, useEffect, useState } from "react";

export interface OrgContextData {
  orgId: string;
  orgName: string;
  clerkOrgId: string | null;
  role: string;
  demoMode: boolean;
}

export interface UseOrgContextResult {
  org: OrgContextData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Client-side hook for org context
 *
 * Uses /api/org/active endpoint which handles:
 * - Clerk organizations
 * - Personal orgs via user_organizations table
 * - Auto-repair/bootstrap
 *
 * USAGE:
 * ```tsx
 * const { org, isLoading, error } = useOrgContext();
 *
 * if (isLoading) return <Loading />;
 * if (!org) return <NoOrgUI />;
 *
 * // org.orgId is guaranteed valid here
 * ```
 */
export function useOrgContext(): UseOrgContextResult {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [org, setOrg] = useState<OrgContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    if (!authLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/org/active", {
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      // Handle 401 - not authenticated
      if (res.status === 401) {
        setOrg(null);
        setError(null);
        return;
      }

      // Handle server errors
      if (res.status >= 500) {
        setError(data.error || `Server error (${res.status})`);
        setOrg(null);
        return;
      }

      // Handle response - now uses ok: true/false format
      if (data.ok && data.orgId) {
        setOrg({
          orgId: data.orgId,
          orgName: data.name || data.orgName || "My Organization",
          clerkOrgId: data.clerkOrgId || null,
          role: data.role || "member",
          demoMode: data.demoMode ?? false,
        });
        setError(null);
      } else {
        // ok: false means org not available (but user is authenticated)
        setOrg(null);
        setError(data.error || null);
      }
    } catch (err: any) {
      logger.error("[useOrgContext] Fetch error:", err);
      setError(err.message || "Failed to fetch organization");
      setOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, [authLoaded, isSignedIn]);

  useEffect(() => {
    void fetchOrg();
  }, [fetchOrg]);

  return {
    org,
    isLoading: !authLoaded || isLoading,
    isAuthenticated: isSignedIn ?? false,
    error,
    refetch: fetchOrg,
  };
}
