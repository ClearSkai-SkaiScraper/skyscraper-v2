"use client";

/**
 * 🔐 useAuthWithIdentity Hook
 *
 * Combines Clerk authentication with user identity context.
 * Single source of truth for all auth + identity checks.
 *
 * Usage:
 *   const { user, isSignedIn, isClient, isPro, identity } = useAuthWithIdentity();
 */

import { useAuth, useUser } from "@clerk/nextjs";

import { type UserIdentityClient, type UserType,useUserIdentity } from "./UserIdentityContext";

export interface AuthWithIdentity {
  // Clerk auth state
  user: ReturnType<typeof useUser>["user"];
  isSignedIn: boolean;
  isLoaded: boolean;

  // Identity state
  isClient: boolean;
  isPro: boolean;
  isUnknown: boolean;
  userType: UserType;
  identity: UserIdentityClient | null;
  isIdentityLoading: boolean;

  // Combined loading state
  isReady: boolean; // true when both auth AND identity are loaded

  // Clerk session helpers
  userId: string | null;
  sessionId: string | null;
  getToken: ReturnType<typeof useAuth>["getToken"];
  signOut: ReturnType<typeof useAuth>["signOut"];

  // Actions
  refreshIdentity: () => Promise<void>;
}

export function useAuthWithIdentity(): AuthWithIdentity {
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { userId, sessionId, getToken, signOut } = useAuth();
  const {
    isClient,
    isPro,
    isUnknown,
    userType,
    identity,
    isLoading: identityLoading,
    refresh: refreshIdentity,
  } = useUserIdentity();

  return {
    // Clerk
    user: user ?? null,
    isSignedIn: isSignedIn ?? false,
    isLoaded: clerkLoaded,

    // Identity
    isClient,
    isPro,
    isUnknown,
    userType,
    identity,
    isIdentityLoading: identityLoading,

    // Combined ready state
    isReady: clerkLoaded && !identityLoading,

    // Clerk helpers
    userId: userId ?? null,
    sessionId: sessionId ?? null,
    getToken,
    signOut,

    // Actions
    refreshIdentity,
  };
}

/**
 * Hook that returns true when the auth + identity system is fully ready
 */
export function useAuthReady(): boolean {
  const { isReady } = useAuthWithIdentity();
  return isReady;
}

/**
 * Hook that enforces Pro access - throws error if not a Pro
 */
export function useRequirePro(): AuthWithIdentity {
  const auth = useAuthWithIdentity();

  if (auth.isReady && !auth.isPro) {
    throw new Error("PRO_ACCESS_REQUIRED");
  }

  return auth;
}

/**
 * Hook that enforces Client access - throws error if not a Client
 */
export function useRequireClient(): AuthWithIdentity {
  const auth = useAuthWithIdentity();

  if (auth.isReady && !auth.isClient) {
    throw new Error("CLIENT_ACCESS_REQUIRED");
  }

  return auth;
}
