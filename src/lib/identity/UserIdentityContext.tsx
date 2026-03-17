"use client";

/**
 * 🔐 USER IDENTITY CONTEXT (Client-side)
 *
 * React context for user identity that exposes:
 * - isClient: boolean
 * - isPro: boolean
 * - userType: 'client' | 'pro' | 'unknown'
 * - identity: full UserIdentity object
 *
 * Usage:
 *   const { isClient, isPro, identity } = useUserIdentity();
 */

import { useUser } from "@clerk/nextjs";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export type UserType = "client" | "pro" | "unknown";

export interface UserIdentityClient {
  clerkUserId: string;
  userType: UserType;
  isActive: boolean;
  proProfileId: string | null;
  clientProfileId: string | null;
  orgId: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface UserIdentityContextValue {
  // Quick boolean checks
  isClient: boolean;
  isPro: boolean;
  isUnknown: boolean;
  isLoading: boolean;

  // User type
  userType: UserType;

  // Full identity object
  identity: UserIdentityClient | null;

  // Actions
  refresh: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const UserIdentityContext = createContext<UserIdentityContextValue>({
  isClient: false,
  isPro: false,
  isUnknown: true,
  isLoading: true,
  userType: "unknown",
  identity: null,
  refresh: async () => {},
});

// ============================================================================
// PROVIDER
// ============================================================================

export function UserIdentityProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: clerkLoaded } = useUser();
  const [identity, setIdentity] = useState<UserIdentityClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIdentity = useCallback(async () => {
    if (!user?.id) {
      setIdentity(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/identity");
      if (res.ok) {
        const data = await res.json();
        setIdentity(data.identity || null);
      } else {
        setIdentity(null);
      }
    } catch (error) {
      logger.error("[UserIdentityProvider] Error fetching identity:", error);
      setIdentity(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (clerkLoaded) {
      fetchIdentity();
    }
  }, [clerkLoaded, fetchIdentity]);

  const userType: UserType = identity?.userType || "unknown";

  const value: UserIdentityContextValue = {
    isClient: userType === "client",
    isPro: userType === "pro",
    isUnknown: userType === "unknown",
    isLoading: !clerkLoaded || isLoading,
    userType,
    identity,
    refresh: fetchIdentity,
  };

  return <UserIdentityContext.Provider value={value}>{children}</UserIdentityContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useUserIdentity(): UserIdentityContextValue {
  const context = useContext(UserIdentityContext);
  if (!context) {
    throw new Error("useUserIdentity must be used within a UserIdentityProvider");
  }
  return context;
}

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Returns true if the current user is a PRO (contractor)
 */
export function useIsPro(): boolean {
  const { isPro } = useUserIdentity();
  return isPro;
}

/**
 * Returns true if the current user is a CLIENT (homeowner)
 */
export function useIsClient(): boolean {
  const { isClient } = useUserIdentity();
  return isClient;
}

/**
 * Returns the user type string
 */
export function useUserType(): UserType {
  const { userType } = useUserIdentity();
  return userType;
}
