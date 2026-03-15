"use client";

/**
 * CorroborationPanel — Phase 3.4
 *
 * Shows nearby claim clusters, corroboration score, and damage patterns
 * from the Storm Graph engine. Embeds inside the claim detail view.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  Shield,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types (matches Storm Graph API response)
// ─────────────────────────────────────────────────────────────────────────────

interface ClusterMember {
  claimId: string;
  claimNumber: string;
  address: string;
  distanceMiles: number;
  damageType: string;
  status: string;
  verificationLevel: "confirmed" | "likely" | "unverified";
}

interface StormCluster {
  clusterId: string;
  stormType: string;
  stormDate: string;
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  totalClaims: number;
  verifiedClaims: number;
  avgDamageSeverity: number;
  avgHailSize: number | null;
  maxWindSpeed: number | null;
  confidenceLevel: "high" | "medium" | "low";
  members: ClusterMember[];
}

interface DamagePattern {
  dominantDamageType: string;
  consistencyScore: number;
  averageDetectionConfidence: number;
  commonDetectionTypes: string[];
}

interface GeographicDensity {
  radiusMile1: number;
  radiusMile3: number;
  radiusMile5: number;
  radiusMile10: number;
}

interface StormTimelineEntry {
  timestamp: string;
  type: string;
  description: string;
  claimId?: string;
}

interface CorroborationData {
  claimId: string;
  corroborationScore: number;
  nearbyVerifiedDamage: number;
  nearbyDenied: number;
  stormClusters: StormCluster[];
  damagePattern: DamagePattern;
  geographicDensity: GeographicDensity;
  timeline: StormTimelineEntry[];
  preQualScore: number;
  computedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface CorroborationPanelProps {
  claimId: string;
  compact?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CorroborationPanel({
  claimId,
  compact = false,
  className,
}: CorroborationPanelProps) {
  const [data, setData] = useState<CorroborationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/claims/${claimId}/storm-graph`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Card className={cn("border-blue-200/50 dark:border-blue-800/50", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="space-y-2 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-500" />
            <p className="text-xs text-muted-foreground">Building storm graph...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("border-red-200/50 dark:border-red-800/50", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="space-y-2 text-center">
            <XCircle className="mx-auto h-5 w-5 text-red-500" />
            <p className="text-xs text-red-500">{error || "Unavailable"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={cn("border-blue-200/50 dark:border-blue-800/50", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4 text-blue-500" />
              Storm Graph
            </CardTitle>
            <CorroborationBadge score={data.corroborationScore} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Nearby" value={data.nearbyVerifiedDamage} icon="✓" />
            <MiniStat label="Clusters" value={data.stormClusters.length} icon="⊕" />
            <MiniStat label="Denied" value={data.nearbyDenied} icon="✗" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header — Corroboration Score */}
      <Card className="overflow-hidden border-blue-200/50 dark:border-blue-800/50">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-cyan-50/20 dark:from-blue-950/20 dark:to-cyan-950/10" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Globe className="h-5 w-5 text-blue-500" />
                Storm Graph — Cross-Claim Intelligence
              </CardTitle>
              <CardDescription>
                {data.nearbyVerifiedDamage} verified claims nearby • {data.stormClusters.length}{" "}
                storm clusters
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4 text-slate-500" />
              </button>
              <CorroborationBadge score={data.corroborationScore} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {/* Score bar */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Corroboration Strength</span>
              <span className="text-lg font-bold">{data.corroborationScore}/100</span>
            </div>
            <Progress value={data.corroborationScore} className="h-3" />
          </div>

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              value={data.nearbyVerifiedDamage}
              label="Verified Nearby"
            />
            <StatCard
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              value={data.nearbyDenied}
              label="Denied Nearby"
            />
            <StatCard
              icon={<Users className="h-4 w-4 text-blue-500" />}
              value={data.stormClusters.reduce((s, c) => s + c.totalClaims, 0)}
              label="Total in Clusters"
            />
            <StatCard
              icon={<MapPin className="h-4 w-4 text-purple-500" />}
              value={data.preQualScore}
              label="Pre-Qual Score"
              suffix="/100"
            />
          </div>
        </CardContent>
      </Card>

      {/* Damage Pattern */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-amber-500" />
            Damage Pattern Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Dominant Damage Type</span>
            <Badge variant="outline">{data.damagePattern.dominantDamageType}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Pattern Consistency</span>
            <span className="font-medium">{data.damagePattern.consistencyScore}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg Detection Confidence</span>
            <span className="font-medium">{data.damagePattern.averageDetectionConfidence}%</span>
          </div>
          {data.damagePattern.commonDetectionTypes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {data.damagePattern.commonDetectionTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-[10px]">
                  {type}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geographic Density */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-purple-500" />
            Geographic Damage Density
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            <DensityRing label="1 mi" value={data.geographicDensity.radiusMile1} />
            <DensityRing label="3 mi" value={data.geographicDensity.radiusMile3} />
            <DensityRing label="5 mi" value={data.geographicDensity.radiusMile5} />
            <DensityRing label="10 mi" value={data.geographicDensity.radiusMile10} />
          </div>
        </CardContent>
      </Card>

      {/* Storm Clusters */}
      {data.stormClusters.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Cloud className="h-4 w-4 text-blue-500" />
              Storm Clusters ({data.stormClusters.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.stormClusters.map((cluster) => (
              <ClusterCard
                key={cluster.clusterId}
                cluster={cluster}
                expanded={expandedCluster === cluster.clusterId}
                onToggle={() =>
                  setExpandedCluster(
                    expandedCluster === cluster.clusterId ? null : cluster.clusterId
                  )
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {data.timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-indigo-500" />
              Storm Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.timeline.slice(0, 10).map((entry, i) => (
                <TimelineItem key={i} entry={entry} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="px-1 text-right text-xs text-muted-foreground">
        Computed {new Date(data.computedAt).toLocaleString()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

function CorroborationBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";

  const label = score >= 70 ? "Strong" : score >= 40 ? "Moderate" : "Weak";

  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", color)}>
      {label} ({score})
    </span>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="text-center">
      <span className="text-lg font-bold">{value}</span>
      <span className="ml-0.5 text-[10px] opacity-60">{icon}</span>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  suffix = "",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 text-center dark:bg-slate-800/50">
      <div className="mb-1 flex justify-center">{icon}</div>
      <p className="text-lg font-bold">
        {value}
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DensityRing({ label, value }: { label: string; value: number }) {
  const size = Math.min(value * 3, 100);
  const color =
    value >= 5
      ? "bg-red-500/20 border-red-500/50"
      : value >= 2
        ? "bg-amber-500/20 border-amber-500/50"
        : value >= 1
          ? "bg-blue-500/20 border-blue-500/50"
          : "bg-slate-500/10 border-slate-500/20";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-all",
          color
        )}
        style={{
          width: `${Math.max(size, 32)}px`,
          height: `${Math.max(size, 32)}px`,
        }}
      >
        <span className="text-xs font-bold">{value}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function ClusterCard({
  cluster,
  expanded,
  onToggle,
}: {
  cluster: StormCluster;
  expanded: boolean;
  onToggle: () => void;
}) {
  const confColor: Record<string, string> = {
    high: "text-emerald-600",
    medium: "text-amber-600",
    low: "text-red-600",
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        onClick={onToggle}
        className="w-full p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 shrink-0 text-blue-500" />
            <div>
              <p className="text-xs font-semibold">
                {cluster.stormType} • {cluster.totalClaims} claims
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(cluster.stormDate).toLocaleDateString()} • {cluster.radiusMiles} mi radius
                •{" "}
                <span className={confColor[cluster.confidenceLevel]}>
                  {cluster.confidenceLevel} confidence
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {cluster.verifiedClaims} verified
            </Badge>
            {cluster.avgHailSize && (
              <Badge variant="outline" className="text-[10px]">
                {cluster.avgHailSize}&quot; hail
              </Badge>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="space-y-1.5 border-t bg-slate-50/50 px-3 pb-3 dark:bg-slate-800/20">
          {cluster.members.slice(0, 8).map((member) => (
            <div
              key={member.claimId}
              className="flex items-center justify-between border-b border-slate-100 py-1 text-[11px] last:border-0 dark:border-slate-800"
            >
              <div className="flex items-center gap-1.5">
                {member.verificationLevel === "confirmed" && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                )}
                {member.verificationLevel === "likely" && (
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                )}
                {member.verificationLevel === "unverified" && (
                  <XCircle className="h-3 w-3 text-slate-400" />
                )}
                <span className="max-w-[200px] truncate">{member.address}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground">{member.distanceMiles.toFixed(1)} mi</span>
                <Badge variant="outline" className="text-[9px]">
                  {member.damageType}
                </Badge>
              </div>
            </div>
          ))}
          {cluster.members.length > 8 && (
            <p className="pt-1 text-center text-[10px] text-muted-foreground">
              +{cluster.members.length - 8} more claims
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ entry }: { entry: StormTimelineEntry }) {
  const iconMap: Record<string, React.ReactNode> = {
    storm_detected: <Cloud className="h-3 w-3 text-blue-500" />,
    first_impact: <AlertCircle className="h-3 w-3 text-red-500" />,
    claim_filed: <MapPin className="h-3 w-3 text-amber-500" />,
    claim_verified: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
    cluster_formed: <Users className="h-3 w-3 text-purple-500" />,
  };

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">
        {iconMap[entry.type] || <MapPin className="h-3 w-3 text-slate-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs">{entry.description}</p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(entry.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
