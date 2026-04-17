// src/app/(app)/jobs/retail/[id]/ClientConnectionDropdown.tsx
"use client";

import { Ban, Loader2, UserCheck, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface Connection {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName?: string | null;
  contactId?: string;
}

interface ConnectedClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ClientConnectionDropdownProps {
  jobId: string;
  contactId: string | null;
}

export function ClientConnectionDropdown({ jobId, contactId }: ClientConnectionDropdownProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [attaching, setAttaching] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [connectedClient, setConnectedClient] = useState<ConnectedClient | null>(null);

  // Filter out test/seed data from connections
  const filterTestData = (conns: Connection[]) => {
    return conns.filter((c) => {
      const email = (c.email || "").toLowerCase();
      const name = (c.name || "").toLowerCase();
      // Filter out @example.com emails and test users
      if (email.includes("@example.com") || email.includes("@test.com")) return false;
      if (name.includes("test user") || name === "test" || name === "demo") return false;
      return true;
    });
  };

  // Fetch available connections from trades network
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch("/api/company/connections?limit=100");
        if (res.ok) {
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const conns: Connection[] = (data.connections || []).map((c: any) => ({
            id: c.id,
            name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
            email: c.email,
            phone: c.phone,
            companyName: c.companyName,
            contactId: c.contactId || c.id,
          }));
          // Filter out test/seed data
          setConnections(filterTestData(conns));
        }
      } catch (error) {
        logger.error("[RetailClientDropdown] Failed to fetch connections:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchConnections();
  }, []);

  // Check if job already has a connected client
  useEffect(() => {
    if (!contactId) return;

    const fetchConnected = async () => {
      try {
        const res = await fetch(`/api/contacts/${contactId}`);
        if (res.ok) {
          const data = await res.json();
          const c = data.contact || data;
          setConnectedClient({
            id: c.id,
            name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
            email: c.email,
            phone: c.phone,
          });
        }
      } catch (error) {
        logger.error("[RetailClientDropdown] Failed to fetch connected client:", error);
      }
    };

    void fetchConnected();
  }, [contactId]);

  const handleAttach = useCallback(async () => {
    if (!selectedId) {
      toast.error("Select a client first");
      return;
    }

    setAttaching(true);
    try {
      const connection = connections.find((c) => c.id === selectedId);
      if (!connection) throw new Error("Connection not found");

      const cid = connection.contactId || connection.id;

      // Update the lead's contactId
      const res = await fetch(`/api/leads/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: cid }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to attach client");
      }

      setConnectedClient({
        id: cid,
        name: connection.name,
        email: connection.email,
        phone: connection.phone,
      });
      setSelectedId("");
      toast.success("Client connected to job!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("[RetailClientDropdown] attach failed:", error);
      toast.error(error.message || "Failed to connect client");
    } finally {
      setAttaching(false);
    }
  }, [connections, jobId, selectedId]);

  const handleDisconnect = useCallback(async () => {
    if (!connectedClient) return;

    setDisconnecting(true);
    try {
      // Update the lead to remove contactId
      const res = await fetch(`/api/leads/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: null }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to disconnect client");
      }

      setConnectedClient(null);
      toast.success("Client disconnected from job");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("[RetailClientDropdown] disconnect failed:", error);
      toast.error(error.message || "Failed to disconnect client");
    } finally {
      setDisconnecting(false);
    }
  }, [connectedClient, jobId]);

  const handleBlock = useCallback(async () => {
    if (!connectedClient) return;

    setBlocking(true);
    try {
      // First disconnect
      const disconnectRes = await fetch(`/api/leads/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: null }),
      });

      if (!disconnectRes.ok) {
        throw new Error("Failed to disconnect before blocking");
      }

      // Then block
      const blockRes = await fetch("/api/connections/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedId: connectedClient.id,
          reason: "Blocked from retail job",
        }),
      });

      if (!blockRes.ok) {
        throw new Error("Failed to block connection");
      }

      setConnectedClient(null);
      toast.success("Client blocked and disconnected");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("[RetailClientDropdown] block failed:", error);
      toast.error(error.message || "Failed to block client");
    } finally {
      setBlocking(false);
    }
  }, [connectedClient, jobId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-blue-600" />
          Client Network
          {connectedClient && (
            <Badge
              variant="secondary"
              className="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            >
              <UserCheck className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connectedClient ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                {connectedClient.name}
              </p>
              {connectedClient.email && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {connectedClient.email}
                </p>
              )}
              {connectedClient.phone && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {connectedClient.phone}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting || blocking}
              className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:hover:bg-red-950/30"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 rotate-45" />
              )}
              {disconnecting ? "Disconnecting…" : "Disconnect Client"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={blocking || disconnecting}
                  className="w-full gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:hover:bg-slate-900/30"
                >
                  {blocking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  {blocking ? "Blocking…" : "Block Client"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Block this client?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will disconnect and block <strong>{connectedClient.name}</strong> from your
                    network. They won&apos;t be able to reconnect automatically. You can unblock
                    them later from your connections settings.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBlock} className="bg-red-600 hover:bg-red-700">
                    Block Client
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : connections.length > 0 ? (
          <div className="space-y-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose from your network…" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{conn.name}</span>
                      {conn.email && (
                        <span className="text-xs text-muted-foreground">({conn.email})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAttach}
              disabled={!selectedId || attaching}
              className="w-full gap-2"
            >
              {attaching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {attaching ? "Connecting…" : "Connect Client"}
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No connections yet.{" "}
            <a href="/contacts/network" className="font-medium text-blue-600 hover:underline">
              Build your network
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
