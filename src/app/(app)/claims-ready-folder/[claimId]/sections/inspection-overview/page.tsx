// src/app/(app)/claims-ready-folder/[claimId]/sections/inspection-overview/page.tsx
"use client";

import { Building2, Calendar, ClipboardCheck, Layers, Ruler, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  CONDITION_OPTIONS,
  MATERIAL_OPTIONS,
  PITCH_OPTIONS,
  type RoofCondition,
} from "@/lib/constants/roofing";
import { logger } from "@/lib/logger";

interface InspectionData {
  inspectionDate: string;
  inspectorName: string;
  roofType: string;
  roofPitch: string;
  estimatedAge: number;
  layers: number;
  slopeCount: number;
  softMetalsPresent: boolean;
  overallCondition: RoofCondition;
  accessPoints: string[];
  accessoriesImpacted: string[];
  notes: string;
}

export default function InspectionOverviewPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [data, setData] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/inspection-overview?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      logger.error("Failed to fetch inspection data:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!data || !claimId) return;
    setSaving(true);
    try {
      await fetch(`/api/claims-folder/sections/inspection-overview`, {
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

  const updateField = <K extends keyof InspectionData>(field: K, value: InspectionData[K]) => {
    setData((prev) => (prev ? { ...prev, [field]: value } : null));
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
            <ClipboardCheck className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold">Inspection Overview</h1>
          </div>
          <p className="text-slate-500">Roof type, pitch, age, and condition assessment</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 5 of 17</Badge>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Building2 className="mb-2 h-5 w-5 text-blue-600" />
            <div className="text-lg font-bold capitalize">{data?.roofType || "—"}</div>
            <div className="text-sm text-slate-500">Roof Type</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Ruler className="mb-2 h-5 w-5 text-purple-600" />
            <div className="text-lg font-bold">{data?.roofPitch || "—"}</div>
            <div className="text-sm text-slate-500">Pitch</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Calendar className="mb-2 h-5 w-5 text-amber-600" />
            <div className="text-lg font-bold">
              {data?.estimatedAge ? `${data.estimatedAge} yrs` : "—"}
            </div>
            <div className="text-sm text-slate-500">Est. Age</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Layers className="mb-2 h-5 w-5 text-green-600" />
            <div className="text-lg font-bold">{data?.layers || "—"}</div>
            <div className="text-sm text-slate-500">Layers</div>
          </CardContent>
        </Card>
      </div>

      {/* Inspection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
          <CardDescription>Basic inspection information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="inspectionDate">Inspection Date</Label>
              <Input
                id="inspectionDate"
                type="date"
                value={
                  data?.inspectionDate
                    ? new Date(data.inspectionDate).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => updateField("inspectionDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inspectorName">Inspector Name</Label>
              <Input
                id="inspectorName"
                value={data?.inspectorName || ""}
                onChange={(e) => updateField("inspectorName", e.target.value)}
                placeholder="Inspector name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roof Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Roof Specifications</CardTitle>
          <CardDescription>Physical characteristics of the roof system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="roofType">Roof Type</Label>
              <Select
                value={data?.roofType || ""}
                onValueChange={(value) => updateField("roofType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roofPitch">Roof Pitch</Label>
              <Select
                value={data?.roofPitch || ""}
                onValueChange={(value) => updateField("roofPitch", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pitch" />
                </SelectTrigger>
                <SelectContent>
                  {PITCH_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedAge">Estimated Age (years)</Label>
              <Input
                id="estimatedAge"
                type="number"
                value={data?.estimatedAge || ""}
                onChange={(e) => updateField("estimatedAge", parseInt(e.target.value) || 0)}
                placeholder="15"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="layers">Number of Layers</Label>
              <Select
                value={data?.layers?.toString() || ""}
                onValueChange={(value) => updateField("layers", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select layers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Layer</SelectItem>
                  <SelectItem value="2">2 Layers</SelectItem>
                  <SelectItem value="3">3+ Layers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slopeCount">Number of Slopes</Label>
              <Input
                id="slopeCount"
                type="number"
                value={data?.slopeCount || ""}
                onChange={(e) => updateField("slopeCount", parseInt(e.target.value) || 0)}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overallCondition">Overall Condition</Label>
              <Select
                value={data?.overallCondition || ""}
                onValueChange={(value) =>
                  updateField("overallCondition", value as InspectionData["overallCondition"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Inspection Notes</CardTitle>
          <CardDescription>Additional observations and details</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data?.notes || ""}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={6}
            placeholder="Enter inspection notes, observations, access conditions, etc."
          />
        </CardContent>
      </Card>
    </div>
  );
}
