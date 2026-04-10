"use client";

import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface BuildInfo {
  git: string | null;
  gitShort: string | null;
  deployment: string | null;
  env: string | null;
  ts: string;
  version: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  counts?: {
    organizations: number;
    claims: number;
    memberships: number;
  };
  tokens?: {
    NEXT_PUBLIC_MAPBOX_TOKEN: boolean;
    MAPBOX_ACCESS_TOKEN: boolean;
  };
  message?: string;
  error?: string;
}

export default function ProofPage() {
  const [build, setBuild] = useState<BuildInfo | null>(null);
  const [db, setDb] = useState<HealthStatus | null>(null);
  const [maps, setMaps] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [buildRes, dbRes, mapsRes] = await Promise.all([
          fetch("/api/_build").then((r) => r.json()),
          fetch("/api/_health/db").then((r) => r.json()),
          fetch("/api/_health/maps").then((r) => r.json()),
        ]);
        setBuild(buildRes);
        setDb(dbRes);
        setMaps(mapsRes);
      } catch (error) {
        logger.error("Failed to load proof data:", error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading proof...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">🔍 Deployment Proof</h1>
          <p className="mt-2 text-slate-400">Verify what&apos;s actually deployed in production</p>
        </div>

        {/* Build Info */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold text-emerald-400">✅ Build Information</h2>
          {build ? (
            <dl className="space-y-2 font-mono text-sm">
              <div className="flex gap-4">
                <dt className="w-32 text-slate-500">Commit:</dt>
                <dd className="text-slate-300">{build.gitShort || "local"}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-slate-500">Full SHA:</dt>
                <dd className="text-slate-300">{build.git || "N/A"}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-slate-500">Version:</dt>
                <dd className="text-slate-300">{build.version}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-slate-500">Environment:</dt>
                <dd className="text-slate-300">{build.env || "unknown"}</dd>
              </div>
              <div className="flex gap-4">
                <dt className="w-32 text-slate-500">Timestamp:</dt>
                <dd className="text-slate-300">{build.ts}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-red-400">Failed to load build info</p>
          )}
        </div>

        {/* Database Health */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2
            className={`mb-4 text-xl font-semibold ${db?.status === "ok" ? "text-emerald-400" : "text-red-400"}`}
          >
            {db?.status === "ok" ? "✅" : "❌"} Database Health
          </h2>
          {db ? (
            db.error ? (
              <p className="text-red-400">{db.error}</p>
            ) : (
              <dl className="space-y-2 font-mono text-sm">
                <div className="flex gap-4">
                  <dt className="w-32 text-slate-500">Organizations:</dt>
                  <dd className="text-slate-300">{db.counts?.organizations || 0}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-32 text-slate-500">Claims:</dt>
                  <dd className="text-slate-300">{db.counts?.claims || 0}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-32 text-slate-500">Memberships:</dt>
                  <dd className="text-slate-300">{db.counts?.memberships || 0}</dd>
                </div>
              </dl>
            )
          ) : (
            <p className="text-red-400">Failed to load database health</p>
          )}
        </div>

        {/* Maps Health */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2
            className={`mb-4 text-xl font-semibold ${maps?.status === "ok" ? "text-emerald-400" : "text-yellow-400"}`}
          >
            {maps?.status === "ok" ? "✅" : "⚠️"} Maps Configuration
          </h2>
          {maps ? (
            <div className="space-y-4">
              <dl className="space-y-2 font-mono text-sm">
                <div className="flex gap-4">
                  <dt className="w-48 text-slate-500">NEXT_PUBLIC_MAPBOX_TOKEN:</dt>
                  <dd
                    className={
                      maps.tokens?.NEXT_PUBLIC_MAPBOX_TOKEN ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {maps.tokens?.NEXT_PUBLIC_MAPBOX_TOKEN ? "✓ Configured" : "✗ Missing"}
                  </dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-48 text-slate-500">MAPBOX_ACCESS_TOKEN:</dt>
                  <dd
                    className={
                      maps.tokens?.MAPBOX_ACCESS_TOKEN ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {maps.tokens?.MAPBOX_ACCESS_TOKEN ? "✓ Configured" : "✗ Missing"}
                  </dd>
                </div>
              </dl>
              <p className="text-sm text-slate-400">{maps.message}</p>
            </div>
          ) : (
            <p className="text-red-400">Failed to load maps health</p>
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
          <h3 className="mb-2 font-semibold text-slate-300">🔗 Direct API Endpoints</h3>
          <ul className="space-y-1 font-mono text-sm text-slate-400">
            <li>
              <a href="/api/_build" className="text-blue-400 hover:underline">
                /api/_build
              </a>{" "}
              - Build stamp
            </li>
            <li>
              <a href="/api/_health/db" className="text-blue-400 hover:underline">
                /api/_health/db
              </a>{" "}
              - Database check
            </li>
            <li>
              <a href="/api/_health/maps" className="text-blue-400 hover:underline">
                /api/_health/maps
              </a>{" "}
              - Maps tokens
            </li>
            <li>
              <a href="/api/_headers" className="text-blue-400 hover:underline">
                /api/_headers
              </a>{" "}
              - Request headers
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
