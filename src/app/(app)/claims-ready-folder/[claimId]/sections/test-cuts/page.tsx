// src/app/(app)/claims-ready-folder/[claimId]/sections/test-cuts/page.tsx
"use client";

import { Camera, CheckCircle2, ClipboardList, MapPin, Plus, Scissors, XCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface TestCut {
  id: string;
  location: string;
  elevation: "north" | "east" | "south" | "west" | "flat";
  layers: number;
  findings: string;
  moistureDetected: boolean;
  deckCondition: "good" | "fair" | "poor" | "rotten";
  photoUrl?: string;
  date?: string;
}

interface TestCutsData {
  testCuts: TestCut[];
  overallAssessment: string;
  deckReplacementNeeded: boolean;
}

export default function TestCutsPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<TestCutsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/test-cuts?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        setData({
          testCuts: [],
          overallAssessment: "",
          deckReplacementNeeded: false,
        });
      }
    } catch (err) {
      logger.error("Failed to fetch test cuts data:", err);
      setData({
        testCuts: [],
        overallAssessment: "",
        deckReplacementNeeded: false,
      });
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getDeckBadge = (condition: string) => {
    switch (condition) {
      case "good":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Good
          </Badge>
        );
      case "fair":
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Fair
          </Badge>
        );
      case "poor":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            Poor
          </Badge>
        );
      case "rotten":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Rotten
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const hasTestCuts = data && data.testCuts.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Test Cuts</h1>
        <p className="text-slate-500">
          Roof test cut documentation — layer analysis, moisture detection, and deck condition
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/50">
              <Scissors className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data?.testCuts.length ?? 0}</p>
              <p className="text-sm text-slate-500">Test Cuts</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/50">
              {data?.testCuts.some((tc) => tc.moistureDetected) ? (
                <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">
                {data?.testCuts.filter((tc) => tc.moistureDetected).length ?? 0}
              </p>
              <p className="text-sm text-slate-500">Moisture Detected</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div
              className={`rounded-full p-3 ${data?.deckReplacementNeeded ? "bg-red-100 dark:bg-red-900/50" : "bg-green-100 dark:bg-green-900/50"}`}
            >
              <ClipboardList
                className={`h-5 w-5 ${data?.deckReplacementNeeded ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
              />
            </div>
            <div>
              <p className="text-lg font-bold">
                {data?.deckReplacementNeeded ? "Replacement" : "Overlay OK"}
              </p>
              <p className="text-sm text-slate-500">Deck Assessment</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Cut Cards */}
      {hasTestCuts ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data!.testCuts.map((cut) => (
            <Card key={cut.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    {cut.location}
                  </CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {cut.elevation}
                  </Badge>
                </div>
                <CardDescription>{cut.date || "No date recorded"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Layers:</span>{" "}
                    <span className="font-medium">{cut.layers}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Deck:</span> {getDeckBadge(cut.deckCondition)}
                  </div>
                  <div>
                    <span className="text-slate-500">Moisture:</span>{" "}
                    {cut.moistureDetected ? (
                      <span className="font-medium text-red-600">Detected</span>
                    ) : (
                      <span className="font-medium text-green-600">None</span>
                    )}
                  </div>
                </div>
                {cut.findings && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{cut.findings}</p>
                )}
                {cut.photoUrl && (
                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <Camera className="h-3 w-3" />
                    <span>Photo attached</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
              <Scissors className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-1 text-lg font-medium text-slate-900 dark:text-white">
              No Test Cuts Documented
            </h3>
            <p className="mb-4 max-w-sm text-sm text-slate-500">
              Test cuts help prove the need for full roof replacement vs. repair. Document each cut
              location, layers found, moisture readings, and deck condition.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Test Cut
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overall Assessment */}
      {data?.overallAssessment && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
          <CardContent className="pt-6">
            <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
              Overall Assessment
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">{data.overallAssessment}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
