"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: Date | string;
  link?: string;
}

interface RecentActivityProps {
  activities?: Activity[];
}

export default function RecentActivity({ activities: propActivities }: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>(propActivities || []);
  const [loading, setLoading] = useState(!propActivities);

  const activityIcons: Record<string, string> = {
    claim: "📋",
    report: "📄",
    lead: "👤",
    weather: "🌦️",
    inspection: "🔍",
    default: "•",
  };

  useEffect(() => {
    if (!propActivities) {
      void fetchActivities();
    }
  }, [propActivities]);

  async function fetchActivities() {
    try {
      const res = await fetch("/api/dashboard/activities");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      logger.error("Failed to fetch activities:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <Link href="/dashboard/activity" className="text-sm text-sky-400 hover:underline">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-400" />
        </div>
      ) : activities.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <p className="text-sm">No recent activity</p>
          <p className="mt-1 text-xs">Your activity will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 rounded-lg bg-slate-800/50 p-3 transition hover:bg-slate-800"
            >
              <div className="text-xl">{activityIcons[activity.type] || activityIcons.default}</div>
              <div className="min-w-0 flex-1">
                {activity.link ? (
                  <Link href={activity.link} className="text-sm text-slate-300 hover:text-white">
                    {activity.description}
                  </Link>
                ) : (
                  <p className="text-sm text-slate-300">{activity.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(activity.timestamp).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
