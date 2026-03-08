"use client";

/**
 * AIDamageSkeleton — Loading skeleton for AI damage analysis results
 *
 * Shows a realistic placeholder while AI damage detection is running.
 */

import { Loader2, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AIDamageSkeletonProps {
  className?: string;
  photoCount?: number;
}

export function AIDamageSkeleton({ className, photoCount = 3 }: AIDamageSkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Status header */}
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            AI Damage Analysis in Progress
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Analyzing {photoCount} photo{photoCount !== 1 ? "s" : ""} for damage patterns...
          </p>
        </div>
        <Sparkles className="ml-auto h-5 w-5 animate-pulse text-blue-400" />
      </div>

      {/* Skeleton cards for each photo */}
      {Array.from({ length: photoCount }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Damage type tags */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            {/* Confidence bar */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            {/* Description lines */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
