/**
 * Test Cuts & Invasive Testing — Section Renderer
 *
 * Provides structured data entry and display for test cut / core sample
 * documentation in claims packets. Used by the SectionRegistry and
 * ClaimsReadyFolder pages.
 *
 * Data shape matches `src/lib/ai/reportPrompts.ts` → testCuts[]
 */

"use client";

import { Droplets, MapPin, Plus, Ruler, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TestCutEntry {
  id: string;
  location: string;
  elevation: string; // North, South, East, West, Flat
  testType: "core_sample" | "moisture_reading" | "pull_test" | "invasive_opening" | "measurement";
  finding: string;
  moistureLevel?: number; // percentage 0-100
  measurements?: string; // e.g. "4.5 inches of deterioration"
  photoIds?: string[]; // references to photo evidence
  notes?: string;
  timestamp?: string;
}

export interface TestCutsSectionData {
  entries: TestCutEntry[];
  overallConclusion?: string;
  recommendedAction?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TEST_TYPES = [
  { value: "core_sample", label: "Core Sample", icon: "🔬" },
  { value: "moisture_reading", label: "Moisture Reading", icon: "💧" },
  { value: "pull_test", label: "Pull / Adhesion Test", icon: "🔩" },
  { value: "invasive_opening", label: "Invasive Opening", icon: "🔍" },
  { value: "measurement", label: "Measurement / Depth", icon: "📏" },
];

const ELEVATIONS = [
  "North",
  "South",
  "East",
  "West",
  "Front",
  "Rear",
  "Flat/Low-Slope",
  "Interior",
];

function getMoistureColor(level: number): string {
  if (level < 15) return "text-green-600";
  if (level < 25) return "text-yellow-600";
  return "text-red-600";
}

function getMoistureBadge(level: number): string {
  if (level < 15) return "bg-green-100 text-green-700";
  if (level < 25) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

// ─── Component ───────────────────────────────────────────────────────────────

interface TestCutsSectionProps {
  data: TestCutsSectionData;
  onChange: (data: TestCutsSectionData) => void;
  readOnly?: boolean;
}

export function TestCutsSection({ data, onChange, readOnly = false }: TestCutsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addEntry = () => {
    const newEntry: TestCutEntry = {
      id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      location: "",
      elevation: "North",
      testType: "core_sample",
      finding: "",
      moistureLevel: undefined,
      measurements: "",
      notes: "",
      timestamp: new Date().toISOString(),
    };
    onChange({
      ...data,
      entries: [...data.entries, newEntry],
    });
    setExpandedId(newEntry.id);
  };

  const updateEntry = (id: string, updates: Partial<TestCutEntry>) => {
    onChange({
      ...data,
      entries: data.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  };

  const removeEntry = (id: string) => {
    onChange({
      ...data,
      entries: data.entries.filter((e) => e.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Test Cuts &amp; Invasive Testing
          </h3>
          <p className="text-sm text-slate-500">
            Document core samples, moisture readings, and invasive test findings
          </p>
        </div>
        {!readOnly && (
          <Button onClick={addEntry} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Test Cut
          </Button>
        )}
      </div>

      {/* Summary stats */}
      {data.entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-0 bg-slate-50 shadow-sm dark:bg-slate-800/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.entries.length}</p>
              <p className="text-xs text-slate-500">Total Tests</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-slate-50 shadow-sm dark:bg-slate-800/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">
                {data.entries.filter((e) => e.testType === "moisture_reading").length}
              </p>
              <p className="text-xs text-slate-500">Moisture Readings</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-slate-50 shadow-sm dark:bg-slate-800/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">
                {data.entries.filter((e) => e.testType === "core_sample").length}
              </p>
              <p className="text-xs text-slate-500">Core Samples</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-slate-50 shadow-sm dark:bg-slate-800/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {data.entries.filter((e) => (e.moistureLevel ?? 0) >= 25).length}
              </p>
              <p className="text-xs text-slate-500">High Moisture</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Entries */}
      {data.entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <Ruler className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600 dark:text-slate-300">
              No test cuts documented yet
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Add core samples, moisture readings, and invasive test results.
            </p>
            {!readOnly && (
              <Button onClick={addEntry} size="sm" className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" />
                Add First Test Cut
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.entries.map((entry, idx) => {
            const isExpanded = expandedId === entry.id;
            const testTypeCfg = TEST_TYPES.find((t) => t.value === entry.testType);

            return (
              <Card key={entry.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{testTypeCfg?.icon || "📋"}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        #{idx + 1} — {testTypeCfg?.label || entry.testType}
                      </p>
                      <p className="text-xs text-slate-500">
                        {entry.elevation} {entry.location ? `• ${entry.location}` : ""}
                        {entry.moistureLevel !== undefined && (
                          <span className={getMoistureColor(entry.moistureLevel)}>
                            {" "}
                            • {entry.moistureLevel}% moisture
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.moistureLevel !== undefined && (
                      <Badge className={getMoistureBadge(entry.moistureLevel)}>
                        <Droplets className="mr-1 h-3 w-3" />
                        {entry.moistureLevel}%
                      </Badge>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t bg-slate-50/50 p-4 dark:bg-slate-900/30">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div>
                          <Label>Test Type</Label>
                          <Select
                            value={entry.testType}
                            onValueChange={(v) =>
                              updateEntry(entry.id, { testType: v as TestCutEntry["testType"] })
                            }
                            disabled={readOnly}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TEST_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.icon} {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Elevation</Label>
                          <Select
                            value={entry.elevation}
                            onValueChange={(v) => updateEntry(entry.id, { elevation: v })}
                            disabled={readOnly}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ELEVATIONS.map((e) => (
                                <SelectItem key={e} value={e}>
                                  {e}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Moisture Level (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={entry.moistureLevel ?? ""}
                            onChange={(e) =>
                              updateEntry(entry.id, {
                                moistureLevel: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            placeholder="e.g. 28"
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>
                          <MapPin className="mr-1 inline h-3 w-3" />
                          Specific Location
                        </Label>
                        <Input
                          value={entry.location}
                          onChange={(e) => updateEntry(entry.id, { location: e.target.value })}
                          placeholder="e.g. 3ft from eave, above bathroom"
                          disabled={readOnly}
                        />
                      </div>

                      <div>
                        <Label>Finding / Result</Label>
                        <Textarea
                          value={entry.finding}
                          onChange={(e) => updateEntry(entry.id, { finding: e.target.value })}
                          placeholder="Describe what was found — deteriorated underlayment, wet decking, granule loss to mat, etc."
                          rows={3}
                          disabled={readOnly}
                        />
                      </div>

                      <div>
                        <Label>Measurements</Label>
                        <Input
                          value={entry.measurements || ""}
                          onChange={(e) => updateEntry(entry.id, { measurements: e.target.value })}
                          placeholder="e.g. 4.5 in deterioration, 3/8 in deck rot"
                          disabled={readOnly}
                        />
                      </div>

                      <div>
                        <Label>Additional Notes</Label>
                        <Textarea
                          value={entry.notes || ""}
                          onChange={(e) => updateEntry(entry.id, { notes: e.target.value })}
                          placeholder="Any additional observations..."
                          rows={2}
                          disabled={readOnly}
                        />
                      </div>

                      {!readOnly && (
                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeEntry(entry.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Overall Conclusion */}
      {data.entries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Overall Conclusion</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.overallConclusion || ""}
              onChange={(e) => onChange({ ...data, overallConclusion: e.target.value })}
              placeholder="Summarize the overall findings from test cuts and invasive testing..."
              rows={3}
              disabled={readOnly}
            />
            <div className="mt-3">
              <Label>Recommended Action</Label>
              <Select
                value={data.recommendedAction || ""}
                onValueChange={(v) => onChange({ ...data, recommendedAction: v })}
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recommendation..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_replacement">Full Replacement Required</SelectItem>
                  <SelectItem value="partial_replacement">Partial Replacement</SelectItem>
                  <SelectItem value="repair_only">Repair Only</SelectItem>
                  <SelectItem value="further_investigation">
                    Further Investigation Needed
                  </SelectItem>
                  <SelectItem value="no_action">No Action Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TestCutsSection;
