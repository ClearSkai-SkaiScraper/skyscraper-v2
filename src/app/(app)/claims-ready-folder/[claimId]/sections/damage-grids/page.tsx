// src/app/(app)/claims-ready-folder/[claimId]/sections/damage-grids/page.tsx
"use client";

import { Compass, Grid3X3, MapPin, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface ElevationDamage {
  direction: "north" | "east" | "south" | "west";
  hitCount: number;
  damagePercentage: number;
  brittleTestResult: "pass" | "fail" | "not-tested";
  creasePatterns: boolean;
  mechanicalDamage: boolean;
}

interface DamageGridData {
  elevations: ElevationDamage[];
  totalAffectedArea: number;
  damagePattern: "random" | "directional" | "concentrated";
}

const DIRECTION_COLORS = {
  north: "bg-blue-500",
  east: "bg-amber-500",
  south: "bg-red-500",
  west: "bg-green-500",
};

export default function DamageGridsPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<DamageGridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/damage-grids?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(
          json.data || {
            elevations: [
              {
                direction: "north",
                hitCount: 0,
                damagePercentage: 0,
                brittleTestResult: "not-tested",
                creasePatterns: false,
                mechanicalDamage: false,
              },
              {
                direction: "east",
                hitCount: 0,
                damagePercentage: 0,
                brittleTestResult: "not-tested",
                creasePatterns: false,
                mechanicalDamage: false,
              },
              {
                direction: "south",
                hitCount: 0,
                damagePercentage: 0,
                brittleTestResult: "not-tested",
                creasePatterns: false,
                mechanicalDamage: false,
              },
              {
                direction: "west",
                hitCount: 0,
                damagePercentage: 0,
                brittleTestResult: "not-tested",
                creasePatterns: false,
                mechanicalDamage: false,
              },
            ],
            totalAffectedArea: 0,
            damagePattern: "random",
          }
        );
      }
    } catch (err) {
      logger.error("Failed to fetch damage grid data:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!data || !claimId) return;
    setSaving(true);
    try {
      await fetch(`/api/claims-folder/sections/damage-grids`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, data }),
      });
    } catch (err) {
      logger.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateElevation = (index: number, field: keyof ElevationDamage, value: any) => {
    setData((prev) => {
      if (!prev) return null;
      const newElevations = [...prev.elevations];
      newElevations[index] = { ...newElevations[index], [field]: value };
      return { ...prev, elevations: newElevations };
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const avgDamage = data?.elevations.reduce((sum, e) => sum + e.damagePercentage, 0) || 0;
  const avgDamagePercent = data?.elevations.length
    ? Math.round(avgDamage / data.elevations.length)
    : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold">Elevation & Damage Grids</h1>
          </div>
          <p className="text-slate-500">Damage mapping by direction and test square results</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 6 of 17</Badge>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Visual Compass Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Damage Distribution
          </CardTitle>
          <CardDescription>Visual representation of damage by elevation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mx-auto aspect-square max-w-md">
            {/* Center */}
            <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-center dark:bg-slate-800">
              <div>
                <div className="text-2xl font-bold">{avgDamagePercent}%</div>
                <div className="text-xs text-slate-500">Avg Damage</div>
              </div>
            </div>

            {/* North */}
            <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
              <Badge className={DIRECTION_COLORS.north}>N</Badge>
              <div className="mt-2 text-center">
                <div className="text-lg font-bold">
                  {data?.elevations[0]?.damagePercentage || 0}%
                </div>
                <div className="text-xs text-slate-500">
                  {data?.elevations[0]?.hitCount || 0} hits
                </div>
              </div>
            </div>

            {/* East */}
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col items-center">
              <Badge className={DIRECTION_COLORS.east}>E</Badge>
              <div className="mt-2 text-center">
                <div className="text-lg font-bold">
                  {data?.elevations[1]?.damagePercentage || 0}%
                </div>
                <div className="text-xs text-slate-500">
                  {data?.elevations[1]?.hitCount || 0} hits
                </div>
              </div>
            </div>

            {/* South */}
            <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <div className="mb-2 text-center">
                <div className="text-lg font-bold">
                  {data?.elevations[2]?.damagePercentage || 0}%
                </div>
                <div className="text-xs text-slate-500">
                  {data?.elevations[2]?.hitCount || 0} hits
                </div>
              </div>
              <Badge className={DIRECTION_COLORS.south}>S</Badge>
            </div>

            {/* West */}
            <div className="absolute left-0 top-1/2 flex -translate-y-1/2 flex-col items-center">
              <Badge className={DIRECTION_COLORS.west}>W</Badge>
              <div className="mt-2 text-center">
                <div className="text-lg font-bold">
                  {data?.elevations[3]?.damagePercentage || 0}%
                </div>
                <div className="text-xs text-slate-500">
                  {data?.elevations[3]?.hitCount || 0} hits
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Elevation Details */}
      {data?.elevations.map((elevation, index) => (
        <Card key={elevation.direction}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded-full ${DIRECTION_COLORS[elevation.direction]}`} />
              {elevation.direction.charAt(0).toUpperCase() + elevation.direction.slice(1)} Elevation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Hit Count</Label>
                <Input
                  type="number"
                  value={elevation.hitCount}
                  onChange={(e) =>
                    updateElevation(index, "hitCount", parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Damage Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={elevation.damagePercentage}
                    onChange={(e) =>
                      updateElevation(index, "damagePercentage", parseInt(e.target.value) || 0)
                    }
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
                <Progress value={elevation.damagePercentage} className="h-2" />
              </div>
              <div className="space-y-2">
                <Label>Brittle Test Result</Label>
                <Select
                  value={elevation.brittleTestResult}
                  onValueChange={(value) => updateElevation(index, "brittleTestResult", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not-tested">Not Tested</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary */}
      <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-600" />
            Damage Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Total Affected Area (sq ft)</Label>
              <Input
                type="number"
                value={data?.totalAffectedArea || 0}
                onChange={(e) =>
                  setData((prev) =>
                    prev ? { ...prev, totalAffectedArea: parseInt(e.target.value) || 0 } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Damage Pattern</Label>
              <Select
                value={data?.damagePattern || "random"}
                onValueChange={(value) =>
                  setData((prev) =>
                    prev
                      ? { ...prev, damagePattern: value as DamageGridData["damagePattern"] }
                      : null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="directional">Directional</SelectItem>
                  <SelectItem value="concentrated">Concentrated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
