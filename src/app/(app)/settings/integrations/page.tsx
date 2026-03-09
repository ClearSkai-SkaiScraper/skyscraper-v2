"use client";

/**
 * Integration Status Dashboard
 *
 * Enterprise credibility surface: QuickBooks, Migrations, System Health
 */

import { AlertTriangle, CheckCircle2, Link2, Loader2, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type HealthStatus = "healthy" | "warning" | "error";

type IntegrationStatusResponse = {
  ok: boolean;
  quickbooks: {
    connected: boolean;
    companyName: string | null;
    lastSync: string | null;
    expiresAt: string | null;
    health: HealthStatus;
  };
  migrations: {
    acculynx: { status: string; count: number; lastRun: string | null };
    jobnimbus: { status: string; count: number; lastRun: string | null };
  };
  system: {
    api: "operational";
    storage: "connected" | "not_configured";
    webhooks: "active" | "inactive";
  };
  updatedAt: string;
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function formatTimestamp(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

function formatDate(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString();
}

function statusBadge(status: HealthStatus) {
  switch (status) {
    case "healthy":
      return <Badge className="bg-green-100 text-green-700">Healthy</Badge>;
    case "warning":
      return <Badge className="bg-amber-100 text-amber-700">Warning</Badge>;
    case "error":
      return <Badge className="bg-red-100 text-red-700">Error</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-700">Unknown</Badge>;
  }
}

function systemBadge(value: "connected" | "not_configured" | "active" | "inactive") {
  if (value === "connected" || value === "active") {
    return <Badge className="bg-green-100 text-green-700">Active</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-700">Attention</Badge>;
}

function migrationBadge(status: string) {
  if (status === "completed") {
    return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
  }
  if (status === "running") {
    return <Badge className="bg-blue-100 text-blue-700">Running</Badge>;
  }
  if (status === "failed") {
    return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
  }
  if (status === "not_started") {
    return <Badge className="bg-gray-100 text-gray-600">Not Started</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-600">Unknown</Badge>;
}

function SkeletonCard() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/status");
      const data = (await res.json()) as IntegrationStatusResponse;
      if (!res.ok || !data.ok) {
        throw new Error("Failed to load integration status");
      }
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/connect", { method: "POST" });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      logger.error("[INTEGRATIONS] connect error:", err);
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/quickbooks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true }),
      });
      const data = await res.json();
      if (data.ok && data.summary) {
        const { synced, skipped, errors } = data.summary;
        setSyncResult(`Synced: ${synced}, Skipped: ${skipped}, Errors: ${errors}`);
      } else {
        setSyncResult(data.error || "Sync failed");
      }
      // Refresh status
      fetchStatus();
    } catch (err) {
      setSyncResult("Sync request failed");
      logger.error("[INTEGRATIONS] sync error:", err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect QuickBooks? This will stop all syncing.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/quickbooks/status", { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        fetchStatus();
      }
    } catch (err) {
      logger.error("[INTEGRATIONS] disconnect error:", err);
    } finally {
      setDisconnecting(false);
    }
  }

  const quickbooks = status?.quickbooks;
  const migrations = status?.migrations;
  const system = status?.system;

  const allMigrationsEmpty = useMemo(() => {
    if (!migrations) return true;
    return (
      migrations.acculynx.status === "not_started" && migrations.jobnimbus.status === "not_started"
    );
  }, [migrations]);

  return (
    <PageContainer>
      <PageHero
        section="settings"
        title="Integrations"
        subtitle="Enterprise integration status and system health"
        icon={<Link2 className="h-6 w-6" />}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          Last updated: {status?.updatedAt ? formatTimestamp(status.updatedAt) : "—"}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="hidden sm:inline-flex"
          >
            Export Screenshot
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* QuickBooks */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">QuickBooks Online</CardTitle>
                      <CardDescription className="text-xs">
                        Invoices, payments, and customer sync
                      </CardDescription>
                    </div>
                  </div>
                  {quickbooks ? statusBadge(quickbooks.health) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickbooks?.connected ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">Company</p>
                        <p className="font-medium">
                          {quickbooks.companyName || "QuickBooks Company"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Last Sync</p>
                        <p className="font-medium">{formatTimestamp(quickbooks.lastSync)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Token Expires</p>
                        <p className="font-medium">{formatDate(quickbooks.expiresAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Health</p>
                        <p className="font-medium capitalize">{quickbooks.health}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <XCircle className="h-4 w-4 text-slate-400" />
                      QuickBooks is not connected.
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Connect to unlock automatic invoice and payment sync.
                    </p>
                  </div>
                )}

                {!quickbooks?.connected && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleConnect}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Connect QuickBooks
                  </Button>
                )}

                {quickbooks?.connected && (
                  <div className="space-y-2">
                    <Button size="sm" className="w-full" onClick={handleSync} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {syncing ? "Syncing…" : "Sync All Jobs to QuickBooks"}
                    </Button>

                    {syncResult && (
                      <p className="text-center text-xs text-slate-500">{syncResult}</p>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Disconnect QuickBooks
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Migrations */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Migration Status</CardTitle>
                    <CardDescription className="text-xs">
                      AccuLynx and JobNimbus import health
                    </CardDescription>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700">Migrations</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {migrations && (
                  <>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                      <div>
                        <p className="font-medium">AccuLynx</p>
                        <p className="text-xs text-slate-500">
                          Last run: {formatTimestamp(migrations.acculynx.lastRun)}
                        </p>
                      </div>
                      <div className="text-right">
                        {migrationBadge(migrations.acculynx.status)}
                        <p className="mt-1 text-xs text-slate-500">
                          {migrations.acculynx.count} imported
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                      <div>
                        <p className="font-medium">JobNimbus</p>
                        <p className="text-xs text-slate-500">
                          Last run: {formatTimestamp(migrations.jobnimbus.lastRun)}
                        </p>
                      </div>
                      <div className="text-right">
                        {migrationBadge(migrations.jobnimbus.status)}
                        <p className="mt-1 text-xs text-slate-500">
                          {migrations.jobnimbus.count} imported
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {allMigrationsEmpty && (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      No migrations have been run yet.
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Start a migration when you’re ready to import CRM data.
                    </p>
                  </div>
                )}

                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/settings/migrations">Open Migration Center</Link>
                </Button>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">System Health</CardTitle>
                    <CardDescription className="text-xs">
                      Platform readiness overview
                    </CardDescription>
                  </div>
                  <Badge className="bg-slate-100 text-slate-700">Operational</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="font-medium">API</p>
                    <p className="text-xs text-slate-500">Service status</p>
                  </div>
                  {system
                    ? systemBadge(system.api === "operational" ? "active" : "inactive")
                    : null}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="font-medium">Storage</p>
                    <p className="text-xs text-slate-500">Backend connection</p>
                  </div>
                  {system ? systemBadge(system.storage) : null}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <p className="font-medium">Webhooks</p>
                    <p className="text-xs text-slate-500">Delivery channel</p>
                  </div>
                  {system ? systemBadge(system.webhooks) : null}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
