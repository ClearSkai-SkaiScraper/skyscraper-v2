"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function JobDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-semibold">Failed to load job details</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "Something went wrong loading this job. Please try again."}
          </p>
          <Button onClick={reset} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
