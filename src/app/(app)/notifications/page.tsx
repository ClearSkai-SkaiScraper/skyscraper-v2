"use client";

/**
 * Notifications Center — Full-page notification management
 * Shows all notifications (in-app, trades, messages) with tabs for unread/all.
 * Supports mark-as-read, mark-all-read, and link navigation.
 */

import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const markRead = async (id: string) => {
    setMarking(id);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error("Failed to mark notification as read");
    } finally {
      setMarking(null);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const refresh = () => {
    setRefreshing(true);
    void fetchAll();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    if (type === "success") return <Check className="h-4 w-4 text-green-500" />;
    if (type === "warning") return <Bell className="h-4 w-4 text-amber-500" />;
    return <MessageSquare className="h-4 w-4 text-blue-500" />;
  };

  const getTypeBadge = (type: string) => {
    if (type === "success")
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (type === "warning")
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const unread = notifications.filter((n) => !n.read);
  const all = notifications;

  const renderList = (items: NotificationItem[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="py-12 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="font-medium text-slate-600 dark:text-slate-300">{emptyMessage}</p>
          <p className="mt-1 text-sm text-slate-400">Check back later for updates.</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((n) => (
          <div
            key={n.id}
            className={cn(
              "flex items-start gap-4 px-4 py-4 transition-colors sm:px-6",
              !n.read
                ? "bg-blue-50/50 dark:bg-blue-950/20"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
            )}
          >
            <div className="mt-0.5 flex-shrink-0">{getTypeIcon(n.type)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "text-sm",
                    !n.read
                      ? "font-semibold text-slate-900 dark:text-white"
                      : "font-medium text-slate-700 dark:text-slate-300"
                  )}
                >
                  {n.title}
                </p>
                <Badge
                  variant="secondary"
                  className={cn("px-1.5 py-0 text-[10px]", getTypeBadge(n.type))}
                >
                  {n.type}
                </Badge>
              </div>
              {n.message && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{n.message}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {n.link && (
                <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                  <Link href={n.link}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              {!n.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => markRead(n.id)}
                  disabled={marking === n.id}
                >
                  {marking === n.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="network"
        title="Notifications"
        subtitle="Stay on top of messages, connection requests, and system alerts"
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("mr-1 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </PageHero>

      <Card className="overflow-hidden">
        <Tabs defaultValue="unread">
          <div className="border-b px-4 pt-2">
            <TabsList className="bg-transparent">
              <TabsTrigger value="unread" className="gap-1.5">
                Unread
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 min-w-[20px] rounded-full px-1.5 text-[10px]"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="unread" className="m-0">
            {renderList(unread, "You're all caught up!")}
          </TabsContent>

          <TabsContent value="all" className="m-0">
            {renderList(all, "No notifications yet")}
          </TabsContent>
        </Tabs>
      </Card>
    </PageContainer>
  );
}
