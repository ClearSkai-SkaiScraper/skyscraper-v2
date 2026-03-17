// ============================================================================
// H-16: Notification Badge Component
// ============================================================================

"use client";

import { Bell, FileText, MessageSquare, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect,useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { logger } from "@/lib/logger";

interface Notification {
  id: string;
  type: "message" | "claim" | "upload";
  title: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: Date;
}

export function NotificationBadge() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch notifications
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      logger.error("Failed to fetch notifications", error);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error("Failed to mark as read", error);
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      case "claim":
        return <FileText className="h-4 w-4" />;
      case "upload":
        return <Upload className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
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
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((notif) => (
              <Link
                key={notif.id}
                href={notif.link}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`block border-b p-4 transition-colors hover:bg-accent ${
                  !notif.read ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      !notif.read ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {getIcon(notif.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${!notif.read ? "font-semibold" : ""}`}>
                      {notif.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{notif.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!notif.read && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        <div className="border-t p-2">
          <Button variant="ghost" className="w-full text-sm" asChild>
            <Link href="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
