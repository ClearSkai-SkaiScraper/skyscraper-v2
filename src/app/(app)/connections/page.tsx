"use client";

/**
 * Connections Management Page — Unified view of all client ↔ pro connections.
 * Shows accepted connections, pending invites, and connection requests.
 * Links to messaging for each connection.
 */

import {
  Check,
  Clock,
  Loader2,
  MessageSquare,
  Search,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Connection {
  id: string;
  status: string;
  notes: string | null;
  invitedAt: string;
  connectedAt: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    city: string | null;
    state: string | null;
    category: string | null;
  };
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/connections/received");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.received || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/connections/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      });
      if (res.ok) {
        toast.success("Connection accepted!");
        void loadConnections();
      } else {
        toast.error("Failed to accept");
      }
    } catch {
      toast.error("Failed to accept connection");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch("/api/connections/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id }),
      });
      if (res.ok) {
        toast.success("Connection declined");
        void loadConnections();
      } else {
        toast.error("Failed to decline");
      }
    } catch {
      toast.error("Failed to decline connection");
    } finally {
      setActionLoading(null);
    }
  };

  const pending = connections.filter((c) => c.status === "pending");
  const accepted = connections.filter((c) => c.status === "accepted");
  const declined = connections.filter((c) => c.status === "declined");

  const filteredAccepted = accepted.filter((c) =>
    !search
      ? true
      : c.client.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.client.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="network"
        title="Connections"
        subtitle="Manage client connections and incoming requests"
      >
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/invitations">
              <UserPlus className="mr-1 h-4 w-4" />
              Invitations
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{accepted.length}</p>
              <p className="text-xs text-slate-500">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{connections.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <Tabs defaultValue={pending.length > 0 ? "pending" : "connected"}>
          <div className="flex items-center justify-between border-b px-4 pt-3">
            <TabsList className="bg-transparent">
              <TabsTrigger value="pending" className="gap-1.5">
                Pending
                {pending.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="connected">Connected</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
            </TabsList>
          </div>

          {/* Pending Tab */}
          <TabsContent value="pending" className="m-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : pending.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-600 dark:text-slate-300">
                  No pending requests
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  New client connection requests will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {pending.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conn.client.avatarUrl || undefined} />
                      <AvatarFallback className="bg-amber-100 text-amber-700">
                        {getInitials(conn.client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {conn.client.name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {conn.client.email && <span>{conn.client.email}</span>}
                        {conn.client.city && conn.client.state && (
                          <span>
                            {conn.client.city}, {conn.client.state}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Requested {timeAgo(conn.invitedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => handleAccept(conn.id)}
                        disabled={actionLoading === conn.id}
                      >
                        {actionLoading === conn.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleDecline(conn.id)}
                        disabled={actionLoading === conn.id}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Connected Tab */}
          <TabsContent value="connected" className="m-0">
            {/* Search bar */}
            <div className="border-b px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search connected clients..."
                  className="pl-10"
                />
              </div>
            </div>

            {filteredAccepted.length === 0 ? (
              <div className="py-12 text-center">
                <UserCheck className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-600 dark:text-slate-300">
                  {search ? "No matching connections" : "No connected clients yet"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAccepted.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-4 px-4 py-4 sm:px-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conn.client.avatarUrl || undefined} />
                      <AvatarFallback className="bg-green-100 text-green-700">
                        {getInitials(conn.client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {conn.client.name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        {conn.client.email && <span>{conn.client.email}</span>}
                        {conn.client.category && (
                          <Badge variant="secondary" className="text-[10px]">
                            {conn.client.category}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Connected {conn.connectedAt ? timeAgo(conn.connectedAt) : "recently"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/messages?clientId=${conn.client.id}`}>
                        <MessageSquare className="mr-1 h-3.5 w-3.5" />
                        Message
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Declined Tab */}
          <TabsContent value="declined" className="m-0">
            {declined.length === 0 ? (
              <div className="py-12 text-center">
                <UserMinus className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-600 dark:text-slate-300">
                  No declined connections
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {declined.map((conn) => (
                  <div
                    key={conn.id}
                    className="flex items-center gap-4 px-4 py-4 opacity-60 sm:px-6"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conn.client.avatarUrl || undefined} />
                      <AvatarFallback className="bg-slate-100 text-slate-500">
                        {getInitials(conn.client.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {conn.client.name}
                      </p>
                      <p className="text-sm text-slate-400">{conn.client.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Declined
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </PageContainer>
  );
}
