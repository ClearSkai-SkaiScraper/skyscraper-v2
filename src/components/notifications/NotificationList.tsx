/**
 * Notification List Component
 * Displays a list of notifications with actions
 */

"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  FileText,
  Image,
  MessageSquare,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: Date;
  claim?: {
    title: string;
    claimNumber: string;
  } | null;
}

interface NotificationListProps {
  notifications: Notification[];
  userId: string;
}

const getIconForType = (type: string) => {
  if (type.includes("file") || type.includes("document")) return FileText;
  if (type.includes("message")) return MessageSquare;
  if (type.includes("status")) return CheckCircle;
  if (type.includes("photo") || type.includes("image")) return Image;
  if (type.includes("connection") || type.includes("review")) return Users;
  return Bell;
};

const getColorForType = (type: string) => {
  if (type.includes("file") || type.includes("document")) return "bg-blue-500";
  if (type.includes("message")) return "bg-green-500";
  if (type.includes("status")) return "bg-purple-500";
  if (type.includes("photo")) return "bg-pink-500";
  return "bg-primary";
};

export default function NotificationList({ notifications, userId }: NotificationListProps) {
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const unreadCount = localNotifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (res.ok) {
        setLocalNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      logger.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setLocalNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (error) {
      logger.error("Error marking all as read:", error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  if (localNotifications.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card px-8 py-12 text-center shadow-sm">
        <Bell className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">No Notifications Yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You'll see updates here as your claims progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Mark All Read */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{unreadCount}</span> unread notification
          {unreadCount !== 1 ? "s" : ""}
        </p>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markingAllRead}>
            {markingAllRead ? "Marking..." : "Mark All Read"}
          </Button>
        )}
      </div>

      {/* Notification items */}
      <div className="space-y-2">
        {localNotifications.map((notification) => {
          const Icon = getIconForType(notification.type);
          const colorClass = getColorForType(notification.type);

          return (
            <div
              key={notification.id}
              className={`rounded-xl border ${
                notification.read
                  ? "border-border bg-card"
                  : "border-primary/30 bg-primary/5 shadow-sm"
              } px-5 py-4 transition-all hover:shadow-md`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      {notification.message && (
                        <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                      )}
                      {notification.claim && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Claim: {notification.claim.title} (#{notification.claim.claimNumber})
                        </p>
                      )}
                      <time className="mt-2 block text-xs text-muted-foreground">
                        {format(new Date(notification.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </time>
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col items-end gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-primary hover:underline"
                        >
                          Mark as read
                        </button>
                      )}
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
