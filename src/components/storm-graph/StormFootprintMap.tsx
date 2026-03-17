"use client";

/**
 * StormFootprintMap — Phase 3.3
 *
 * Renders a visual representation of the storm damage footprint using
 * SVG circles and positioning based on relative geographic coordinates.
 * Shows claim clusters, damage density, and the subject property.
 *
 * Works without external map libraries — pure CSS/SVG based.
 * Can be upgraded to Mapbox/Leaflet later.
 */

import { Globe, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  totalClaims: number;
  verifiedClaims: number;
  confidenceLevel: string;
  members: ClusterMember[];
}

interface GeographicDensity {
  radiusMile1: number;
  radiusMile3: number;
  radiusMile5: number;
  radiusMile10: number;
  hotspotCenter: { latitude: number; longitude: number } | null;
  hotspotRadiusMiles: number;
}

interface GraphData {
  stormClusters: StormCluster[];
  geographicDensity: GeographicDensity;
  nearbyVerifiedDamage: number;
  corroborationScore: number;
}

interface StormFootprintMapProps {
  claimId: string;
  className?: string;
}

export function StormFootprintMap({ claimId, className }: StormFootprintMapProps) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/claims/${claimId}/storm-graph`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
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
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("border-red-200/50", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <XCircle className="h-5 w-5 text-red-500" />
        </CardContent>
      </Card>
    );
  }

  // Collect all member points across clusters for the SVG map
  const allMembers = data.stormClusters.flatMap((c) => c.members);
  if (allMembers.length === 0) {
    return (
      <Card className={cn("border-slate-200/50 dark:border-slate-700/50", className)}>
        <CardContent className="py-10 text-center">
          <Globe className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-xs text-muted-foreground">No nearby claims to map</p>
        </CardContent>
      </Card>
    );
  }

  // Map member distance to polar positions (simplified radial layout)
  const maxDist = Math.max(...allMembers.map((m) => m.distanceMiles), 1);
  const svgSize = 320;
  const center = svgSize / 2;
  const maxRadius = svgSize / 2 - 24;

  // Generate positions using golden angle for even distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return (
    <Card className={cn("border-blue-200/50 dark:border-blue-800/50", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Globe className="h-4 w-4 text-blue-500" />
            Storm Damage Footprint
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {allMembers.length} claims
            </Badge>
            <Badge
              variant={data.nearbyVerifiedDamage >= 3 ? "default" : "outline"}
              className="text-[10px]"
            >
              {data.nearbyVerifiedDamage} verified
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative flex justify-center">
          <svg
            width={svgSize}
            height={svgSize}
            viewBox={`0 0 ${svgSize} ${svgSize}`}
            className="overflow-visible"
          >
            {/* Distance rings */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <circle
                key={ratio}
                cx={center}
                cy={center}
                r={maxRadius * ratio}
                fill="none"
                strokeWidth={0.5}
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeDasharray={ratio < 1 ? "4,4" : undefined}
              />
            ))}

            {/* Distance labels */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <text
                key={`label-${ratio}`}
                x={center + maxRadius * ratio + 2}
                y={center - 2}
                fontSize={8}
                className="fill-slate-400 dark:fill-slate-500"
              >
                {(maxDist * ratio).toFixed(1)}mi
              </text>
            ))}

            {/* Cluster radius indicators */}
            {data.stormClusters.map((cluster, i) => {
              const clusterRadius = (cluster.radiusMiles / maxDist) * maxRadius;
              return (
                <circle
                  key={`cluster-${i}`}
                  cx={center}
                  cy={center}
                  r={Math.min(clusterRadius, maxRadius)}
                  fill="none"
                  strokeWidth={1.5}
                  className="stroke-blue-300/50 dark:stroke-blue-700/50"
                  strokeDasharray="6,4"
                />
              );
            })}

            {/* Member dots */}
            {allMembers.map((member, i) => {
              const dist = (member.distanceMiles / maxDist) * maxRadius;
              const angle = i * goldenAngle;
              const x = center + dist * Math.cos(angle);
              const y = center + dist * Math.sin(angle);

              const fillColor =
                member.verificationLevel === "confirmed"
                  ? "#10b981"
                  : member.verificationLevel === "likely"
                    ? "#f59e0b"
                    : "#94a3b8";

              const isHovered = hoveredMember === member.claimId;

              return (
                <g key={member.claimId}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 7 : 5}
                    fill={fillColor}
                    opacity={isHovered ? 1 : 0.8}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredMember(member.claimId)}
                    onMouseLeave={() => setHoveredMember(null)}
                  />
                  {isHovered && (
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      fontSize={9}
                      className="fill-foreground font-medium"
                    >
                      {member.distanceMiles.toFixed(1)}mi — {member.damageType}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Center — Subject property */}
            <circle
              cx={center}
              cy={center}
              r={8}
              className="fill-indigo-500 stroke-white dark:stroke-slate-900"
              strokeWidth={2}
            />
            <text
              x={center}
              y={center + 20}
              textAnchor="middle"
              fontSize={9}
              className="fill-indigo-600 font-semibold dark:fill-indigo-400"
            >
              Subject Property
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Verified
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
            Likely
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
            Unverified
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
            Subject
          </span>
        </div>

        {/* Density summary */}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            { label: "1 mi", value: data.geographicDensity.radiusMile1 },
            { label: "3 mi", value: data.geographicDensity.radiusMile3 },
            { label: "5 mi", value: data.geographicDensity.radiusMile5 },
            { label: "10 mi", value: data.geographicDensity.radiusMile10 },
          ].map((ring) => (
            <div key={ring.label} className="rounded bg-slate-50 p-1.5 dark:bg-slate-800/50">
              <p className="text-sm font-bold">{ring.value}</p>
              <p className="text-[9px] text-muted-foreground">{ring.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
