"use client";

import { AlertTriangle, Cloud, CloudRain, MapPin, TrendingUp, Wind, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

interface WeatherKPI {
  // Active Storms
  activeStorms: number;
  stormAlerts: StormAlert[];

  // Recent Weather Events (last 30 days)
  recentHailEvents: number;
  recentWindEvents: number;
  recentTornadoes: number;

  // Claim Weather Correlation
  claimsWithWeatherVerified: number;
  totalRecentClaims: number;
  averageCorrelationScore: number;

  // DOL Analysis
  claimsNeedingDOLReview: number;
  dolConfidenceHigh: number;
  dolConfidenceMedium: number;
  dolConfidenceLow: number;

  // Geographic Impact
  affectedZipCodes: string[];
  highRiskProperties: number;
}

interface StormAlert {
  id: string;
  type: string;
  severity: "warning" | "watch" | "advisory";
  headline: string;
  affectedArea: string;
  expires: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function WeatherKPICards() {
  const [kpis, setKpis] = useState<WeatherKPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  // Default values if API hasn't returned data yet
  const data = kpis ?? {
    activeStorms: 0,
    stormAlerts: [],
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

  const verificationRate =
    data.totalRecentClaims > 0
      ? Math.round((data.claimsWithWeatherVerified / data.totalRecentClaims) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* Storm Alert Banner (if active) */}
      {data.activeStorms > 0 && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                {data.activeStorms} Active Storm{data.activeStorms > 1 ? "s" : ""} in Your Area
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {data.highRiskProperties} properties potentially affected
              </p>
            </div>
            <Link
              href="/storm-center"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              View Storm Center
            </Link>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Weather Verification Rate */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weather Verification Rate
            </CardTitle>
            <Cloud className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verificationRate}%</div>
            <Progress value={verificationRate} className="mt-2 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {data.claimsWithWeatherVerified} of {data.totalRecentClaims} claims verified
            </p>
          </CardContent>
        </Card>

        {/* Recent Weather Events */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Weather Events
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {data.recentHailEvents + data.recentWindEvents + data.recentTornadoes}
              </span>
              <span className="text-sm text-muted-foreground">last 30 days</span>
            </div>
            <div className="mt-3 flex gap-2">
              <Badge variant="secondary" className="gap-1">
                <CloudRain className="h-3 w-3" />
                {data.recentHailEvents} hail
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Wind className="h-3 w-3" />
                {data.recentWindEvents} wind
              </Badge>
              {data.recentTornadoes > 0 && (
                <Badge variant="destructive" className="gap-1">
                  {data.recentTornadoes} tornado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* DOL Confidence */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              DOL Confidence Breakdown
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">High</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${getConfidenceWidth(data, "high")}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium">
                    {data.dolConfidenceHigh}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Medium</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${getConfidenceWidth(data, "medium")}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium">
                    {data.dolConfidenceMedium}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Low</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${getConfidenceWidth(data, "low")}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium">
                    {data.dolConfidenceLow}
                  </span>
                </div>
              </div>
            </div>
            {data.claimsNeedingDOLReview > 0 && (
              <Link
                href="/claims?filter=needs_dol_review"
                className="mt-3 block text-xs text-amber-600 hover:underline dark:text-amber-400"
              >
                {data.claimsNeedingDOLReview} claims need DOL review →
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Average Correlation Score */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Correlation Score
            </CardTitle>
            <MapPin className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{Math.round(data.averageCorrelationScore)}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-2">
              <Progress value={data.averageCorrelationScore} className="h-2" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Photo-weather alignment strength</p>
            {data.averageCorrelationScore >= 70 && (
              <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                Strong Evidence
              </Badge>
            )}
            {data.averageCorrelationScore >= 50 && data.averageCorrelationScore < 70 && (
              <Badge className="mt-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                Moderate Evidence
              </Badge>
            )}
            {data.averageCorrelationScore < 50 && data.averageCorrelationScore > 0 && (
              <Badge className="mt-2 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                Needs Improvement
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Affected Areas (if storms active) */}
      {data.affectedZipCodes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Affected ZIP Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.affectedZipCodes.slice(0, 10).map((zip) => (
                <Badge key={zip} variant="outline" className="font-mono">
                  {zip}
                </Badge>
              ))}
              {data.affectedZipCodes.length > 10 && (
                <Badge variant="secondary">+{data.affectedZipCodes.length - 10} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getConfidenceWidth(data: WeatherKPI, level: "high" | "medium" | "low"): number {
  const total = data.dolConfidenceHigh + data.dolConfidenceMedium + data.dolConfidenceLow;
  if (total === 0) return 0;

  const value =
    level === "high"
      ? data.dolConfidenceHigh
      : level === "medium"
        ? data.dolConfidenceMedium
        : data.dolConfidenceLow;

  return Math.round((value / total) * 100);
}
