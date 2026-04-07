// src/app/(app)/claims-ready-folder/[claimId]/sections/weather-cause-of-loss/page.tsx
"use client";

import {
  Calendar,
  CloudLightning,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Wind,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface WeatherData {
  stormDate: string;
  stormType: string;
  hailSize?: string;
  windSpeed?: number;
  stormSwathMap?: string;
  noaaVerification: boolean;
  narrativeSummary?: string;
  weatherSources: Array<{
    source: string;
    data: string;
    timestamp: string;
  }>;
}

export default function WeatherCauseOfLossPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/claims-folder/sections/weather-cause-of-loss?claimId=${claimId}`
      );
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch weather data:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleGenerateNarrative = async () => {
    if (!claimId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/claims-folder/generate/cause-of-loss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (res.ok) {
        const json = await res.json();
        setData((prev) => (prev ? { ...prev, narrativeSummary: json.narrative } : null));
      }
    } catch (err) {
      logger.error("Failed to generate narrative:", err);
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CloudLightning className="h-6 w-6 text-amber-600" />
            <h1 className="text-2xl font-bold">Weather & Cause of Loss</h1>
          </div>
          <p className="text-slate-500">NOAA verification, storm data, and event timeline</p>
        </div>
        <Badge variant="outline">Section 4 of 17</Badge>
      </div>

      {/* Storm Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Calendar className="mb-2 h-5 w-5 text-blue-600" />
            <div className="text-lg font-bold">
              {data?.stormDate ? new Date(data.stormDate).toLocaleDateString() : "—"}
            </div>
            <div className="text-sm text-slate-500">Storm Date</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CloudLightning className="mb-2 h-5 w-5 text-amber-600" />
            <div className="text-lg font-bold capitalize">{data?.stormType || "—"}</div>
            <div className="text-sm text-slate-500">Event Type</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <MapPin className="mb-2 h-5 w-5 text-green-600" />
            <div className="text-lg font-bold">{data?.hailSize || "—"}</div>
            <div className="text-sm text-slate-500">Hail Size</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Wind className="mb-2 h-5 w-5 text-purple-600" />
            <div className="text-lg font-bold">
              {data?.windSpeed ? `${data.windSpeed} mph` : "—"}
            </div>
            <div className="text-sm text-slate-500">Max Wind</div>
          </CardContent>
        </Card>
      </div>

      {/* NOAA Verification */}
      <Card className={data?.noaaVerification ? "border-green-200 bg-green-50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {data?.noaaVerification ? (
              <Badge className="bg-green-500">✓ NOAA Verified</Badge>
            ) : (
              <Badge variant="outline">Pending Verification</Badge>
            )}
            Storm Event Verification
          </CardTitle>
          <CardDescription>
            Official weather service confirmation of the storm event
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.weatherSources && data.weatherSources.length > 0 ? (
            <div className="space-y-3">
              {data.weatherSources.map((source, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <div>
                    <div className="font-medium">{source.source}</div>
                    <div className="text-sm text-slate-500">{source.data}</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(source.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <CloudLightning className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <p>No weather verification data yet.</p>
              <Button variant="outline" className="mt-4" onClick={fetchData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Fetch Weather Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storm Swath Map */}
      {data?.stormSwathMap && (
        <Card>
          <CardHeader>
            <CardTitle>Storm Swath Map</CardTitle>
            <CardDescription>Visual representation of storm path and impact area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-200">
              <Image src={data.stormSwathMap} alt="Storm swath map" fill className="object-cover" />
            </div>
            <a
              href={data.stormSwathMap}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center text-sm text-blue-600 hover:underline"
            >
              View full size <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      )}

      {/* AI Narrative */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Cause of Loss Narrative
              </CardTitle>
              <CardDescription>
                AI-generated narrative correlating weather data with observed damage
              </CardDescription>
            </div>
            <Button onClick={handleGenerateNarrative} disabled={generating} variant="outline">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {data?.narrativeSummary ? "Regenerate" : "Generate"}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data?.narrativeSummary ? (
            <Textarea
              value={data.narrativeSummary}
              onChange={(e) =>
                setData((prev) => (prev ? { ...prev, narrativeSummary: e.target.value } : null))
              }
              rows={10}
              className="font-serif text-base leading-relaxed"
            />
          ) : (
            <div className="py-12 text-center">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-medium">Generate AI Narrative</h3>
              <p className="mb-4 max-w-md text-slate-500">
                Create a professional cause of loss narrative that correlates weather data with your
                documented damage for carrier submission.
              </p>
              <Button onClick={handleGenerateNarrative} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Narrative
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
