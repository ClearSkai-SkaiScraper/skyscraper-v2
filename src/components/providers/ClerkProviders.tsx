"use client";

import { ClerkProvider } from "@clerk/nextjs";
import * as React from "react";

import { logger } from "@/lib/logger";

export default function Providers({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line no-restricted-syntax
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  // ALWAYS redirect to /after-sign-in which:
  // 1. Reads user type from database
  // 2. Sets the x-user-type cookie for middleware routing
  // 3. Redirects to /dashboard (pro) or /portal (client)
  // CRITICAL: Include mode=pro so new users signing in/up via the default
  // (non-client) flow are registered as "pro", not "client".
  const afterSignInUrl = "/after-sign-in?mode=pro";
  const afterSignUpUrl = "/after-sign-in?mode=pro";

  if (!publishableKey) {
    logger.warn("⚠️ Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY at runtime.");
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl={afterSignInUrl}
      afterSignUpUrl={afterSignUpUrl}
      signInForceRedirectUrl={afterSignInUrl}
      signUpForceRedirectUrl={afterSignUpUrl}
    >
      {children}
    </ClerkProvider>
  );
}
