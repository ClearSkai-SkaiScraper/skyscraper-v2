/**
 * Trades Connections Widget
 * Shows friend-like connections for trades professionals
 */

"use client";

import {
  Loader2,
  MessageCircle,
  MoreHorizontal,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface Connection {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  message?: string;
  connectedAt?: string;
  createdAt: string;
  isRequester: boolean;
  connectedMember: {
    id: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    tradeType?: string;
    companyName?: string;
    city?: string;
    state?: string;
  } | null;
}

interface ConnectionsWidgetProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function ConnectionsWidget({ userId, isOwnProfile }: ConnectionsWidgetProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, [userId]);

  const fetchConnections = async () => {
    try {
      const [acceptedRes, pendingRes] = await Promise.all([
        fetch("/api/trades/connections?status=accepted"),
        isOwnProfile ? fetch("/api/trades/connections?status=pending") : Promise.resolve(null),
      ]);

      if (acceptedRes.ok) {
        const data = await acceptedRes.json();
        setConnections(data.connections || []);
      }

      if (pendingRes?.ok) {
        const data = await pendingRes.json();
        // Filter to show only incoming requests
        setPendingRequests((data.connections || []).filter((c: Connection) => !c.isRequester));
      }
    } catch (error) {
      logger.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const res = await fetch("/api/trades/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, action: "accept" }),
      });

      if (res.ok) {
        toast.success("Connection accepted!");
        fetchConnections();
      } else {
        toast.error("Failed to accept connection");
      }
    } catch {
      toast.error("Failed to accept connection");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const res = await fetch("/api/trades/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, action: "decline" }),
      });

      if (res.ok) {
        toast.success("Connection declined");
        fetchConnections();
      } else {
        toast.error("Failed to decline connection");
      }
    } catch {
      toast.error("Failed to decline connection");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const res = await fetch(`/api/trades/connections?id=${connectionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Connection removed");
        fetchConnections();
      } else {
        toast.error("Failed to remove connection");
      }
    } catch {
      toast.error("Failed to remove connection");
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const f = firstName?.[0] || "";
    const l = lastName?.[0] || "";
    return (f + l).toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            <Users className="h-5 w-5 text-blue-600" />
            Connections
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {connections.length}
            </span>
          </h3>
          {isOwnProfile && pendingRequests.length > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {pendingRequests.length} pending
            </span>
          )}
        </div>
      </div>

      {isOwnProfile && pendingRequests.length > 0 ? (
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="connections"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
            >
              Connections
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
            >
              Requests ({pendingRequests.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="connections" className="p-0">
            <ConnectionsList
              connections={connections}
              onRemove={handleRemove}
              actionLoading={actionLoading}
              getInitials={getInitials}
            />
          </TabsContent>
          <TabsContent value="requests" className="p-0">
            <PendingRequestsList
              requests={pendingRequests}
              onAccept={handleAccept}
              onDecline={handleDecline}
              actionLoading={actionLoading}
              getInitials={getInitials}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ConnectionsList
          connections={connections}
          onRemove={isOwnProfile ? handleRemove : undefined}
          actionLoading={actionLoading}
          getInitials={getInitials}
        />
      )}
    </div>
  );
}

// Connections List Component
function ConnectionsList({
  connections,
  onRemove,
  actionLoading,
  getInitials,
}: {
  connections: Connection[];
  onRemove?: (id: string) => void;
  actionLoading: string | null;
  getInitials: (f?: string, l?: string) => string;
}) {
  if (connections.length === 0) {
    return (
      <div className="p-6 text-center">
        <Users className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">No connections yet</p>
        <p className="text-xs text-slate-400">Connect with other trades professionals</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {connections.slice(0, 6).map((connection) => {
        const member = connection.connectedMember;
        return (
          <div key={connection.id} className="flex items-center gap-3 p-3 hover:bg-slate-50">
            <Link href={`/trades/profiles/${member?.userId}/public`}>
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={member?.avatar || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {getInitials(member?.firstName, member?.lastName)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/trades/profiles/${member?.userId}/public`}
                className="block truncate font-medium text-slate-900 hover:text-blue-600"
              >
                {member?.firstName} {member?.lastName}
              </Link>
              <p className="truncate text-xs text-slate-500">
                {member?.tradeType || member?.companyName || "Trades Professional"}
              </p>
              {member?.city && member?.state && (
                <p className="truncate text-xs text-slate-400">
                  {member.city}, {member.state}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MessageCircle className="h-4 w-4" />
              </Button>
              {onRemove && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onRemove(connection.id)}
                      disabled={actionLoading === connection.id}
                      className="text-red-600"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove Connection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
      {connections.length > 6 && (
        <div className="p-3 text-center">
          <Link
            href="/trades/connections"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all {connections.length} connections
          </Link>
        </div>
      )}
    </div>
  );
}

// Pending Requests List Component
function PendingRequestsList({
  requests,
  onAccept,
  onDecline,
  actionLoading,
  getInitials,
}: {
  requests: Connection[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  actionLoading: string | null;
  getInitials: (f?: string, l?: string) => string;
}) {
  return (
    <div className="divide-y">
      {requests.map((request) => {
        const member = request.connectedMember;
        const isLoading = actionLoading === request.id;
        return (
          <div key={request.id} className="p-3">
            <div className="flex items-center gap-3">
              <Link href={`/trades/profiles/${member?.userId}/public`}>
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={member?.avatar || undefined} />
                  <AvatarFallback className="bg-orange-100 text-orange-700">
                    {getInitials(member?.firstName, member?.lastName)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/trades/profiles/${member?.userId}/public`}
                  className="block truncate font-medium text-slate-900 hover:text-blue-600"
                >
                  {member?.firstName} {member?.lastName}
                </Link>
                <p className="truncate text-xs text-slate-500">
                  {member?.tradeType || "Trades Professional"}
                </p>
              </div>
            </div>
            {request.message && (
              <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600">
                &ldquo;{request.message}&rdquo;
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => onAccept(request.id)}
                disabled={isLoading}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="mr-1 h-4 w-4" />
                    Accept
                  </>
                )}
              </Button>
              <Button
                onClick={() => onDecline(request.id)}
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Decline
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Connect Button Component (for use on other profiles)
export function ConnectButton({
  targetUserId,
  onConnectionChangeAction,
}: {
  targetUserId: string;
  onConnectionChangeAction?: () => void;
}) {
  const [status, setStatus] = useState<"none" | "pending" | "connected" | "loading">("loading");
  const [connectionId, setConnectionId] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, [targetUserId]);

  const checkConnectionStatus = async () => {
    try {
      const res = await fetch("/api/trades/connections?status=accepted");
      if (res.ok) {
        const data = await res.json();
        const connection = data.connections.find(
          (c: Connection) =>
            c.connectedMember?.userId === targetUserId ||
            c.requesterId === targetUserId ||
            c.addresseeId === targetUserId
        );
        if (connection) {
          setStatus("connected");
          setConnectionId(connection.id);
          return;
        }
      }

      // Check pending
      const pendingRes = await fetch("/api/trades/connections?status=pending");
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        const pending = data.connections.find(
          (c: Connection) => c.addresseeId === targetUserId || c.requesterId === targetUserId
        );
        if (pending) {
          setStatus("pending");
          setConnectionId(pending.id);
          return;
        }
      }

      setStatus("none");
    } catch {
      setStatus("none");
    }
  };

  const handleConnect = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/trades/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresseeId: targetUserId }),
      });

      if (res.ok) {
        toast.success("Connection request sent!");
        setStatus("pending");
        onConnectionChangeAction?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send request");
        setStatus("none");
      }
    } catch {
      toast.error("Failed to send request");
      setStatus("none");
    }
  };

  const handleRemove = async () => {
    if (!connectionId) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/trades/connections?id=${connectionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Connection removed");
        setStatus("none");
        setConnectionId(null);
        onConnectionChangeAction?.();
      } else {
        toast.error("Failed to remove connection");
        setStatus("connected");
      }
    } catch {
      toast.error("Failed to remove connection");
      setStatus("connected");
    }
  };

  if (status === "loading") {
    return (
      <Button disabled size="sm" variant="outline">
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (status === "connected") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="text-green-700">
            <UserCheck className="mr-1 h-4 w-4" />
            Connected
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleRemove} className="text-red-600">
            <UserMinus className="mr-2 h-4 w-4" />
            Remove Connection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (status === "pending") {
    return (
      <Button size="sm" variant="outline" disabled className="text-orange-600">
        <Loader2 className="mr-1 h-4 w-4" />
        Pending
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700">
      <UserPlus className="mr-1 h-4 w-4" />
      Connect
    </Button>
  );
}
