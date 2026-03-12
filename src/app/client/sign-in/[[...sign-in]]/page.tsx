"use client";

import { SignIn, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ClientSignInForm() {
  const { loaded } = useClerk();
  const [isReady, setIsReady] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loaded) {
      setIsReady(true);
    }
  }, [loaded]);

  // Preserve redirect_url through sign-in flow (e.g. invite tokens)
  const pendingRedirect = searchParams?.get("redirect_url");
  const afterParams = new URLSearchParams();
  afterParams.set("mode", "client");
  if (pendingRedirect) afterParams.set("redirect_url", pendingRedirect);
  const redirectUrl = `/after-sign-in?${afterParams.toString()}`;

  // Propagate redirect_url to sign-up page so token isn't lost if they switch
  const signUpUrl = pendingRedirect
    ? `/client/sign-up?redirect_url=${encodeURIComponent(pendingRedirect)}`
    : "/client/sign-up";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md px-4">
        {/* Logo + Brand */}
        <div className="mb-8 flex flex-col items-center">
          <Link href="/">
            <Image
              src="/brand/sign_in_portals_logo.jpg"
              alt="SkaiScraper"
              width={220}
              height={220}
              className="h-32 w-auto object-contain"
              priority
            />
          </Link>
          <p className="mt-3 text-sm text-slate-500">
            Client Portal — Homeowners &amp; Property Managers
          </p>
        </div>
        {!isReady ? (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            <p className="text-sm text-slate-500">Loading sign in...</p>
          </div>
        ) : (
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-white border border-slate-200 shadow-xl w-full",
              },
            }}
            routing="path"
            path="/client/sign-in"
            signUpUrl={signUpUrl}
            signUpForceRedirectUrl={redirectUrl}
            signUpFallbackRedirectUrl={redirectUrl}
            forceRedirectUrl={redirectUrl}
            fallbackRedirectUrl={redirectUrl}
          />
        )}
      </div>
    </main>
  );
}

export default function ClientSignInPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            <p className="text-sm text-slate-500">Loading sign in...</p>
          </div>
        </main>
      }
    >
      <ClientSignInForm />
    </Suspense>
  );
}
