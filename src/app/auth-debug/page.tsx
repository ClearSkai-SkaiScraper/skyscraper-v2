// =====================================================
// /auth-debug - Client-Side Authentication Debug Page
// =====================================================
// Helps diagnose authentication issues in the browser
// Shows sign-in state and provides diagnostic info
// =====================================================

"use client";

import { SignedIn, SignedOut, useAuth,useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function AuthDebugPage() {
  const { user, isLoaded: userLoaded } = useUser();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, sessionId, orgId, isLoaded: authLoaded } = useAuth();
  const [serverAuthData, setServerAuthData] = useState<any>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch server-side auth state
    fetch("/api/auth/health")
      .then((res) => res.json())
      .then((data) => setServerAuthData(data))
      .catch((err) => setServerError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <h1 className="mb-2 text-3xl font-bold">🔍 Authentication Debug</h1>
          <p className="text-gray-600">Diagnostic page to verify Clerk authentication status</p>
          <div className="mt-4 text-sm text-gray-500">
            <strong>Current Host:</strong>{" "}
            {typeof window !== "undefined" ? window.location.host : "SSR"}
          </div>
        </div>

        {/* Client-Side State */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Client-Side State</h2>

          <SignedIn>
            <div className="rounded border border-green-200 bg-green-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="font-semibold text-green-800">Signed In (Client)</span>
              </div>

              {userLoaded && user ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>User ID:</strong>{" "}
                    <code className="rounded bg-white px-2 py-1">{userId}</code>
                  </div>
                  <div>
                    <strong>Email:</strong>{" "}
                    <code className="rounded bg-white px-2 py-1">
                      {user.primaryEmailAddress?.emailAddress || "N/A"}
                    </code>
                  </div>
                  <div>
                    <strong>Session ID:</strong>{" "}
                    <code className="rounded bg-white px-2 py-1">{sessionId || "N/A"}</code>
                  </div>
                  <div>
                    <strong>Org ID:</strong>{" "}
                    <code className="rounded bg-white px-2 py-1">{orgId || "None"}</code>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Loading user data...</p>
              )}
            </div>
          </SignedIn>

          <SignedOut>
            <div className="rounded border border-red-200 bg-red-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <span className="font-semibold text-red-800">Signed Out (Client)</span>
              </div>
              <p className="mb-4 text-sm text-gray-700">
                No active session detected in the browser.
              </p>
              <a
                href="/sign-in"
                className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Go to Sign In
              </a>
            </div>
          </SignedOut>
        </div>

        {/* Server-Side State */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Server-Side State</h2>

          {serverError ? (
            <div className="rounded border border-red-200 bg-red-50 p-4">
              <strong className="text-red-800">Error:</strong> {serverError}
            </div>
          ) : serverAuthData ? (
            <div className="space-y-4">
              {serverAuthData.authenticated ? (
                <div className="rounded border border-green-200 bg-green-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <span className="font-semibold text-green-800">Authenticated (Server)</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>User ID:</strong>{" "}
                      <code className="rounded bg-white px-2 py-1">{serverAuthData.userId}</code>
                    </div>
                    <div>
                      <strong>Session ID:</strong>{" "}
                      <code className="rounded bg-white px-2 py-1">{serverAuthData.sessionId}</code>
                    </div>
                    {serverAuthData.orgId && (
                      <div>
                        <strong>Org ID:</strong>{" "}
                        <code className="rounded bg-white px-2 py-1">{serverAuthData.orgId}</code>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded border border-red-200 bg-red-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-2xl">❌</span>
                    <span className="font-semibold text-red-800">Not Authenticated (Server)</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Server does not see a valid Clerk session. This usually means:
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                    <li>You are not signed in</li>
                    <li>Session cookies are not being sent/received</li>
                    <li>Domain/CORS configuration issue</li>
                    <li>Clerk keys mismatch between domains</li>
                  </ul>
                </div>
              )}

              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                  View Request Details
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
                  {JSON.stringify(serverAuthData, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p className="text-gray-600">Loading server state...</p>
          )}
        </div>

        {/* Diagnostic Links */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/sign-in"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign In
            </a>
            <a
              href="/dashboard"
              className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Dashboard
            </a>
            <a
              href="/api/auth/health"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Raw API Response
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
