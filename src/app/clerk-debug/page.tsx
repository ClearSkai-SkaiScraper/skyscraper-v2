"use client";

// Diagnostic page to check Clerk configuration
// Access at: /clerk-debug

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ClerkDebugPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    // eslint-disable-next-line no-restricted-syntax
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
    setConfig({
      publishableKey,
      isProduction: publishableKey.startsWith("pk_live_"),
      // eslint-disable-next-line no-restricted-syntax
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in",
      // eslint-disable-next-line no-restricted-syntax
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up",
      // eslint-disable-next-line no-restricted-syntax
      afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/dashboard",
      // eslint-disable-next-line no-restricted-syntax
      afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/dashboard",
      currentDomain: typeof window !== "undefined" ? window.location.origin : "Unknown",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
    });
  }, []);

  const getKeyStatus = () => {
    if (!config.publishableKey) return { icon: "❌", color: "text-red-400", label: "MISSING" };
    if (config.isProduction) return { icon: "✅", color: "text-green-400", label: "PRODUCTION" };
    return { icon: "⚠️", color: "text-yellow-400", label: "DEV KEY" };
  };

  const keyStatus = getKeyStatus();

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h1 className="mb-4 text-3xl font-bold text-white">🔍 Clerk Configuration Debug</h1>
          <p className="text-slate-400">
            Use this page to verify Clerk environment variables are correctly set.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Environment Variables</h2>
          <div className="space-y-3 font-mono text-sm">
            <div className="flex items-center justify-between rounded bg-slate-800 p-3">
              <span className="text-slate-400">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</span>
              <span className={`flex items-center gap-2 ${keyStatus.color}`}>
                {keyStatus.icon} {keyStatus.label}
                {config.publishableKey && (
                  <span className="ml-2">{config.publishableKey.substring(0, 20)}...</span>
                )}
              </span>
            </div>
            <div className="flex justify-between rounded bg-slate-800 p-3">
              <span className="text-slate-400">NEXT_PUBLIC_CLERK_SIGN_IN_URL:</span>
              <span className="text-blue-400">{config.signInUrl}</span>
            </div>
            <div className="flex justify-between rounded bg-slate-800 p-3">
              <span className="text-slate-400">NEXT_PUBLIC_CLERK_SIGN_UP_URL:</span>
              <span className="text-blue-400">{config.signUpUrl}</span>
            </div>
            <div className="flex justify-between rounded bg-slate-800 p-3">
              <span className="text-slate-400">NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:</span>
              <span className="text-blue-400">{config.afterSignInUrl}</span>
            </div>
            <div className="flex justify-between rounded bg-slate-800 p-3">
              <span className="text-slate-400">NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:</span>
              <span className="text-blue-400">{config.afterSignUpUrl}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Current Environment</h2>
          <div className="space-y-3 font-mono text-sm">
            <div className="flex justify-between rounded bg-slate-800 p-3">
              <span className="text-slate-400">Current Domain:</span>
              <span className="text-green-400">{config.currentDomain}</span>
            </div>
            <div className="flex justify-between rounded bg-slate-800 p-3">
              <span className="text-slate-400">User Agent:</span>
              <span className="text-slate-300">{config.userAgent?.substring(0, 50)}...</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-[#117CFF]/30 bg-[#117CFF]/10 p-6">
          <h2 className="mb-4 text-xl font-semibold text-[#117CFF]">🔗 Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg bg-[#117CFF] px-4 py-2 font-bold text-white transition-all hover:bg-[#0D63CC]"
            >
              Test Sign In →
            </Link>
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-bold text-white transition-all hover:border-slate-500 hover:bg-slate-700"
            >
              Clerk Dashboard ↗
            </a>
            <a
              href="https://clerk.com/docs/quickstarts/nextjs"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 font-bold text-white transition-all hover:border-slate-500 hover:bg-slate-700"
            >
              Clerk Docs ↗
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-6">
          <h2 className="mb-4 text-xl font-semibold text-yellow-400">⚠️ Required Configuration</h2>
          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <h3 className="mb-2 font-bold text-yellow-300">1. Clerk Dashboard Setup</h3>
              <p className="mb-2">
                Go to{" "}
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#117CFF] underline"
                >
                  dashboard.clerk.com
                </a>{" "}
                → Your Production Instance
              </p>
            </div>

            <div>
              <h3 className="mb-2 font-bold text-yellow-300">2. Add Allowed Origins</h3>
              <p className="mb-2">Configure → Paths → Allowed Origins:</p>
              <div className="rounded bg-slate-800/50 p-3 font-mono text-xs">
                <div>https://skaiscrape.com</div>
                <div>https://www.skaiscrape.com</div>
                <div>http://localhost:3000</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-bold text-yellow-300">3. Set Redirect URLs</h3>
              <p className="mb-2">Configure → Paths → Authorized Redirect URLs:</p>
              <div className="rounded bg-slate-800/50 p-3 font-mono text-xs">
                <div>https://skaiscrape.com/*</div>
                <div>https://www.skaiscrape.com/*</div>
                <div>http://localhost:3000/*</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-bold text-yellow-300">4. Environment Variables</h3>
              <p className="mb-2">Verify in Vercel or .env.local:</p>
              <div className="rounded bg-slate-800/50 p-3 font-mono text-xs">
                <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...</div>
                <div>CLERK_SECRET_KEY=sk_live_...</div>
                <div>NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in</div>
                <div>NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up</div>
              </div>
            </div>

            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <h3 className="mb-2 font-bold text-red-300">
                🚨 If Sign-In Shows Blank/White Screen:
              </h3>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Open DevTools (F12) → Console tab</li>
                <li>Look for errors like &quot;Origin not allowed&quot; or &quot;Failed to load ClerkJS&quot;</li>
                <li>
                  Current origin:{" "}
                  <span className="font-mono text-green-400">{config.currentDomain}</span>
                </li>
                <li>Ensure this exact URL is in Clerk&apos;s Allowed Origins list</li>
                <li>After updating Clerk, wait 1-2 minutes for DNS propagation</li>
                <li>Clear browser cache and try incognito window</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="mb-4 text-xl font-semibold text-white">Quick Links</h2>
          <div className="space-y-2">
            <a
              href="/sign-in"
              className="block rounded bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
            >
              Test Sign-In Page →
            </a>
            <a
              href="/sign-up"
              className="block rounded bg-green-600 px-4 py-2 text-center font-semibold text-white hover:bg-green-700"
            >
              Test Sign-Up Page →
            </a>
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded bg-purple-600 px-4 py-2 text-center font-semibold text-white hover:bg-purple-700"
            >
              Open Clerk Dashboard ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
