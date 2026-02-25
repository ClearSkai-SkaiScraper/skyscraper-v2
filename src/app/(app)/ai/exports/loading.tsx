"use client";

import { Loader2, Package } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CarrierExportsLoading() {
  return (
    <PageContainer maxWidth="5xl">
      {/* Hero skeleton */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/20 p-3">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-7 w-56 bg-white/20" />
            <Skeleton className="h-4 w-96 bg-white/20" />
          </div>
        </div>
      </div>

      {/* How it works card skeleton */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <div className="grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form card skeleton */}
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Claim selector */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Carrier selector */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Format selector */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          {/* Button */}
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>

      {/* Integration card skeleton */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-48" />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
