"use client";

import { AlertCircle, CheckCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";

type CheckStatus = "pending" | "pass" | "fail" | "warn";

interface VerificationCheck {
  name: string;
  description: string;
  status: CheckStatus;
  details?: string;
}

export default function ProductionVerificationPage() {
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState({
    vercelEnv: "unknown",
    commitSha: "unknown",
    baseUrl: "unknown",
  });

  useEffect(() => {
    void runVerificationChecks();
  }, []);

  const runVerificationChecks = async () => {
    setLoading(true);

    // Detect environment
    const env = {
      vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
      // eslint-disable-next-line no-restricted-syntax
      commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "local",
      baseUrl: typeof window !== "undefined" ? window.location.origin : "unknown",
    };
    setEnvironment(env);

    const checkResults: VerificationCheck[] = [];

    // Check 1: Build info endpoint
    try {
      const res = await fetch("/api/build-info");
      if (res.ok) {
        const data = await res.json();
        checkResults.push({
          name: "Build Info API",
          description: "Verify build metadata endpoint responds",
          status: "pass",
          details: `Build time: ${data.buildTime || "N/A"}`,
        });
      } else {
        checkResults.push({
          name: "Build Info API",
          description: "Verify build metadata endpoint responds",
          status: "warn",
          details: `Status: ${res.status}`,
        });
      }
    } catch (err) {
      checkResults.push({
        name: "Build Info API",
        description: "Verify build metadata endpoint responds",
        status: "fail",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Check 2: AI Health endpoint
    try {
      const res = await fetch("/api/health/ai");
      if (res.ok) {
        const data = await res.json();
        checkResults.push({
          name: "AI Health",
          description: "Verify AI services are operational",
          status: "pass",
          details: `Status: ${data.status || "OK"}`,
        });
      } else {
        checkResults.push({
          name: "AI Health",
          description: "Verify AI services are operational",
          status: "warn",
          details: `Status: ${res.status}`,
        });
      }
    } catch (err) {
      checkResults.push({
        name: "AI Health",
        description: "Verify AI services are operational",
        status: "fail",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Check 3: Vendors API (auth required)
    try {
      const res = await fetch("/api/vendors");
      if (res.status === 401 || res.ok) {
        // 401 is expected if not authenticated, ok if authenticated
        checkResults.push({
          name: "Vendors API",
          description: "Verify protected endpoints require auth",
          status: "pass",
          details: res.status === 401 ? "Correctly requires auth" : "Authenticated and accessible",
        });
      } else {
        checkResults.push({
          name: "Vendors API",
          description: "Verify protected endpoints require auth",
          status: "warn",
          details: `Unexpected status: ${res.status}`,
        });
      }
    } catch (err) {
      checkResults.push({
        name: "Vendors API",
        description: "Verify protected endpoints require auth",
        status: "fail",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Check 4: Claims API (auth required)
    try {
      const res = await fetch("/api/claims/list-lite");
      if (res.status === 401 || res.ok) {
        checkResults.push({
          name: "Claims API",
          description: "Verify claims endpoints accessible",
          status: "pass",
          details: res.status === 401 ? "Correctly requires auth" : "Authenticated and accessible",
        });
      } else {
        checkResults.push({
          name: "Claims API",
          description: "Verify claims endpoints accessible",
          status: "warn",
          details: `Unexpected status: ${res.status}`,
        });
      }
    } catch (err) {
      checkResults.push({
        name: "Claims API",
        description: "Verify claims endpoints accessible",
        status: "fail",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Check 5: Database connectivity (via health endpoint)
    try {
      const res = await fetch("/api/health/database");
      if (res.ok) {
        const data = await res.json();
        checkResults.push({
          name: "Database Health",
          description: "Verify database connection",
          status: "pass",
          details: `Connection: ${data.connected ? "OK" : "Failed"}`,
        });
      } else {
        checkResults.push({
          name: "Database Health",
          description: "Verify database connection",
          status: "warn",
          details: `Status: ${res.status}`,
        });
      }
    } catch (err) {
      checkResults.push({
        name: "Database Health",
        description: "Verify database connection",
        status: "fail",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }

    setChecks(checkResults);
    setLoading(false);
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "warn":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-gray-400" />;
    }
  };

  const getStatusBadge = (status: CheckStatus) => {
    const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
    switch (status) {
      case "pass":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "fail":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "warn":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;

  return (
    <>
      <PageHero
        section="settings"
        title="Production Verification"
        subtitle="Real-time health checks for production deployment integrity"
        icon={<CheckCircle className="h-6 w-6" />}
      />
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          {/* Environment Info */}
          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Environment</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Environment</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {environment.vercelEnv}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Commit SHA</div>
                <div className="mt-1 font-mono text-sm text-slate-900">
                  {environment.commitSha.slice(0, 8)}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Base URL</div>
                <div className="mt-1 text-sm text-slate-900">{environment.baseUrl}</div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-900">Passed</span>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-green-900">{passCount}</p>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-900">Warnings</span>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-900">{warnCount}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-900">Failed</span>
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-2 text-2xl font-bold text-red-900">{failCount}</p>
            </div>
          </div>

          {/* Checks List */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Verification Checks</h2>
                <button
                  onClick={runVerificationChecks}
                  disabled={loading}
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    "Re-run Checks"
                  )}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {loading && checks.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (
                checks.map((check, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">{check.name}</h3>
                          <span className={getStatusBadge(check.status)}>
                            {check.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{check.description}</p>
                        {check.details && (
                          <p className="mt-1 font-mono text-xs text-slate-500">{check.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Admin Notice */}
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>Admin Only:</strong> This page is restricted to organization administrators.
              Use it to verify production deployment health before and after releases.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
