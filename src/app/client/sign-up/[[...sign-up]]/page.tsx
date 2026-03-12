"use client";

import { SignUp, useClerk } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ClientSignUpForm() {
  const { loaded } = useClerk();
  const [isReady, setIsReady] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loaded) {
      setIsReady(true);
    }
  }, [loaded]);

  // Preserve redirect_url through sign-up flow (e.g. invite tokens)
  const pendingRedirect = searchParams?.get("redirect_url");
  const afterParams = new URLSearchParams();
  afterParams.set("mode", "client");
  if (pendingRedirect) afterParams.set("redirect_url", pendingRedirect);
  const redirectUrl = `/after-sign-in?${afterParams.toString()}`;

  // Propagate redirect_url to sign-in page
  const signInUrl = pendingRedirect
    ? `/client/sign-in?redirect_url=${encodeURIComponent(pendingRedirect)}`
    : "/client/sign-in";

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
          <p className="mt-3 text-sm text-slate-500">Client Portal — Create Your Account</p>
        </div>
        {!isReady ? (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        ) : (
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-white border border-slate-200 shadow-xl w-full",
              },
            }}
            routing="path"
            path="/client/sign-up"
            signInUrl={signInUrl}
            signInForceRedirectUrl={redirectUrl}
            signInFallbackRedirectUrl={redirectUrl}
            forceRedirectUrl={redirectUrl}
            fallbackRedirectUrl={redirectUrl}
          />
        )}

        {/* Link back to sign in */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/client/sign-in" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>

        {/* Pro portal link */}
        <div className="mt-3 text-center">
          <p className="text-xs text-slate-400">
            Are you a contractor?{" "}
            <Link href="/sign-up" className="text-slate-500 underline hover:text-slate-700">
              Pro Sign Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ClientSignUpPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            <p className="text-sm text-slate-500">Loading...</p>
          </div>
        </main>
      }
    >
      <ClientSignUpForm />
    </Suspense>
  );
}
