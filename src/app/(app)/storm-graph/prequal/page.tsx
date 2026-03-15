"use client";

/**
 * Address Pre-Qualification Page — Phase 3.6
 *
 * Lets a pro enter any address and get an instant storm damage
 * likelihood score based on the Storm Graph engine.
 * Used for canvassing decisions and outreach targeting.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/ui/PageHero";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Globe,
  Loader2,
  MapPin,
  Search,
  Target,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface PreQualResult {
  address: string;
  latitude: number;
  longitude: number;
  preQualScore: number;
  damagelikelihood: string;
  nearbyVerifiedClaims: number;
  nearbyStormEvents: number;
  estimatedHailSize: number | null;
  estimatedWindSpeed: number | null;
  riskFactors: string[];
  recommendation: string;
}

export default function AddressPreQualificationPage() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreQualResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<PreQualResult[]>([]);

  async function handleSearch() {
    if (!address.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Geocode the address using Open-Meteo (free, no API key)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        setError("Address not found. Try a more specific address or city name.");
        return;
      }

      const { latitude, longitude, name } = geoData.results[0];

      // Call pre-qualification API
      const res = await fetch("/api/storm-graph/prequal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, address: address.trim() }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: PreQualResult = await res.json();
      setResult(data);
      setSearchHistory((prev) => [data, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pre-qualification failed");
    } finally {
      setLoading(false);
    }
  }

  const likelihoodColors: Record<string, string> = {
    very_high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    unknown: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  };

  return (
    <div className="space-y-6">
      <PageHero
        title="Address Pre-Qualification"
        subtitle="Enter any address to check storm damage likelihood based on nearby claims, storm events, and damage patterns"
        icon={<Globe className="h-6 w-6" />}
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter address, city, or ZIP code..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !address.trim()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Check Address
            </button>
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="h-3 w-3" />
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Main score card */}
          <Card className="border-indigo-200/50 dark:border-indigo-800/50 lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-indigo-500" />
                    {result.address}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                  </CardDescription>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold",
                    likelihoodColors[result.damagelikelihood] || likelihoodColors.unknown
                  )}
                >
                  {result.damagelikelihood.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Score gauge */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Damage Likelihood Score</span>
                  <span className="text-3xl font-bold">{result.preQualScore}/100</span>
                </div>
                <Progress value={result.preQualScore} className="h-3" />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile
                  icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  value={result.nearbyVerifiedClaims}
                  label="Verified Claims"
                />
                <StatTile
                  icon={<Cloud className="h-4 w-4 text-blue-500" />}
                  value={result.nearbyStormEvents}
                  label="Storm Events"
                />
                <StatTile
                  icon={<Zap className="h-4 w-4 text-amber-500" />}
                  value={result.estimatedHailSize ? `${result.estimatedHailSize}"` : "N/A"}
                  label="Est. Hail Size"
                />
                <StatTile
                  icon={<ArrowRight className="h-4 w-4 text-red-500" />}
                  value={result.estimatedWindSpeed ? `${result.estimatedWindSpeed} mph` : "N/A"}
                  label="Est. Wind Speed"
                />
              </div>

              {/* Recommendation */}
              <div className="rounded-xl border border-indigo-200/40 bg-indigo-50/50 p-3 dark:border-indigo-800/40 dark:bg-indigo-950/20">
                <p className="mb-1 text-sm font-medium text-indigo-700 dark:text-indigo-400">
                  Recommendation
                </p>
                <p className="text-xs text-muted-foreground">{result.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Risk factors sidebar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.riskFactors.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  No significant risk factors detected
                </p>
              ) : (
                <div className="space-y-2">
                  {result.riskFactors.map((factor, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-amber-50/30 p-2 text-xs dark:bg-amber-950/10"
                    >
                      <Zap className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                      <span>{factor}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search history */}
      {searchHistory.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {searchHistory.slice(1).map((entry, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setAddress(entry.address);
                    setResult(entry);
                  }}
                  className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span className="max-w-[300px] truncate">{entry.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        entry.preQualScore >= 60 && "border-red-300 text-red-600"
                      )}
                    >
                      {entry.preQualScore}/100
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 text-center dark:bg-slate-800/50">
      <div className="mb-1 flex justify-center">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
