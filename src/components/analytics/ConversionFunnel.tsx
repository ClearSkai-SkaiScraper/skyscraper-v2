"use client";

import { ArrowRight, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

interface ConversionFunnelProps {
  stages: FunnelStage[];
  batchJobId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConversionFunnel({ stages, batchJobId }: ConversionFunnelProps) {
  if (stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Track the customer journey from scan to closed deal</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <TrendingDown className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h4 className="mb-1 font-semibold">No Conversions Yet</h4>
          <p className="text-sm text-muted-foreground">
            Conversion data will appear as homeowners move through the funnel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = stages[0]?.count || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>Customer journey from first touchpoint to closed deal</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {stages.map((stage, idx) => {
          const widthPercent = (stage.count / maxCount) * 100;
          const conversionRate =
            idx > 0 && stages[idx - 1].count > 0
              ? ((stage.count / stages[idx - 1].count) * 100).toFixed(1)
              : "100.0";

          return (
            <div key={stage.label}>
              {/* Stage Bar */}
              <div className="relative mb-2">
                <div
                  className={`rounded-lg ${stage.color} transition-all duration-500 ease-out`}
                  style={{ width: `${widthPercent}%`, minWidth: "20%" }}
                >
                  <div className="flex items-center justify-between p-4">
                    <span className="font-semibold text-white">{stage.label}</span>
                    <Badge className="bg-white/20 text-white hover:bg-white/30">
                      {stage.count.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Conversion Rate Arrow */}
              {idx < stages.length - 1 && (
                <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  <span>{conversionRate}% conversion</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Overall Conversion Rate */}
        {stages.length > 1 && (
          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Conversion Rate</span>
              <span className="text-2xl font-bold">
                {stages[0].count > 0
                  ? ((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)
                  : "0.0"}
                %
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              From {stages[0].label.toLowerCase()} to {stages[stages.length - 1].label.toLowerCase()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
