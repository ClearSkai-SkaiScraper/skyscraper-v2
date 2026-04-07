// src/app/(app)/claims-ready-folder/[claimId]/sections/claim-checklist/page.tsx
"use client";

import { CheckCircle2, CheckSquare, Circle, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  status: "complete" | "incomplete" | "not_applicable";
  required: boolean;
  notes?: string;
}

interface ChecklistData {
  items: ChecklistItem[];
  completionPercentage: number;
}

export default function ClaimChecklistPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/claim-checklist?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch checklist:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // Group items by section
  const groupedItems = (data?.items || []).reduce(
    (acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section].push(item);
      return acc;
    },
    {} as Record<string, ChecklistItem[]>
  );

  const completedCount = data?.items.filter((i) => i.status === "complete").length || 0;
  const requiredCount = data?.items.filter((i) => i.required).length || 0;
  const requiredCompleteCount =
    data?.items.filter((i) => i.required && i.status === "complete").length || 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-cyan-600" />
            <h1 className="text-2xl font-bold">Claim Checklist</h1>
          </div>
          <p className="text-slate-500">Carrier-friendly completion status</p>
        </div>
        <Badge variant="outline">Section 15 of 17</Badge>
      </div>

      {/* Completion Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-500">Overall Progress</span>
              <span className="font-bold text-cyan-600">{data?.completionPercentage || 0}%</span>
            </div>
            <Progress value={data?.completionPercentage || 0} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {completedCount}/{data?.items.length || 0}
            </div>
            <div className="text-sm text-slate-500">Items Complete</div>
          </CardContent>
        </Card>
        <Card
          className={
            requiredCompleteCount < requiredCount
              ? "border-amber-200 bg-amber-50"
              : "border-green-200 bg-green-50"
          }
        >
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {requiredCompleteCount}/{requiredCount}
            </div>
            <div className="text-sm text-slate-500">Required Items</div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist by Section */}
      {Object.keys(groupedItems).length > 0 ? (
        Object.entries(groupedItems).map(([section, items]) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{section}</CardTitle>
              <CardDescription>
                {items.filter((i) => i.status === "complete").length} of {items.length} complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      item.status === "complete"
                        ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                        : item.status === "not_applicable"
                          ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                          : item.required
                            ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
                            : "border-slate-200"
                    }`}
                  >
                    {item.status === "complete" ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    ) : item.status === "not_applicable" ? (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            item.status === "complete"
                              ? "font-medium"
                              : item.status === "not_applicable"
                                ? "text-slate-500 line-through"
                                : ""
                          }
                        >
                          {item.item}
                        </span>
                        {item.required && item.status !== "complete" && (
                          <Badge variant="outline" className="text-xs text-amber-600">
                            Required
                          </Badge>
                        )}
                      </div>
                      {item.notes && <p className="mt-1 text-sm text-slate-500">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <CheckSquare className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="mb-2 text-lg font-medium">Checklist Loading...</h3>
            <p className="text-sm">
              The checklist will be populated based on your claim data and carrier requirements.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Print Summary */}
      {data?.items && data.items.length > 0 && (
        <Card className="border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950">
          <CardHeader>
            <CardTitle>Checklist Summary for Print</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 bg-white p-6 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 text-center font-bold uppercase tracking-wide">
                Claims Package Checklist
              </div>
              <hr className="my-4" />
              <div className="grid gap-1">
                {data.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span>{item.status === "complete" ? "☑" : "☐"}</span>
                    <span className={item.status === "not_applicable" ? "line-through" : ""}>
                      {item.item}
                    </span>
                    {item.required && item.status !== "complete" && (
                      <span className="text-xs">(Required)</span>
                    )}
                  </div>
                ))}
              </div>
              <hr className="my-4" />
              <div className="text-center">
                Completion: {data.completionPercentage}% • {completedCount}/{data.items.length}{" "}
                items
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
