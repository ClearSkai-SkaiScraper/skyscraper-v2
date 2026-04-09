"use client";

import { ArrowLeft, Eye, MapPin, Plus, Save, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
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

interface ServiceArea {
  id: string;
  type: "zip" | "county" | "city";
  value: string;
  radius?: number;
  state: string;
}

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export default function SettingsServiceAreasPage() {
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [newArea, setNewArea] = useState({
    type: "zip" as "zip" | "county" | "city",
    value: "",
    radius: 25,
    state: "AZ",
  });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const addArea = () => {
    if (!newArea.value.trim()) {
      toast.error("Please enter a value");
      return;
    }
    const area: ServiceArea = {
      id: crypto.randomUUID(),
      type: newArea.type,
      value: newArea.value.trim(),
      radius: newArea.type === "zip" ? newArea.radius : undefined,
      state: newArea.state,
    };
    setAreas((prev) => [...prev, area]);
    setNewArea((prev) => ({ ...prev, value: "" }));
    toast.success(`Added ${area.type}: ${area.value}`);
  };

  const removeArea = (id: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/service-areas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areas }),
      });
      if (res.ok) {
        toast.success("Service areas saved!");
      } else {
        toast.error("Failed to save service areas");
      }
    } catch {
      toast.error("Failed to save service areas");
    } finally {
      setSaving(false);
    }
  };

  const filteredAreas = areas.filter(
    (a) =>
      a.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold">
                <MapPin className="h-6 w-6 text-primary" />
                Service Areas
              </h1>
              <p className="text-muted-foreground">
                Define the geographic areas your company services for storm restoration jobs.
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Preview Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">Preview Mode</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Service area management is currently in preview. Area configurations will be saved
                to your account in an upcoming release.
              </p>
            </div>
          </div>
        </div>

        {/* Add New Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Service Area
            </CardTitle>
            <CardDescription>
              Add ZIP codes, counties, or cities where your company operates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-end gap-4 md:flex-row">
              <div className="w-full space-y-2 md:w-36">
                <Label>Type</Label>
                <Select
                  value={newArea.type}
                  onValueChange={(v) =>
                    setNewArea((prev) => ({ ...prev, type: v as "zip" | "county" | "city" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP Code</SelectItem>
                    <SelectItem value="county">County</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>
                  {newArea.type === "zip"
                    ? "ZIP Code"
                    : newArea.type === "county"
                      ? "County Name"
                      : "City Name"}
                </Label>
                <Input
                  placeholder={
                    newArea.type === "zip"
                      ? "e.g. 86001"
                      : newArea.type === "county"
                        ? "e.g. Coconino County"
                        : "e.g. Flagstaff"
                  }
                  value={newArea.value}
                  onChange={(e) => setNewArea((prev) => ({ ...prev, value: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addArea()}
                />
              </div>
              <div className="w-full space-y-2 md:w-28">
                <Label>State</Label>
                <Select
                  value={newArea.state}
                  onValueChange={(v) => setNewArea((prev) => ({ ...prev, state: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newArea.type === "zip" && (
                <div className="w-full space-y-2 md:w-36">
                  <Label>Radius (mi)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={newArea.radius}
                    onChange={(e) =>
                      setNewArea((prev) => ({ ...prev, radius: parseInt(e.target.value) || 25 }))
                    }
                  />
                </div>
              )}
              <Button onClick={addArea} className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Service Areas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Service Areas</CardTitle>
                <CardDescription>
                  {areas.length} area{areas.length !== 1 ? "s" : ""} configured
                </CardDescription>
              </div>
              {areas.length > 0 && (
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter areas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {areas.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MapPin className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="font-medium">No service areas defined</p>
                <p className="text-sm">Add ZIP codes, counties, or cities above to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAreas.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          area.type === "zip"
                            ? "default"
                            : area.type === "county"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {area.type.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{area.value}</span>
                      <span className="text-muted-foreground">{area.state}</span>
                      {area.radius && (
                        <span className="text-sm text-muted-foreground">
                          ({area.radius} mi radius)
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArea(area.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coverage Summary */}
        {areas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Coverage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">
                    {areas.filter((a) => a.type === "zip").length}
                  </p>
                  <p className="text-sm text-muted-foreground">ZIP Codes</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">
                    {areas.filter((a) => a.type === "county").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Counties</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">
                    {areas.filter((a) => a.type === "city").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Cities</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">
                    {[...new Set(areas.map((a) => a.state))].length}
                  </p>
                  <p className="text-sm text-muted-foreground">States</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
