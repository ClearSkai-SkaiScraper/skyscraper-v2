/**
 * VIN — Connectors Client
 * Display supplier logos, connection status, enable/disable
 */

"use client";

import { CheckCircle2, Link2, Loader2, Plug, Settings, Unplug, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Connector {
  id: string;
  supplier: string;
  isEnabled: boolean;
  accountRef: string | null;
  lastSyncAt: string | null;
}

const SUPPLIER_META: Record<string, { name: string; color: string; logo: string }> = {
  home_depot: { name: "Home Depot Pro", color: "bg-orange-500", logo: "🏠" },
  lowes: { name: "Lowe's Pro", color: "bg-blue-600", logo: "🔵" },
  abc_supply: { name: "ABC Supply", color: "bg-red-600", logo: "🔺" },
  srs_distribution: { name: "SRS Distribution", color: "bg-emerald-600", logo: "📦" },
  beacon: { name: "Beacon Building", color: "bg-amber-600", logo: "🟡" },
  amazon_business: { name: "Amazon Business", color: "bg-slate-800", logo: "📦" },
  ferguson: { name: "Ferguson", color: "bg-blue-800", logo: "🔧" },
  graybar: { name: "Graybar Electric", color: "bg-yellow-600", logo: "⚡" },
  united_rentals: { name: "United Rentals", color: "bg-green-700", logo: "🚜" },
  grainger: { name: "Grainger", color: "bg-red-700", logo: "🔩" },
};

export function ConnectorsClient() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [accountRef, setAccountRef] = useState("");
  const [apiKey, setApiKey] = useState("");

  const fetchConnectors = useCallback(async () => {
    try {
      const res = await fetch("/api/vin/connectors");
      const data = await res.json();
      if (data.success) setConnectors(data.connectors);
    } catch {
      toast.error("Failed to load connectors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConnectors();
  }, [fetchConnectors]);

  const saveConnector = async (supplier: string) => {
    try {
      const res = await fetch("/api/vin/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier,
          isEnabled: true,
          accountRef: accountRef || undefined,
          apiKey: apiKey || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${SUPPLIER_META[supplier]?.name || supplier} connected!`);
        setConfiguring(null);
        setAccountRef("");
        setApiKey("");
        void fetchConnectors();
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Connection failed");
    }
  };

  const toggleConnector = async (supplier: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/vin/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier, isEnabled: !enabled }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(enabled ? "Disconnected" : "Connected");
        void fetchConnectors();
      }
    } catch {
      toast.error("Toggle failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const connectedMap = new Map(connectors.map((c) => [c.supplier, c]));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(SUPPLIER_META).map(([key, meta]) => {
        const conn = connectedMap.get(key);
        const isConnected = conn?.isEnabled ?? false;

        return (
          <Card key={key} className="relative overflow-hidden">
            {/* Status indicator */}
            <div
              className={`absolute left-0 top-0 h-1 w-full ${isConnected ? "bg-green-500" : "bg-muted"}`}
            />

            <div className="p-5">
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl ${meta.color} text-white`}
                >
                  {meta.logo}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{meta.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs text-green-600">Connected</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Not connected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {conn?.accountRef && (
                <p className="mb-2 text-xs text-muted-foreground">Account: {conn.accountRef}</p>
              )}
              {conn?.lastSyncAt && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Last sync: {new Date(conn.lastSyncAt).toLocaleDateString()}
                </p>
              )}

              {/* Config form */}
              {configuring === key && (
                <div className="mb-3 space-y-2 rounded-lg border bg-muted/50 p-3">
                  <Input
                    placeholder="Account number"
                    value={accountRef}
                    onChange={(e) => setAccountRef(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="API key (optional)"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => saveConnector(key)}>
                      <Link2 className="mr-1 h-3 w-3" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setConfiguring(null);
                        setAccountRef("");
                        setApiKey("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {isConnected ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => toggleConnector(key, true)}
                    >
                      <Unplug className="mr-1 h-3 w-3" /> Disconnect
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setConfiguring(key);
                        setAccountRef(conn?.accountRef || "");
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="flex-1" onClick={() => setConfiguring(key)}>
                    <Plug className="mr-1 h-3 w-3" /> Connect
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
