"use client";

/**
 * 🛡️ ROUTE GUARD COMPONENTS
 *
 * Client-side route guards for identity-based access control.
 * Use these to wrap page content that requires specific user types.
 *
 * Usage:
 *   <ProOnlyGuard fallback={<RedirectingMessage />}>
 *     <ProDashboardContent />
 *   </ProOnlyGuard>
 */

import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

import { logger } from "@/lib/logger";

import { useUserIdentity } from "./UserIdentityContext";

interface GuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Loading state shown while identity is being determined
 */
function LoadingGuard() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        <p className="text-sm text-slate-500">Verifying access...</p>
      </div>
    </div>
  );
}

/**
 * Default access denied message
 */
function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
        <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">Access Denied</h2>
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      </div>
    </div>
  );
}

/**
 * 🏗️ PRO ONLY GUARD
 *
 * Only renders children if user is a Pro (contractor).
 * Redirects clients to /portal.
 */
export function ProOnlyGuard({ children, fallback, redirectTo = "/portal" }: GuardProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isPro, isClient, isLoading, isUnknown } = useUserIdentity();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isClient) {
      logger.debug("[ProOnlyGuard] Client detected, redirecting to:", redirectTo);
      router.replace(redirectTo);
    }
  }, [isLoading, isClient, redirectTo, router]);

  if (isLoading) {
    return fallback || <LoadingGuard />;
  }

  if (isClient) {
    return fallback || <AccessDenied message="This area is for contractors only." />;
  }

  if (isUnknown) {
    // Allow unknown users to see pro content (legacy behavior)
    // They can complete onboarding if needed
    return <>{children}</>;
  }

  return <>{children}</>;
}

/**
 * 🏠 CLIENT ONLY GUARD
 *
 * Only renders children if user is a Client (homeowner).
 * Redirects pros to /dashboard.
 */
export function ClientOnlyGuard({ children, fallback, redirectTo = "/dashboard" }: GuardProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isPro, isClient, isLoading, isUnknown } = useUserIdentity();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isPro) {
      logger.debug("[ClientOnlyGuard] Pro detected, redirecting to:", redirectTo);
      router.replace(redirectTo);
    }
  }, [isLoading, isPro, redirectTo, router]);

  if (isLoading) {
    return fallback || <LoadingGuard />;
  }

  if (isPro) {
    return fallback || <AccessDenied message="This area is for homeowners only." />;
  }

  if (isUnknown) {
    // Unknown users trying to access client portal should go to onboarding
    router.replace("/onboarding/select-type");
    return fallback || <LoadingGuard />;
  }

  return <>{children}</>;
}

/**
 * 🔓 AUTHENTICATED GUARD
 *
 * Renders children only if user is authenticated (any type).
 */
export function AuthenticatedGuard({ children, fallback, redirectTo = "/sign-in" }: GuardProps) {
  const { identity, isLoading } = useUserIdentity();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !identity) {
      logger.debug("[AuthenticatedGuard] No identity, redirecting to:", redirectTo);
      router.replace(redirectTo);
    }
  }, [isLoading, identity, redirectTo, router]);

  if (isLoading) {
    return fallback || <LoadingGuard />;
  }

  if (!identity) {
    return fallback || <LoadingGuard />;
  }

  return <>{children}</>;
}

/**
 * 🎭 IDENTITY SWITCH
 *
 * Renders different content based on user type.
 * Useful for shared pages that show different UIs.
 */
export function IdentitySwitch({
  proContent,
  clientContent,
  unknownContent,
  loadingContent,
}: {
  proContent: React.ReactNode;
  clientContent: React.ReactNode;
  unknownContent?: React.ReactNode;
  loadingContent?: React.ReactNode;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isPro, isClient, isLoading, isUnknown } = useUserIdentity();

  if (isLoading) {
    return <>{loadingContent || <LoadingGuard />}</>;
  }

  if (isPro) {
    return <>{proContent}</>;
  }

  if (isClient) {
    return <>{clientContent}</>;
  }

  return <>{unknownContent || proContent}</>;
}
