"use client";

import { useUser } from "@clerk/nextjs";
import { Activity, Clock, FileText, Loader2, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  userId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTION_ICONS: Record<string, any> = {
  claim_created: FileText,
  claim_updated: FileText,
  team_member_joined: Users,
  team_member_removed: Users,
  default: Activity,
};

const ACTION_COLORS: Record<string, string> = {
  claim_created: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
  claim_updated: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
  team_member_joined: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
  team_member_removed: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30",
  default: "text-gray-600 dark:text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30",
};

export default function ActivityFeedPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    void fetchActivities();
  }, []);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/team/activity?limit=100");
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (error) {
      logger.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    return activity.action.startsWith(filter);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-3xl font-bold text-transparent">
          <Activity className="h-8 w-8 text-[color:var(--primary)]" />
          Team Activity Feed
        </h1>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          Real-time log of all team actions and changes
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {["all", "claim", "team"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 font-medium transition ${
              filter === f
                ? "bg-[var(--primary)] text-white shadow-[var(--glow)]"
                : "bg-[var(--surface-2)] text-slate-700 hover:bg-[var(--surface-glass)] dark:text-slate-300"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] py-12 text-center backdrop-blur-xl">
          <Activity className="mx-auto mb-4 h-16 w-16 text-slate-700 dark:text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-[color:var(--text)]">No Activity Yet</h3>
          <p className="text-slate-700 dark:text-slate-300">
            Team actions will appear here in real-time
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => {
            const Icon = ACTION_ICONS[activity.action] || ACTION_ICONS.default;
            const colorClass = ACTION_COLORS[activity.action] || ACTION_COLORS.default;
            const timeAgo = getTimeAgo(new Date(activity.createdAt));

            return (
              <div
                key={activity.id}
                className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-4 backdrop-blur-xl transition hover:bg-[var(--surface-2)]"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 rounded-lg p-2 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 font-medium text-[color:var(--text)]">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                      {activity.userId && (
                        <>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {activity.userId}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo}
                      </span>
                    </div>

                    {/* Metadata */}
                    {Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 rounded-lg bg-[var(--surface-2)] p-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
