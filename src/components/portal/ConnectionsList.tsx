/**
 * Connections List Component
 * Shows a user's network connections (like friends list on Facebook)
 * Used on both client profiles and pro profiles
 */

"use client";

import { MapPin, MessageCircle, Star, UserCheck, Users, Verified } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Connection {
  id: string;
  name: string;
  avatar?: string;
  location?: string;
  tradeType?: string;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  connectionStatus: string;
  connectedAt?: string;
}

interface ConnectionsListProps {
  /** The user/pro ID to fetch connections for */
  userId?: string;
  /** Maximum number of connections to show (null = show all) */
  maxDisplay?: number;
  /** Optional title override */
  title?: string;
  /** Optional description override */
  description?: string;
  /** Whether this is showing on a client or pro profile */
  profileType?: "client" | "pro";
  /** Callback when clicking message button */
  onMessage?: (connectionId: string) => void;
}

export function ConnectionsList({
  userId,
  maxDisplay = 6,
  title = "Connections",
  description = "Your professional network",
  profileType = "client",
  onMessage,
}: ConnectionsListProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(
    async function fetchConnections() {
      try {
        const endpoint =
          profileType === "client"
            ? "/api/portal/connections"
            : `/api/trades/connections${userId ? `?userId=${userId}` : ""}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          // Filter to only show accepted connections
          const accepted = (data.connections || []).filter(
            (c: Connection) =>
              c.connectionStatus === "accepted" || c.connectionStatus === "connected"
          );
          setConnections(accepted);
        }
      } catch (error) {
        logger.error("Failed to fetch connections:", error);
      } finally {
        setLoading(false);
      }
    },
    [profileType, userId]
  );

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  const displayConnections = maxDisplay ? connections.slice(0, maxDisplay) : connections;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {title}
              {connections.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {connections.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {connections.length > maxDisplay && (
            <Link href="/portal/my-pros">
              <Button variant="ghost" size="sm">
                See All
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
              <Users className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">No connections yet</p>
            <p className="mt-1 text-xs text-slate-400">
              Connect with contractors to build your network
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayConnections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                profileType={profileType}
                onMessage={onMessage}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ConnectionCardProps {
  connection: Connection;
  profileType: "client" | "pro";
  onMessage?: (connectionId: string) => void;
}

function ConnectionCard({ connection, profileType, onMessage }: ConnectionCardProps) {
  const initials = connection.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileUrl =
    profileType === "client"
      ? `/portal/profiles/${connection.id}`
      : `/trades/members/${connection.id}`;

  return (
    <div className="group flex flex-col rounded-xl border bg-white p-4 transition-all hover:shadow-md dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <Link href={profileUrl}>
          <Avatar className="h-12 w-12 shadow-md ring-2 ring-white transition-transform group-hover:scale-105 dark:ring-slate-900">
            <AvatarImage src={connection.avatar || undefined} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={profileUrl}>
            <div className="flex items-center gap-1">
              <span className="truncate font-medium text-slate-900 hover:text-blue-600 dark:text-white">
                {connection.name}
              </span>
              {connection.verified && <Verified className="h-4 w-4 flex-shrink-0 text-blue-500" />}
            </div>
          </Link>
          {connection.tradeType && (
            <p className="truncate text-sm text-slate-500">{connection.tradeType}</p>
          )}
          {connection.location && (
            <p className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="h-3 w-3" />
              {connection.location}
            </p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
        {connection.rating && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {connection.rating.toFixed(1)}
          </span>
        )}
        <span className="flex items-center gap-0.5">
          <UserCheck className="h-3 w-3 text-green-500" />
          Connected
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        <Link href={profileUrl} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            View Profile
          </Button>
        </Link>
        {onMessage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMessage(connection.id)}
            className="px-2"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for sidebars or smaller spaces
 */
export function ConnectionsListCompact({ maxDisplay = 3 }: { maxDisplay?: number }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch("/api/portal/connections");
        if (res.ok) {
          const data = await res.json();
          const accepted = (data.connections || []).filter(
            (c: Connection) =>
              c.connectionStatus === "accepted" || c.connectionStatus === "connected"
          );
          setConnections(accepted);
        }
      } catch (error) {
        logger.error("Failed to fetch connections:", error);
      } finally {
        setLoading(false);
      }
    }
    void fetchConnections();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        Loading...
      </div>
    );
  }

  if (connections.length === 0) {
    return <div className="text-sm text-slate-500">No connections yet</div>;
  }

  const displayConnections = connections.slice(0, maxDisplay);
  const remaining = connections.length - maxDisplay;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayConnections.map((connection) => {
          const initials = connection.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <Avatar key={connection.id} className="h-8 w-8 ring-2 ring-white dark:ring-slate-900">
              <AvatarImage src={connection.avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      <div className="text-sm text-slate-500">
        {connections.length} connection{connections.length !== 1 ? "s" : ""}
        {remaining > 0 && <span className="ml-1 text-slate-400">+{remaining} more</span>}
      </div>
    </div>
  );
}
