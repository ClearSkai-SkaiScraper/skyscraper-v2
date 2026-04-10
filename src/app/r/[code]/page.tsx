/**
 * Public Referral Landing Page
 * /r/[code] - Referral link landing
 */

import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're Invited to SkaiScraper™",
  description: "Join SkaiScraper - AI-powered operations hub for trades professionals",
};

export default function ReferralLanding({ params }: { params: { code: string } }) {
  const signupUrl = `/sign-up?ref=${encodeURIComponent(params.code)}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl bg-white p-8 shadow-xl md:p-12">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
            You&apos;re invited to
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SkaiScraper™
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-xl text-slate-600">
            Join the AI-powered inspection and claims processing platform built for roofing
            professionals
          </p>
        </div>

        {/* Benefits */}
        <div className="grid gap-4 py-6 md:grid-cols-2">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">AI-Powered Reports</h3>
              <p className="text-sm text-slate-600">
                Generate professional claims reports in minutes
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
              <svg
                className="h-5 w-5 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Smart Damage Analysis</h3>
              <p className="text-sm text-slate-600">Automated damage detection & documentation</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Streamlined Billing</h3>
              <p className="text-sm text-slate-600">Token-based pricing that scales with you</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100">
              <svg
                className="h-5 w-5 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Team Collaboration</h3>
              <p className="text-sm text-slate-600">Work seamlessly with your crew</p>
            </div>
          </div>
        </div>

        {/* Referral Bonus Notice */}
        <div className="rounded-lg border-l-4 border-blue-600 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
            <div>
              <h4 className="mb-1 font-semibold text-blue-900">Referral Bonus</h4>
              <p className="text-sm text-blue-800">
                When you subscribe to any paid plan, the contractor who invited you earns rewards.
                It&apos;s a win-win! 🎉
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-4">
          <Link
            href={signupUrl}
            className="block w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-center font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
          >
            Create Your Free Account →
          </Link>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href={`/sign-in?ref=${encodeURIComponent(params.code)}`}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Referral Code */}
        <div className="border-t border-slate-200 pt-4 text-center">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Referral code:{" "}
            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-600">
              {params.code}
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
