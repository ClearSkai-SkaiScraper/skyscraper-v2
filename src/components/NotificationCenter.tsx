"use client";

import { Bell, CheckCheck, ExternalLink, Mail, MessageCircle, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/lib/logger";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Icon for notification type */
function NotifIcon({ type, title }: { type: string; title: string }) {
  const t = (title || "").toLowerCase();
  if (t.includes("message") || t.includes("💬"))
    return <MessageCircle className="h-4 w-4 shrink-0 text-blue-500" />;
  if (t.includes("invite") || t.includes("connection") || t.includes("accepted"))
    return <UserPlus className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (t.includes("team") || t.includes("member"))
    return <Users className="h-4 w-4 shrink-0 text-purple-500" />;
  if (t.includes("email") || t.includes("📧"))
    return <Mail className="h-4 w-4 shrink-0 text-amber-500" />;
  return <Bell className="h-4 w-4 shrink-0 text-slate-400" />;
}

/** Relative time label */
function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading((prev) => (notifications.length === 0 ? true : prev));
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const items: Notification[] = data.notifications || data || [];
        setNotifications(items.slice(0, 30));
        setUnreadCount(data.unreadCount ?? items.filter((n) => !n.read).length);
      }
    } catch (error) {
      logger.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [notifications.length]);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when dropdown opens
  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Failed to mark notification as read:", error);
    }
  };

  const markAllRead = async () => {
    const unreadItems = notifications.filter((n) => !n.read);
    if (unreadItems.length === 0) return;
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await Promise.all(
        unreadItems.map((n) =>
          fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: n.id }),
          })
        )
      );
    } catch (error) {
      logger.error("Failed to mark all as read:", error);
      // Re-fetch to get accurate state on failure
      fetchNotifications();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
    setIsOpen(false);
    // Navigation handled by Link wrapper — no window.location needed
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        {loading && notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-5 w-5 animate-pulse text-slate-300" />
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-6 w-6 text-slate-300" />
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.map((notification) => {
              const inner = (
                <DropdownMenuItem
                  key={notification.id}
                  className={`cursor-pointer gap-3 px-4 py-3 ${!notification.read ? "bg-blue-50/60 dark:bg-blue-950/30" : ""}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotifIcon type={notification.type} title={notification.title} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-sm leading-tight ${!notification.read ? "font-semibold" : "font-medium text-slate-600"}`}
                      >
                        {notification.title}
                      </span>
                      {!notification.read && (
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">
                      {timeAgo(notification.createdAt)}
                    </p>
                  </div>
                  {notification.link && (
                    <ExternalLink className="h-3 w-3 shrink-0 text-slate-300" />
                  )}
                </DropdownMenuItem>
              );

              return notification.link ? (
                <Link key={notification.id} href={notification.link} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={notification.id}>{inner}</div>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-4 py-2">
          <Link
            href="/trades/messages"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            All Messages →
          </Link>
          <Link
            href="/invitations"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Invitations →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
