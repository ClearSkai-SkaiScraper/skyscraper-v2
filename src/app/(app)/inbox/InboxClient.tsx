"use client";

import {
  AlertCircle,
  Briefcase,
  CheckCheck,
  FileText,
  Filter,
  Hammer,
  Mail,
  MailOpen,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ActivityItem } from "./actions";
import { markAllAsRead,markAsRead } from "./actions";

export default function InboxClient({
  activities: initialActivities,
}: {
  activities: ActivityItem[];
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [filter, setFilter] = useState<"all" | "unread" | ActivityItem["category"]>("all");

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    if (filter === "unread") return !activity.read;
    return activity.category === filter;
  });

  const unreadCount = activities.filter((a) => !a.read).length;

  const handleMarkAsRead = async (activityId: string) => {
    const result = await markAsRead(activityId);
    if (result.success) {
      setActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, read: true } : a))
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await markAllAsRead();
    if (result.success) {
      setActivities((prev) => prev.map((a) => ({ ...a, read: true })));
    }
  };

  const getCategoryIcon = (category: ActivityItem["category"]) => {
    switch (category) {
      case "claim":
        return <FileText className="h-4 w-4" />;
      case "project":
        return <Briefcase className="h-4 w-4" />;
      case "job":
        return <Hammer className="h-4 w-4" />;
      case "user":
        return <Users className="h-4 w-4" />;
      case "system":
        return <Settings className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: ActivityItem["priority"]) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "low":
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-sky-600 text-white"
                : "bg-[var(--surface-1)] text-[color:var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            All ({activities.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-sky-600 text-white"
                : "bg-[var(--surface-1)] text-[color:var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <div className="mx-2 h-4 w-px bg-gray-300" />
          <button
            onClick={() => setFilter("claim")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "claim"
                ? "bg-sky-600 text-white"
                : "bg-[var(--surface-1)] text-[color:var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Claims
          </button>
          <button
            onClick={() => setFilter("project")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "project"
                ? "bg-sky-600 text-white"
                : "bg-[var(--surface-1)] text-[color:var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Projects
          </button>
          <button
            onClick={() => setFilter("job")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "job"
                ? "bg-sky-600 text-white"
                : "bg-[var(--surface-1)] text-[color:var(--text)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Jobs
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-medium text-[color:var(--text)] transition-colors hover:bg-[var(--surface-2)]"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-[color:var(--border)] bg-[var(--surface-2)] p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-slate-700 dark:text-slate-300" />
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">No activities found</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {filter === "unread"
              ? "You're all caught up!"
              : "Activities will appear here as your team works"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActivities.map((activity) => {
            const content = (
              <div
                className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                  activity.read
                    ? "border-[color:var(--border)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)]"
                    : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 rounded-lg border p-2 ${getPriorityColor(
                    activity.priority
                  )}`}
                >
                  {getCategoryIcon(activity.category)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[color:var(--text)]">
                        {activity.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {activity.description}
                      </p>
                    </div>
                    {!activity.read && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          void handleMarkAsRead(activity.id);
                        }}
                        className="flex-shrink-0 rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-1.5 transition-colors hover:bg-[var(--surface-1)]"
                        title="Mark as read"
                      >
                        <MailOpen className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                    <span>{formatTimestamp(activity.timestamp)}</span>
                    <span>•</span>
                    <span className="capitalize">{activity.category}</span>
                    {activity.priority !== "low" && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{activity.priority} priority</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );

            // Wrap in Link if actionUrl exists
            if (activity.actionUrl) {
              return (
                <Link key={activity.id} href={activity.actionUrl}>
                  {content}
                </Link>
              );
            }

            return <div key={activity.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
