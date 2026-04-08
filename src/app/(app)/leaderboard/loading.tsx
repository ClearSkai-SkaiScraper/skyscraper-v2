"use client";

import { Loader2, Trophy } from "lucide-react";

export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Page Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Trophy className="h-8 w-8 text-amber-500" />
            Team Leaderboard
          </h1>
          <p className="mt-1 text-muted-foreground">Loading team performance data...</p>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200/50 bg-white/80 backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/80">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <span className="text-sm text-muted-foreground">Loading leaderboard...</span>
        </div>
      </div>
    </div>
  );
}
