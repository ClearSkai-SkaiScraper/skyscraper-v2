// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import React, { Suspense } from "react";

import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { PostHogPageview } from "@/lib/analytics.tsx";

export const dynamic = "force-dynamic";

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  );
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let isSignedIn = false;
  try {
    const user = await currentUser();
    isSignedIn = !!user;
  } catch {
    /* not signed in */
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Minimal Public Header ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-white"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">SkaiScraper</span>
          </Link>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/trades"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Join Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <Suspense fallback={<FullscreenLoader />}>
        <PostHogPageview />
        <ErrorBoundary>{children}</ErrorBoundary>
      </Suspense>

      {/* ── Minimal Public Footer ── */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-500">© 2026 SkaiScraper. All rights reserved.</p>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/legal/privacy" className="hover:text-slate-700">
                Privacy
              </Link>
              <Link href="/legal/terms" className="hover:text-slate-700">
                Terms
              </Link>
              <Link href="/find" className="hover:text-slate-700">
                Find a Contractor
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
