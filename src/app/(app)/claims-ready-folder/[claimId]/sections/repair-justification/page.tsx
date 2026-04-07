// src/app/(app)/claims-ready-folder/[claimId]/sections/repair-justification/page.tsx
"use client";

import { AlertTriangle, CheckCircle2, FileWarning, Loader2, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface RepairJustificationData {
  narrative: string;
  reasons: string[];
  brittleTestFailed: boolean;
  patternDamageAcrossElevations: boolean;
  spotRepairInfeasible: boolean;
  matchingConcerns: string[];
  manufacturerDiscontinued: boolean;
  localOrdinanceTriggers: string[];
}

export default function RepairJustificationPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<RepairJustificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claims-folder/sections/repair-justification?claimId=${claimId}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch repair justification:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    if (!claimId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/claims-folder/generate/repair-justification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to generate:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const justificationFactors = [
    { key: "brittleTestFailed", label: "Brittle Test Failed", active: data?.brittleTestFailed },
    {
      key: "patternDamageAcrossElevations",
      label: "Pattern Damage Across Elevations",
      active: data?.patternDamageAcrossElevations,
    },
    {
      key: "spotRepairInfeasible",
      label: "Spot Repair Infeasible",
      active: data?.spotRepairInfeasible,
    },
    {
      key: "manufacturerDiscontinued",
      label: "Manufacturer Discontinued",
      active: data?.manufacturerDiscontinued,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileWarning className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl font-bold">Repair Justification</h1>
          </div>
          <p className="text-slate-500">AI-generated narrative for full replacement approval</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 10 of 17</Badge>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {data?.narrative ? "Regenerate" : "Generate"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Justification Factors */}
      <div className="grid gap-4 md:grid-cols-2">
        {justificationFactors.map((factor) => (
          <Card
            key={factor.key}
            className={
              factor.active
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                : ""
            }
          >
            <CardContent className="flex items-center gap-3 pt-6">
              {factor.active ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-slate-400" />
              )}
              <span className={factor.active ? "font-medium" : "text-slate-500"}>
                {factor.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Narrative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Justification Narrative
          </CardTitle>
          <CardDescription>
            Professional narrative explaining why full replacement is required
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.narrative ? (
            <Textarea
              value={data.narrative}
              onChange={(e) =>
                setData((prev) => (prev ? { ...prev, narrative: e.target.value } : null))
              }
              rows={12}
              className="font-serif text-base leading-relaxed"
            />
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <FileWarning className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-medium">Generate Justification</h3>
              <p className="mx-auto mb-4 max-w-md text-slate-500">
                AI will analyze damage patterns, test results, and code requirements to create a
                compelling justification for full roof replacement.
              </p>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Justification
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Reasons */}
      {data?.reasons && data.reasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Replacement Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.reasons.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Matching Concerns */}
      {data?.matchingConcerns && data.matchingConcerns.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Matching Concerns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.matchingConcerns.map((concern, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Local Ordinance Triggers */}
      {data?.localOrdinanceTriggers && data.localOrdinanceTriggers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader>
            <CardTitle>Local Ordinance Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.localOrdinanceTriggers.map((trigger, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{trigger}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
