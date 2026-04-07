"use client";

import { Inbox, RefreshCw } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export default function WorkRequestsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header skeleton */}
      <div className="border-b border-slate-200 bg-white/80 px-6 py-6 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
              <Inbox className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats skeleton */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div>
                  <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="mt-1 h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="h-10 w-80 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex gap-2">
            <div className="h-10 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-36 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    </div>
  );
}
