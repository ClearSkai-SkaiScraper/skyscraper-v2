/**
 * Recent Activity Feed — Right sidebar widget for the trades social profile.
 * Shows real-time notifications: messages, connection invites, updates.
 * Polls /api/notifications every 30s.
 */

"use client";

import {
  Bell,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Icon for activity type */
function ActivityIcon({ title }: { title: string }) {
  const t = (title || "").toLowerCase();
  if (t.includes("message") || t.includes("💬"))
    return <MessageCircle className="h-4 w-4 text-blue-500" />;
  if (t.includes("accept") || t.includes("🤝"))
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (t.includes("invite") || t.includes("connection"))
    return <UserPlus className="h-4 w-4 text-purple-500" />;
  if (t.includes("team") || t.includes("member"))
    return <Users className="h-4 w-4 text-amber-500" />;
  return <Bell className="h-4 w-4 text-slate-400" />;
}

/** Relative time label */
function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function RecentActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivity = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems((data.notifications || []).slice(0, 15));
      }
    } catch (error) {
      logger.error("Activity feed error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchActivity();
    const interval = setInterval(() => fetchActivity(), 30_000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <Card className="sticky top-24 border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </div>
        <button
          onClick={() => fetchActivity(true)}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </CardHeader>
      <CardContent className="space-y-1 px-3 pb-4 pt-0">
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-2 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-slate-200" />
            <p className="text-xs text-slate-400">No recent activity</p>
            <p className="mt-1 text-[11px] text-slate-300">
              Messages, invites, and updates will appear here
            </p>
          </div>
        ) : (
          <>
            {items.map((item) => {
              const inner = (
                <div
                  key={item.id}
                  className={`group flex items-start gap-2.5 rounded-lg px-2 py-2 transition ${
                    !item.read
                      ? "bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-950/20"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <ActivityIcon title={item.title} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-snug ${!item.read ? "font-semibold text-slate-800" : "text-slate-600"}`}
                    >
                      {item.title}
                    </p>
                    {item.message && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">
                        {item.message}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-slate-300">{timeAgo(item.createdAt)}</p>
                  </div>
                  {item.link && (
                    <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                  )}
                </div>
              );

              return item.link ? (
                <Link key={item.id} href={item.link} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={item.id}>{inner}</div>
              );
            })}

            <div className="flex gap-2 border-t border-slate-100 pt-3">
              <Link
                href="/trades/messages"
                className="flex-1 rounded-lg bg-slate-50 py-2 text-center text-[11px] font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
              >
                Messages
              </Link>
              <Link
                href="/invitations"
                className="flex-1 rounded-lg bg-slate-50 py-2 text-center text-[11px] font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
              >
                Invitations
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
