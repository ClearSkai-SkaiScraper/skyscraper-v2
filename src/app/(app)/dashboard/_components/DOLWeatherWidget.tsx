"use client";

/**
 * DOL Weather Intelligence Widget — Single consolidated weather/DOL data card
 * Replaces the 4 separate weather KPI cards with one comprehensive widget
 */

import {
  AlertTriangle,
  Calendar,
  Cloud,
  CloudRain,
  ExternalLink,
  MapPin,
  TrendingUp,
  Wind,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/lib/logger";

interface WeatherKPI {
  activeStorms: number;
  recentHailEvents: number;
  recentWindEvents: number;
  recentTornadoes: number;
  claimsWithWeatherVerified: number;
  totalRecentClaims: number;
  averageCorrelationScore: number;
  claimsNeedingDOLReview: number;
  dolConfidenceHigh: number;
  dolConfidenceMedium: number;
  dolConfidenceLow: number;
  affectedZipCodes: string[];
  highRiskProperties: number;
}

export default function DOLWeatherWidget() {
  const [kpis, setKpis] = useState<WeatherKPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/weather-kpis", { credentials: "include" });
        if (!res.ok) {
          logger.error("Weather KPI API returned", res.status);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data.ok) {
          setKpis(data.kpis);
        }
      } catch (error) {
        logger.error("Failed to load weather KPIs:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Card className="h-full animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </CardContent>
      </Card>
    );
  }

  const data = kpis ?? {
    activeStorms: 0,
    recentHailEvents: 0,
    recentWindEvents: 0,
    recentTornadoes: 0,
    claimsWithWeatherVerified: 0,
    totalRecentClaims: 0,
    averageCorrelationScore: 0,
    claimsNeedingDOLReview: 0,
    dolConfidenceHigh: 0,
    dolConfidenceMedium: 0,
    dolConfidenceLow: 0,
    affectedZipCodes: [],
    highRiskProperties: 0,
  };

  const totalWeatherEvents = data.recentHailEvents + data.recentWindEvents + data.recentTornadoes;
  const verificationRate =
    data.totalRecentClaims > 0
      ? Math.round((data.claimsWithWeatherVerified / data.totalRecentClaims) * 100)
      : 0;

  const totalDOL = data.dolConfidenceHigh + data.dolConfidenceMedium + data.dolConfidenceLow;

  return (
    <Card className="overflow-hidden border-slate-200/60 bg-gradient-to-br from-white via-slate-50/80 to-blue-50/30 shadow-md dark:border-slate-700/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-blue-950/20">
      <CardHeader className="border-b border-slate-200/50 pb-3 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-sm">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">DOL & Weather Intelligence</CardTitle>
              <p className="text-xs text-muted-foreground">
                Date of Loss verification & storm data
              </p>
            </div>
          </div>
          <Link
            href="/quick-dol"
            className="flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
          >
            Quick DOL
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Storm Alert Banner */}
        {data.activeStorms > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300/50 bg-gradient-to-r from-amber-50 to-orange-50 p-3 dark:border-amber-700/50 dark:from-amber-950/30 dark:to-orange-950/30">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {data.activeStorms} Active Storm{data.activeStorms > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {data.highRiskProperties} properties at risk
              </p>
            </div>
            <Link
              href="/storm-center"
              className="shrink-0 rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
            >
              View
            </Link>
          </div>
        )}

        {/* Main Stats Grid */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {/* Weather Events */}
          <div className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-800/50">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Zap className="h-3 w-3 text-yellow-500" />
              Events (30d)
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {totalWeatherEvents}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <CloudRain className="h-2.5 w-2.5" /> {data.recentHailEvents}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Wind className="h-2.5 w-2.5" /> {data.recentWindEvents}
              </span>
            </div>
          </div>

          {/* Verification Rate */}
          <div className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-800/50">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3 text-blue-500" />
              Verified
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {verificationRate}%
            </div>
            <Progress value={verificationRate} className="mt-1.5 h-1.5" />
          </div>

          {/* Correlation Score */}
          <div className="rounded-lg bg-slate-100/80 p-3 dark:bg-slate-800/50">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Avg. Score
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {Math.round(data.averageCorrelationScore)}
              <span className="text-xs font-normal text-muted-foreground">/100</span>
            </div>
            <Progress value={data.averageCorrelationScore} className="mt-1.5 h-1.5" />
          </div>
        </div>

        {/* DOL Confidence Breakdown */}
        <div className="rounded-lg border border-slate-200/60 bg-white/80 p-3 dark:border-slate-700/60 dark:bg-slate-800/30">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">DOL Confidence</span>
            {data.claimsNeedingDOLReview > 0 && (
              <Link
                href="/claims?filter=needs_dol_review"
                className="text-[10px] text-amber-600 hover:underline dark:text-amber-400"
              >
                {data.claimsNeedingDOLReview} need review →
              </Link>
            )}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                {totalDOL > 0 && (
                  <>
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(data.dolConfidenceHigh / totalDOL) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-500 transition-all"
                      style={{ width: `${(data.dolConfidenceMedium / totalDOL) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(data.dolConfidenceLow / totalDOL) * 100}%` }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[10px]">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              High: {data.dolConfidenceHigh}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Med: {data.dolConfidenceMedium}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Low: {data.dolConfidenceLow}
            </span>
          </div>
        </div>

        {/* Affected Areas */}
        {data.affectedZipCodes.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <div className="flex flex-wrap gap-1">
              {data.affectedZipCodes.slice(0, 4).map((zip) => (
                <Badge key={zip} variant="outline" className="px-1.5 py-0 font-mono text-[10px]">
                  {zip}
                </Badge>
              ))}
              {data.affectedZipCodes.length > 4 && (
                <span className="text-[10px]">+{data.affectedZipCodes.length - 4} more</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
