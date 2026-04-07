// src/app/(app)/jobs/retail/[id]/ClientConnectionDropdown.tsx
"use client";

import { Loader2, UserCheck, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const [connectedClient, setConnectedClient] = useState<ConnectedClient | null>(null);

  // Fetch available connections from trades network
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch("/api/company/connections?limit=100");
        if (res.ok) {
          const data = await res.json();
          const conns: Connection[] = (data.connections || []).map((c: any) => ({
            id: c.id,
            name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
            email: c.email,
            phone: c.phone,
            companyName: c.companyName,
            contactId: c.contactId || c.id,
          }));
          setConnections(conns);
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
    } catch (error: any) {
      logger.error("[RetailClientDropdown] attach failed:", error);
      toast.error(error.message || "Failed to connect client");
    } finally {
      setAttaching(false);
    }
  }, [connections, jobId, selectedId]);

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
