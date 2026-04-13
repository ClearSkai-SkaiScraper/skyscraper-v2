"use client";

/**
 * "Is This Worth It?" — Unified Prospecting Tool
 *
 * Two tabs:
 *   1. Quick DOL — Find date of loss for an existing address/claim
 *   2. Score Address — Pre-qualify ANY address for storm damage likelihood
 *
 * This is the "know before you knock" page that turns cold-canvassing
 * into data-driven prospecting.
 */

import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Cloud,
  Loader2,
  MapPin,
  Search,
  Target,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { ClaimJobSelect, type ClaimJobSelection } from "@/components/selectors/ClaimJobSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { QuickDOLFinder } from "@/components/weather/QuickDOLFinder";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ClaimLite = {
  id: string;
  claimNumber: string | null;
  propertyAddress: string | null;
  dateOfLoss: string | null;
};

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

type Tab = "dol" | "score";

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function QuickDOLPage() {
  const [tab, setTab] = useState<Tab>("score");

  // ── DOL Tab state ──
  const [selection, setSelection] = useState<ClaimJobSelection>({});
  const [claimAddress, setClaimAddress] = useState("");
  const [claimLiteMap, setClaimLiteMap] = useState<Record<string, ClaimLite>>({});

  // ── Score Tab state ──
  const [scoreAddress, setScoreAddress] = useState("");
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState<PreQualResult | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreHistory, setScoreHistory] = useState<PreQualResult[]>([]);

  // Load claims for DOL tab
  useEffect(() => {
    let cancelled = false;
    async function loadClaimsLite() {
      try {
        const res = await fetch("/api/claims/list-lite", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const claims: ClaimLite[] = Array.isArray(data?.claims) ? data.claims : [];
        const map: Record<string, ClaimLite> = {};
        for (const c of claims) {
          if (c && typeof c.id === "string") map[c.id] = c;
        }
        if (!cancelled) setClaimLiteMap(map);
      } catch {
        /* ignore */
      }
    }
    void loadClaimsLite();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const claimId = selection.resolvedClaimId || selection.claimId;
    if (claimId && claimLiteMap[claimId]) {
      setClaimAddress(claimLiteMap[claimId].propertyAddress || "");
    }
  }, [selection, claimLiteMap]);

  // ── Address Scoring ──
  async function handleScore() {
    if (!scoreAddress.trim()) return;
    setScoreLoading(true);
    setScoreError(null);

    try {
      // Geocode first
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(scoreAddress)}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) {
        setScoreError("Address not found. Try a more specific address or city name.");
        return;
      }

      const { latitude, longitude } = geoData.results[0];

      const res = await fetch("/api/storm-graph/prequal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, address: scoreAddress.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: PreQualResult = await res.json();
      setScoreResult(data);
      setScoreHistory((prev) => [data, ...prev.slice(0, 9)]);

      if (data.preQualScore >= 70) {
        toast.success(`🔥 High score — ${data.preQualScore}/100! Go knock that door.`);
      } else if (data.preQualScore >= 40) {
        toast.info(`Score: ${data.preQualScore}/100 — worth checking out.`);
      } else {
        toast("Score: " + data.preQualScore + "/100 — low probability area.");
      }
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setScoreLoading(false);
    }
  }

  // ── Helpers ──
  const likelihoodColors: Record<string, string> = {
    very_high:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
    high: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    moderate:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700",
    low: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
    unknown:
      "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700",
  };

  function scoreGradient(score: number) {
    if (score >= 70) return "from-red-500 to-orange-500";
    if (score >= 40) return "from-amber-500 to-yellow-500";
    return "from-emerald-500 to-teal-500";
  }

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Quick DOL Pull"
        subtitle="Rapid date-of-loss verification and address scoring. Know before you knock."
      />

      {/* Tab switcher */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("score")}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all",
            tab === "score"
              ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
              : "border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
          )}
        >
          <Target className="h-4 w-4" />
          Score Address
        </button>
        <button
          type="button"
          onClick={() => setTab("dol")}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all",
            tab === "dol"
              ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
              : "border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
          )}
        >
          <Calendar className="h-4 w-4" />
          Quick DOL
        </button>
      </div>

      {/* ═══════════════════ SCORE ADDRESS TAB ═══════════════════ */}
      {tab === "score" && (
        <div className="space-y-4">
          <PageSectionCard>
            <h3 className="mb-1 text-lg font-bold text-foreground">
              <Target className="mr-2 inline h-5 w-5 text-blue-500" />
              Should I Knock on This Door?
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter any address to get a storm damage likelihood score based on nearby claims,
              weather events, and damage patterns.
            </p>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={scoreAddress}
                  onChange={(e) => setScoreAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScore()}
                  placeholder="123 Main St, Phoenix, AZ 85001"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={handleScore}
                disabled={scoreLoading || !scoreAddress.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 disabled:opacity-50"
              >
                {scoreLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Score It
              </button>
            </div>
            {scoreError && (
              <p className="mt-2 flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="h-3 w-3" />
                {scoreError}
              </p>
            )}
          </PageSectionCard>

          {/* Result */}
          {scoreResult && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Big score card */}
              <div className="lg:col-span-2">
                <div
                  className={cn(
                    "rounded-2xl border p-6 shadow-sm",
                    scoreResult.preQualScore >= 70
                      ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                      : scoreResult.preQualScore >= 40
                        ? "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
                        : "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                  )}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-foreground">{scoreResult.address}</h4>
                      <p className="text-xs text-muted-foreground">
                        {scoreResult.latitude.toFixed(4)}, {scoreResult.longitude.toFixed(4)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-4xl font-black",
                          scoreResult.preQualScore >= 70
                            ? "text-red-600"
                            : scoreResult.preQualScore >= 40
                              ? "text-amber-600"
                              : "text-emerald-600"
                        )}
                      >
                        {scoreResult.preQualScore}
                      </div>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase",
                          likelihoodColors[scoreResult.damagelikelihood] || likelihoodColors.unknown
                        )}
                      >
                        {scoreResult.damagelikelihood.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <Progress value={scoreResult.preQualScore} className="mb-4 h-2.5" />

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat
                      icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      value={scoreResult.nearbyVerifiedClaims}
                      label="Verified Claims"
                    />
                    <MiniStat
                      icon={<Cloud className="h-4 w-4 text-blue-500" />}
                      value={scoreResult.nearbyStormEvents}
                      label="Storm Events"
                    />
                    <MiniStat
                      icon={<Zap className="h-4 w-4 text-amber-500" />}
                      value={
                        scoreResult.estimatedHailSize ? `${scoreResult.estimatedHailSize}"` : "N/A"
                      }
                      label="Hail Size"
                    />
                    <MiniStat
                      icon={<ArrowRight className="h-4 w-4 text-red-500" />}
                      value={
                        scoreResult.estimatedWindSpeed
                          ? `${scoreResult.estimatedWindSpeed} mph`
                          : "N/A"
                      }
                      label="Wind Speed"
                    />
                  </div>

                  {/* Recommendation */}
                  <div className="mt-4 rounded-xl border border-blue-200/40 bg-blue-50/50 p-3 dark:border-blue-800/40 dark:bg-blue-950/20">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {scoreResult.preQualScore >= 70
                        ? "🔥 Go knock on this door!"
                        : scoreResult.preQualScore >= 40
                          ? "👀 Worth checking out"
                          : "❄️ Low probability"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {scoreResult.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk factors */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Why This Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scoreResult.riskFactors.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                      No significant risk factors detected
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {scoreResult.riskFactors.map((factor, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 rounded-lg bg-amber-50/40 p-2 text-xs dark:bg-amber-950/10"
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

          {/* Quick-score history */}
          {scoreHistory.length > 1 && (
            <PageSectionCard>
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Recent Scores</h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {scoreHistory.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground">{r.address}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          r.preQualScore >= 70
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : r.preQualScore >= 40
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}
                      >
                        {r.preQualScore}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </PageSectionCard>
          )}
        </div>
      )}

      {/* ═══════════════════ QUICK DOL TAB ═══════════════════ */}
      {tab === "dol" && (
        <div className="space-y-4">
          <PageSectionCard>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Select Context (Optional)
                </h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Choose a claim or job to auto-fill the property address.
                </p>
              </div>
              <div className="max-w-md space-y-2">
                <Label htmlFor="claim-select">Claim / Job</Label>
                <ClaimJobSelect
                  value={selection}
                  onValueChange={setSelection}
                  placeholder="Select to auto-fill address..."
                />
                {selection.resolvedClaimId && claimAddress && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Will use address: {claimAddress}
                  </p>
                )}
              </div>
            </div>
          </PageSectionCard>

          <PageSectionCard>
            <QuickDOLFinder
              claimId={selection.resolvedClaimId || selection.claimId}
              initialAddress={claimAddress}
              onSelectDate={(date, candidate) => {
                const formatted = format(parseISO(date), "MMMM d, yyyy");
                navigator.clipboard.writeText(date).catch(() => {});
                toast.success(`DOL Selected: ${formatted}`, {
                  description: `${candidate.peril || "Weather event"} — Score: ${candidate.score}%. Date copied to clipboard.`,
                  duration: 5000,
                });
              }}
            />
          </PageSectionCard>
        </div>
      )}
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Mini stat tile
// ---------------------------------------------------------------------------
function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/60 p-3 dark:border-slate-700/60 dark:bg-slate-800/60">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-lg font-bold text-foreground">{value}</span>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
