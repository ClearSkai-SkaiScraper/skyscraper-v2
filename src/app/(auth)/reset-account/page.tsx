/**
 * /reset-account - Direct account reset page
 *
 * This page allows users to completely reset their org state
 * when they're stuck in error loops.
 */

"use client";

import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export default function ResetAccountPage() {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState<"idle" | "checking" | "resetting" | "success" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Check current state on load
    void checkStatus();
  }, []);

  async function checkStatus() {
    setStatus("checking");
    try {
      const res = await fetch("/api/org/nuclear-reset");
      const data = await res.json();
      setDebugInfo(data);
      setStatus("idle");
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  async function handleReset() {
    setIsResetting(true);
    setStatus("resetting");
    setError(null);

    try {
      const response = await fetch("/api/org/nuclear-reset", { method: "POST" });
      const data = await response.json();

      if (data.ok) {
        setStatus("success");
        // Wait a moment then redirect
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || "Reset failed");
        setStatus("error");
      }
    } catch (err) {
      setError(err.message || "Network error");
      setStatus("error");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 shadow-xl dark:border-amber-900 dark:bg-slate-900">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            {status === "success" ? (
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            )}
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-slate-900 dark:text-white">
          {status === "success" ? "Account Reset Complete!" : "Reset Your Account"}
        </h1>

        {status === "success" ? (
          <p className="mb-6 text-center text-green-600 dark:text-green-400">
            Your account has been reset successfully. Redirecting to dashboard...
          </p>
        ) : (
          <p className="mb-6 text-center text-slate-600 dark:text-slate-400">
            This will completely reset your organization data and create a fresh workspace with demo
            data. Use this if you&apos;re experiencing persistent errors.
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {debugInfo && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-1 font-bold">Current State:</div>
            <div>User: {debugInfo.userId || "Not authenticated"}</div>
            <div>Total Memberships: {debugInfo.totalMemberships ?? "?"}</div>
            <div>Valid: {debugInfo.validMemberships ?? "?"}</div>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <div className="text-red-600">Orphaned: {debugInfo.orphanedMemberships ?? "?"}</div>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {debugInfo.memberships?.map((m: any, i: number) => (
              <div key={i} className={m.orgExists ? "text-green-600" : "text-red-600"}>
                • {m.orgName} ({m.orgExists ? "OK" : "DELETED"})
              </div>
            ))}
          </div>
        )}

        {status !== "success" && (
          <div className="space-y-3">
            <Button
              onClick={handleReset}
              disabled={isResetting || status === "checking"}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset My Account
                </>
              )}
            </Button>

            <Button variant="outline" onClick={() => router.push("/sign-out")} className="w-full">
              Sign Out Instead
            </Button>

            <Button
              variant="ghost"
              onClick={checkStatus}
              className="w-full text-xs"
              disabled={status === "checking"}
            >
              {status === "checking" ? "Checking..." : "Refresh Status"}
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          If this doesn&apos;t work, contact{" "}
          <a href="mailto:support@skaiscrape.com" className="text-blue-600 hover:underline">
            support@skaiscrape.com
          </a>
        </p>
      </div>
    </div>
  );
}
