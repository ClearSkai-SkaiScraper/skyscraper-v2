"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Unified NotificationBell                                          */
/*  Replaces 5 duplicate implementations:                             */
/*    - src/components/NotificationBell.tsx                            */
/*    - src/components/ui/NotificationBell.tsx                         */
/*    - src/components/portal/NotificationBell.tsx                     */
/*    - src/components/dashboard/NotificationBell.tsx                  */
/*    - src/components/notifications/NotificationBell.tsx              */
/* ------------------------------------------------------------------ */

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

export interface UnifiedNotificationBellProps {
  /** Which API endpoint to fetch from */
  variant?: "pro" | "client";
  /** Poll interval in ms (default: 30000) */
  pollInterval?: number;
  /** Maximum notifications to show (default: 10) */
  maxVisible?: number;
  /** Additional classes for the trigger button */
  className?: string;
  /** Auto-mark-all-read on popover close */
  autoMarkRead?: boolean;
}

/**
 * Single, canonical NotificationBell for both Pro and Client portals.
 *
 * - `variant="pro"` → fetches `/api/notifications`
 * - `variant="client"` → fetches `/api/client-notifications`
 */
export default function UnifiedNotificationBell({
  variant = "pro",
  pollInterval = 30000,
  maxVisible = 10,
  className,
  autoMarkRead = false,
}: UnifiedNotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const apiBase = variant === "client" ? "/api/client-notifications" : "/api/notifications";
  const markReadEndpoint =
    variant === "client" ? "/api/client-notifications/mark-read" : "/api/notifications/mark-read";

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}?limit=${maxVisible}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = Array.isArray(data) ? data : data.notifications || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Notification[] = raw.map((n: any) => ({
          id: n.id,
          type: n.type || "info",
          title: n.title || "Notification",
          body: n.message || n.body || "",
          url: n.url || n.link || null,
          read: n.read ?? n.is_read ?? false,
          createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        }));
        setNotifications(mapped);
        setUnreadCount(data.unreadCount ?? mapped.filter((n) => !n.read).length);
      }
    } catch (error) {
      logger.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [apiBase, maxVisible]);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollInterval]);

  // Re-fetch when popover opens
  useEffect(() => {
    if (open) void fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(markReadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
    } catch (error) {
      logger.error("Failed to mark notification as read:", error);
      await fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update — set everything to read immediately
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      const res = await fetch(markReadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (!res.ok) {
        logger.warn("Mark all as read returned non-OK status:", res.status);
      }
      // Wait longer before re-fetch to ensure all DB writes have committed
      // Multiple tables are updated (notifications_reads, ProjectNotification, tradeNotification, message)
      setTimeout(() => void fetchNotifications(), 5000);
    } catch (error) {
      logger.error("Failed to mark all as read:", error);
      // On error, delay re-fetch to show actual server state
      setTimeout(() => void fetchNotifications(), 3000);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) void markAsRead(notif.id);
    setOpen(false);
    if (notif.url) router.push(notif.url);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && autoMarkRead && unreadCount > 0) {
      void markAllAsRead();
    }
    setOpen(nextOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-auto gap-1 p-1 text-xs"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 transition hover:bg-accent",
                    !notif.read
                      ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                      : "border-border"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm", !notif.read ? "font-semibold" : "font-medium")}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    {notif.body && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{notif.body}</p>
                    )}
                    <time className="mt-1 block text-xs text-muted-foreground/60">
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                      })}
                    </time>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Links */}
          <div className="flex items-center justify-between border-t pt-2">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/tasks");
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Task Manager
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/notifications");
              }}
              className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              View all →
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Named export for backwards-compatible destructured imports */
export { UnifiedNotificationBell as NotificationBell };

/** Trigger function for custom notification events (replaces ui/NotificationBell's localStorage approach) */
export function triggerNotification(notification: { id?: string; message: string; type?: string }) {
  const event = new CustomEvent("new-notification", {
    detail: {
      id: notification.id || Math.random().toString(36).slice(2),
      message: notification.message,
      type: notification.type || "info",
      timestamp: new Date(),
      read: false,
    },
  });
  window.dispatchEvent(event);
}
