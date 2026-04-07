"use client";

import { useEffect, useState } from "react";

import {
  checkEndpoints,
  type EndpointStatus,
  getStatusColor,
  getStatusEmoji,
} from "@/lib/deploy/endpointCheck";
import { logger } from "@/lib/logger";

const CRITICAL_ENDPOINTS = [
  "/api/ai/health",
  "/api/health",
  "/api/reports/context",
  "/api/templates/add-to-company",
  "/api/supplements/generate",
  "/api/mockup/generate",
];

const OPTIONAL_ENDPOINTS = ["/api/__truth", "/api/_build", "/api/build-info"];

export function EndpointHealthCheck() {
  const [checking, setChecking] = useState(false);
  const [criticalResults, setCriticalResults] = useState<EndpointStatus[]>([]);
  const [optionalResults, setOptionalResults] = useState<EndpointStatus[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const runCheck = async () => {
    setChecking(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      const [critical, optional] = await Promise.all([
        checkEndpoints(baseUrl, CRITICAL_ENDPOINTS),
        checkEndpoints(baseUrl, OPTIONAL_ENDPOINTS),
      ]);

      setCriticalResults(critical);
      setOptionalResults(optional);
      setLastCheck(new Date());
    } catch (error) {
      logger.error("Health check failed:", error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    void runCheck();
  }, []);

  const renderEndpointRow = (result: EndpointStatus) => {
    const color = getStatusColor(result.status);
    const emoji = getStatusEmoji(result.status);

    return (
      <tr key={result.endpoint} className="border-b border-slate-700">
        <td className="px-4 py-2 font-mono text-sm text-slate-300">{result.endpoint}</td>
        <td className="px-4 py-2">
          <span
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
              color === "green"
                ? "bg-green-500/10 text-green-400"
                : color === "yellow"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-red-500/10 text-red-400"
            }`}
          >
            {emoji} {result.message}
          </span>
        </td>
        <td className="px-4 py-2 text-sm text-slate-400">{result.statusCode ?? "N/A"}</td>
      </tr>
    );
  };

  const criticalFailures = criticalResults.filter(
    (r) => r.status === "not-found" || r.status === "error"
  );
  const hasFailures = criticalFailures.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Endpoint Health</h2>
          {lastCheck && (
            <p className="text-sm text-slate-400">Last checked: {lastCheck.toLocaleTimeString()}</p>
          )}
        </div>
        <button
          onClick={runCheck}
          disabled={checking}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {checking ? "Checking..." : "Refresh"}
        </button>
      </div>

      {/* Status Summary */}
      {hasFailures && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-400">
            ⚠️ {criticalFailures.length} critical endpoint
            {criticalFailures.length !== 1 ? "s" : ""} failing
          </p>
          <p className="mt-1 text-xs text-red-300">
            This may indicate a deployment issue or that new routes are not yet live.
          </p>
        </div>
      )}

      {/* Critical Endpoints */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Critical Endpoints</h3>
        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Code
                </th>
              </tr>
            </thead>
            <tbody>
              {criticalResults.length > 0 ? (
                criticalResults.map(renderEndpointRow)
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    {checking ? "Running checks..." : "No results yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optional Endpoints */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Optional Diagnostics</h3>
        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Code
                </th>
              </tr>
            </thead>
            <tbody>
              {optionalResults.length > 0 ? (
                optionalResults.map(renderEndpointRow)
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    {checking ? "Running checks..." : "No results yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        <h3 className="mb-2 text-sm font-medium text-slate-300">Status Legend</h3>
        <div className="space-y-1 text-xs text-slate-400">
          <p>✅ OK / Auth Required = Endpoint is deployed and working</p>
          <p>❌ Not Found = Endpoint missing (not deployed)</p>
          <p>❌ Server Error = Endpoint exists but failing</p>
          <p>⚠️ Unreachable = Network timeout or connection issue</p>
        </div>
      </div>
    </div>
  );
}
