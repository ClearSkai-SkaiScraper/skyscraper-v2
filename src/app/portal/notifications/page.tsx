"use client";

import {
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  url?: string;
  createdAt: string;
}

export default function PortalNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/client-notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      logger.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/client-notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        toast.success("All notifications marked as read");
      }
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  }

  async function markRead(id: string) {
    try {
      await fetch("/api/client-notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // Silently fail
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "status":
        return <TrendingUp className="h-4 w-4" />;
      case "milestone":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "message":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "document":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      case "status":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "milestone":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          <p className="text-slate-500 dark:text-slate-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PortalPageHero
        title="Notifications"
        subtitle="Stay up to date with your projects, messages, and important updates."
        icon={Bell}
        badge="All Notifications"
        gradient="violet"
        stats={[
          { label: "Total", value: notifications.length },
          { label: "Unread", value: unreadCount },
        ]}
        action={
          unreadCount > 0 ? (
            <Button onClick={markAllRead} variant="secondary" size="sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {notifications.length === 0 ? (
        <Card className="border-2 border-dashed bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-900/10 dark:to-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <BellOff className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold dark:text-white">No notifications yet</h3>
            <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">
              You&apos;re all caught up! Notifications about project updates, messages, and
              milestones will appear here.
            </p>
            <Link href="/portal/feed">
              <Button className="bg-gradient-to-r from-violet-600 to-purple-600">
                View Activity Feed
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const content = (
              <Card
                key={notification.id}
                className={`group relative overflow-hidden transition-all hover:shadow-lg ${
                  !notification.read
                    ? "border-l-4 border-l-violet-500 bg-violet-50/50 dark:bg-violet-900/10"
                    : ""
                }`}
                onClick={() => {
                  if (!notification.read) void markRead(notification.id);
                }}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getNotificationColor(notification.type)}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-violet-500" />
                      )}
                    </div>
                    {notification.body && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                        {notification.body}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(notification.createdAt)}
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getNotificationColor(notification.type)}`}
                      >
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );

            if (notification.url) {
              return (
                <Link key={notification.id} href={notification.url}>
                  {content}
                </Link>
              );
            }

            return <div key={notification.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
