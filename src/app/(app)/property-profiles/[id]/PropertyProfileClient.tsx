"use client";
/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle,
  Cloud,
  CloudRain,
  Edit2,
  FileText,
  Home,
  Loader2,
  Save,
  Sparkles,
  TrendingUp,
  Wrench,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface WeatherEvent {
  id: string;
  date: string;
  type: string;
  severity: string;
  hailSize?: number;
  windSpeed?: number;
}

interface PropertyProfileClientProps {
  propertyId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialProperty: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialHealthScore: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialDigitalTwins: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialInspections: any[];
}

export default function PropertyProfileClient({
  propertyId,
  initialProperty,
  initialHealthScore,
  initialDigitalTwins,
  initialInspections,
}: PropertyProfileClientProps) {
  const [property, setProperty] = useState(initialProperty);
  const [healthScore, setHealthScore] = useState(initialHealthScore);
  const [digitalTwins] = useState(initialDigitalTwins);
  const [inspections] = useState(initialInspections);
  const [calculating, setCalculating] = useState(false);
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofillSuggestions, setAutofillSuggestions] = useState<Record<string, unknown>>({});
  const [autofillConfidence, setAutofillConfidence] = useState<Record<string, string>>({});
  const [autofillReasoning, setAutofillReasoning] = useState("");
  const [_acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const [editForm, setEditForm] = useState({
    // Structure
    yearBuilt: initialProperty.yearBuilt || "",
    squareFootage: initialProperty.squareFootage || "",
    lotSize: initialProperty.lotSize || "",
    numBedrooms: initialProperty.numBedrooms || "",
    numBathrooms: initialProperty.numBathrooms || "",
    numStories: initialProperty.numStories || "",
    garageSpaces: initialProperty.garageSpaces || "",
    // Roof
    roofType: initialProperty.roofType || "",
    roofAge: initialProperty.roofAge || "",
    roofSquares: initialProperty.roofSquares || "",
    roofPitch: initialProperty.roofPitch || "",
    roofColor: initialProperty.roofColor || "",
    // HVAC
    hvacType: initialProperty.hvacType || "",
    hvacAge: initialProperty.hvacAge || "",
    hvacManufacturer: initialProperty.hvacManufacturer || "",
    hvacModel: initialProperty.hvacModel || "",
    hvacTonnage: initialProperty.hvacTonnage || "",
    // Water Heater
    waterHeaterType: initialProperty.waterHeaterType || "",
    waterHeaterAge: initialProperty.waterHeaterAge || "",
    waterHeaterGallons: initialProperty.waterHeaterGallons || "",
    waterHeaterFuel: initialProperty.waterHeaterFuel || "",
    // Plumbing & Electrical
    plumbingType: initialProperty.plumbingType || "",
    plumbingAge: initialProperty.plumbingAge || "",
    sewerType: initialProperty.sewerType || "",
    waterSource: initialProperty.waterSource || "",
    electricalPanelType: initialProperty.electricalPanelType || "",
    electricalPanelAge: initialProperty.electricalPanelAge || "",
    wiringType: initialProperty.wiringType || "",
    // Foundation
    foundationType: initialProperty.foundationType || "",
    foundationAge: initialProperty.foundationAge || "",
    // Features
    hasGeneratorHookup: initialProperty.hasGeneratorHookup || false,
    hasSmartHome: initialProperty.hasSmartHome || false,
    hasLowEWindows: initialProperty.hasLowEWindows || false,
    hasSolarPanels: initialProperty.hasSolarPanels || false,
    insulationRating: initialProperty.insulationRating || "",
    windowType: initialProperty.windowType || "",
    // Location / Risk
    floodZone: initialProperty.floodZone || "",
    county: initialProperty.county || "",
  });

  // Fetch weather history for this property
  const fetchWeatherHistory = useCallback(async () => {
    setLoadingWeather(true);
    try {
      const location = `${property.city}, ${property.state}`;
      const res = await fetch(
        `/api/weather/property-history?location=${encodeURIComponent(location)}&propertyId=${propertyId}`
      );
      if (res.ok) {
        const data = await res.json();
        setWeatherEvents(data.events || []);
      }
    } catch (error) {
      logger.error("Failed to fetch weather history:", error);
    } finally {
      setLoadingWeather(false);
    }
  }, [property.city, property.state, propertyId]);

  useEffect(() => {
    void fetchWeatherHistory();
  }, [fetchWeatherHistory]);

  const calculateHealthScore = async () => {
    setCalculating(true);
    try {
      const res = await fetch(`/api/v1/property-profiles/${propertyId}/health-score`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setHealthScore(data.healthScore);
      }
    } catch (error) {
      logger.error("Failed to calculate health score:", error);
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveProperty = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/property-profiles/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        setProperty({ ...property, ...data.property });
        setEditing(false);
        setAutofillSuggestions({});
        setAcceptedFields(new Set());
      } else {
        logger.error("Failed to save property:", res.status);
      }
    } catch (error) {
      logger.error("Failed to save property:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAutofill = async () => {
    setAutofilling(true);
    try {
      const res = await fetch(`/api/v1/property-profiles/${propertyId}/autofill`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.suggestions) {
          setAutofillSuggestions(data.suggestions);
          setAutofillConfidence(data.confidence || {});
          setAutofillReasoning(data.reasoning || "");
        }
      }
    } catch (error) {
      logger.error("Failed to autofill:", error);
    } finally {
      setAutofilling(false);
    }
  };

  const acceptSuggestion = (field: string) => {
    const val = autofillSuggestions[field];
    setEditForm((prev) => ({ ...prev, [field]: val }));
    setAcceptedFields((prev) => new Set([...prev, field]));
    setAutofillSuggestions((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const rejectSuggestion = (field: string) => {
    setAutofillSuggestions((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const acceptAllSuggestions = () => {
    const updates: Record<string, unknown> = {};
    for (const [field, val] of Object.entries(autofillSuggestions)) {
      updates[field] = val;
    }
    setEditForm((prev) => ({ ...prev, ...updates }));
    setAcceptedFields((prev) => new Set([...prev, ...Object.keys(autofillSuggestions)]));
    setAutofillSuggestions({});
  };

  const riskScore = property.insuranceRiskScore || 0;
  const riskLevel =
    riskScore >= 80 ? "Critical" : riskScore >= 60 ? "High" : riskScore >= 40 ? "Moderate" : "Low";
  const riskColor = riskScore >= 60 ? "destructive" : riskScore >= 40 ? "warning" : "success";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/property-profiles">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{property.streetAddress}</h1>
            <p className="text-muted-foreground">
              {property.city}, {property.state} {property.zipCode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/field?propertyId=${propertyId}&address=${encodeURIComponent(property.streetAddress || property.fullAddress || "")}`}
          >
            <Button variant="outline" className="gap-2">
              <Camera className="h-4 w-4" />
              AI Inspection
            </Button>
          </Link>
          <Button
            onClick={() => setEditing(!editing)}
            variant={editing ? "destructive" : "default"}
            className="gap-2"
          >
            {editing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
            {editing ? "Cancel" : "Edit Property"}
          </Button>
        </div>
      </div>

      {/* Health Score Card */}
      {healthScore ? (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Property Health Score</CardTitle>
                <CardDescription>
                  Last calculated {new Date(healthScore.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
              <Button
                onClick={calculateHealthScore}
                variant="outline"
                size="sm"
                disabled={calculating}
              >
                {calculating ? "Calculating..." : "Recalculate"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="flex flex-col items-center justify-center rounded-lg bg-muted p-4">
                <div
                  className={`text-5xl font-bold ${
                    healthScore.overallScore >= 80
                      ? "text-green-600"
                      : healthScore.overallScore >= 60
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {healthScore.overallScore}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Overall Score</div>
                <Badge className="mt-2">{healthScore.grade}</Badge>
              </div>
              <div className="col-span-3 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Roof Integrity</div>
                  <div className="text-2xl font-bold">{healthScore.roofIntegrityScore}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">HVAC Efficiency</div>
                  <div className="text-2xl font-bold">{healthScore.hvacEfficiencyScore}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">System Condition</div>
                  <div className="text-2xl font-bold">{healthScore.systemConditionScore}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Maintenance</div>
                  <div className="text-2xl font-bold">{healthScore.maintenanceScore}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Structural</div>
                  <div className="text-2xl font-bold">{healthScore.structuralRiskScore}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Age Score</div>
                  <div className="text-2xl font-bold">{healthScore.ageScore}</div>
                </div>
              </div>
            </div>
            {healthScore.criticalIssues && healthScore.criticalIssues.length > 0 && (
              <div className="mt-6 rounded-lg bg-destructive/10 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Critical Issues
                </h4>
                <ul className="space-y-1">
                  {healthScore.criticalIssues.map((issue: any, i: number) => (
                    <li key={i} className="text-sm">
                      • {issue.issue} - {issue.severity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Health Score Yet</h3>
            <p className="mb-4 text-muted-foreground">
              Calculate a comprehensive health score for this property
            </p>
            <Button onClick={calculateHealthScore} disabled={calculating}>
              {calculating ? "Calculating..." : "Calculate Health Score"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="digital-twins">Digital Twins</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Edit Form */}
          {editing && (
            <Card className="border-2 border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Edit2 className="h-5 w-5" />
                    Edit Property Details
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAutofill}
                      disabled={autofilling}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-950/30"
                    >
                      {autofilling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {autofilling ? "Scanning..." : "AI Autofill"}
                    </Button>
                    <Button
                      onClick={handleSaveProperty}
                      disabled={saving}
                      size="sm"
                      className="gap-2"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button onClick={() => setEditing(false)} variant="outline" size="sm">
                      <X className="mr-1 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Autofill suggestions banner */}
                {Object.keys(autofillSuggestions).length > 0 && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-4 dark:border-purple-800 dark:bg-purple-950/30">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="flex items-center gap-2 font-semibold text-purple-700 dark:text-purple-300">
                        <Sparkles className="h-4 w-4" />
                        AI Suggestions ({Object.keys(autofillSuggestions).length} fields)
                      </h4>
                      <Button
                        onClick={acceptAllSuggestions}
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                      >
                        <CheckCircle className="h-3 w-3" /> Accept All
                      </Button>
                    </div>
                    {autofillReasoning && (
                      <p className="mb-3 text-xs text-purple-600 dark:text-purple-400">
                        {autofillReasoning}
                      </p>
                    )}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(autofillSuggestions).map(([field, val]) => (
                        <div
                          key={field}
                          className="flex items-center justify-between rounded-md border border-purple-200 bg-white px-3 py-2 text-sm dark:border-purple-700 dark:bg-slate-900"
                        >
                          <div className="min-w-0">
                            <span className="font-medium">{field}</span>
                            <span className="ml-1 text-muted-foreground">= {String(val)}</span>
                            {autofillConfidence[field] && (
                              <Badge variant="outline" className="ml-1 text-[10px]">
                                {autofillConfidence[field]}
                              </Badge>
                            )}
                          </div>
                          <div className="ml-2 flex gap-1">
                            <button
                              onClick={() => acceptSuggestion(field)}
                              className="rounded p-0.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => rejectSuggestion(field)}
                              className="rounded p-0.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Structure ── */}
                <fieldset className="rounded-lg border p-4">
                  <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
                    <Home className="h-4 w-4" /> Structure
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Year Built</Label>
                      <Input
                        type="number"
                        value={editForm.yearBuilt}
                        onChange={(e) => setEditForm({ ...editForm, yearBuilt: e.target.value })}
                        placeholder="e.g. 2005"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Square Footage</Label>
                      <Input
                        type="number"
                        value={editForm.squareFootage}
                        onChange={(e) =>
                          setEditForm({ ...editForm, squareFootage: e.target.value })
                        }
                        placeholder="e.g. 2400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lot Size (sq ft)</Label>
                      <Input
                        type="number"
                        value={editForm.lotSize}
                        onChange={(e) => setEditForm({ ...editForm, lotSize: e.target.value })}
                        placeholder="e.g. 8500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stories</Label>
                      <Input
                        type="number"
                        value={editForm.numStories}
                        onChange={(e) => setEditForm({ ...editForm, numStories: e.target.value })}
                        placeholder="e.g. 2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bedrooms</Label>
                      <Input
                        type="number"
                        value={editForm.numBedrooms}
                        onChange={(e) => setEditForm({ ...editForm, numBedrooms: e.target.value })}
                        placeholder="e.g. 4"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bathrooms</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editForm.numBathrooms}
                        onChange={(e) => setEditForm({ ...editForm, numBathrooms: e.target.value })}
                        placeholder="e.g. 2.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Garage Spaces</Label>
                      <Input
                        type="number"
                        value={editForm.garageSpaces}
                        onChange={(e) => setEditForm({ ...editForm, garageSpaces: e.target.value })}
                        placeholder="e.g. 2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>County</Label>
                      <Input
                        value={editForm.county}
                        onChange={(e) => setEditForm({ ...editForm, county: e.target.value })}
                        placeholder="e.g. Maricopa"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── Roof ── */}
                <fieldset className="rounded-lg border p-4">
                  <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
                    🏠 Roof
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Roof Type</Label>
                      <Select
                        value={editForm.roofType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, roofType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asphalt Shingle">Asphalt Shingle</SelectItem>
                          <SelectItem value="Metal">Metal</SelectItem>
                          <SelectItem value="Tile">Tile</SelectItem>
                          <SelectItem value="Flat/TPO">Flat/TPO</SelectItem>
                          <SelectItem value="Slate">Slate</SelectItem>
                          <SelectItem value="Wood Shake">Wood Shake</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Roof Age (years)</Label>
                      <Input
                        type="number"
                        value={editForm.roofAge}
                        onChange={(e) => setEditForm({ ...editForm, roofAge: e.target.value })}
                        placeholder="e.g. 12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Roof Squares</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editForm.roofSquares}
                        onChange={(e) => setEditForm({ ...editForm, roofSquares: e.target.value })}
                        placeholder="e.g. 32.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Roof Pitch</Label>
                      <Input
                        value={editForm.roofPitch}
                        onChange={(e) => setEditForm({ ...editForm, roofPitch: e.target.value })}
                        placeholder="e.g. 6/12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Roof Color</Label>
                      <Input
                        value={editForm.roofColor}
                        onChange={(e) => setEditForm({ ...editForm, roofColor: e.target.value })}
                        placeholder="e.g. Charcoal"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── HVAC ── */}
                <fieldset className="rounded-lg border p-4">
                  <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
                    ❄️ HVAC
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>HVAC Type</Label>
                      <Select
                        value={editForm.hvacType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, hvacType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Central Air">Central Air</SelectItem>
                          <SelectItem value="Heat Pump">Heat Pump</SelectItem>
                          <SelectItem value="Mini-Split">Mini-Split</SelectItem>
                          <SelectItem value="Window Unit">Window Unit</SelectItem>
                          <SelectItem value="Geothermal">Geothermal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>HVAC Age (years)</Label>
                      <Input
                        type="number"
                        value={editForm.hvacAge}
                        onChange={(e) => setEditForm({ ...editForm, hvacAge: e.target.value })}
                        placeholder="e.g. 8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Manufacturer</Label>
                      <Input
                        value={editForm.hvacManufacturer}
                        onChange={(e) =>
                          setEditForm({ ...editForm, hvacManufacturer: e.target.value })
                        }
                        placeholder="e.g. Trane"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input
                        value={editForm.hvacModel}
                        onChange={(e) => setEditForm({ ...editForm, hvacModel: e.target.value })}
                        placeholder="e.g. XR15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tonnage</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={editForm.hvacTonnage}
                        onChange={(e) => setEditForm({ ...editForm, hvacTonnage: e.target.value })}
                        placeholder="e.g. 3.5"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── Water Heater ── */}
                <fieldset className="rounded-lg border p-4">
                  <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
                    🔥 Water Heater
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editForm.waterHeaterType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, waterHeaterType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tank">Tank</SelectItem>
                          <SelectItem value="Tankless">Tankless</SelectItem>
                          <SelectItem value="Heat Pump">Heat Pump</SelectItem>
                          <SelectItem value="Solar">Solar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Age (years)</Label>
                      <Input
                        type="number"
                        value={editForm.waterHeaterAge}
                        onChange={(e) =>
                          setEditForm({ ...editForm, waterHeaterAge: e.target.value })
                        }
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gallons</Label>
                      <Input
                        type="number"
                        value={editForm.waterHeaterGallons}
                        onChange={(e) =>
                          setEditForm({ ...editForm, waterHeaterGallons: e.target.value })
                        }
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fuel</Label>
                      <Select
                        value={editForm.waterHeaterFuel || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, waterHeaterFuel: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Electric">Electric</SelectItem>
                          <SelectItem value="Natural Gas">Natural Gas</SelectItem>
                          <SelectItem value="Propane">Propane</SelectItem>
                          <SelectItem value="Solar">Solar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </fieldset>

                {/* ── Plumbing & Electrical ── */}
                <fieldset className="rounded-lg border p-4">
                  <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
                    <Zap className="h-4 w-4" /> Plumbing & Electrical
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Plumbing Type</Label>
                      <Select
                        value={editForm.plumbingType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, plumbingType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Copper">Copper</SelectItem>
                          <SelectItem value="PEX">PEX</SelectItem>
                          <SelectItem value="PVC">PVC</SelectItem>
                          <SelectItem value="Galvanized">Galvanized</SelectItem>
                          <SelectItem value="Cast Iron">Cast Iron</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Plumbing Age (years)</Label>
                      <Input
                        type="number"
                        value={editForm.plumbingAge}
                        onChange={(e) => setEditForm({ ...editForm, plumbingAge: e.target.value })}
                        placeholder="e.g. 15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sewer Type</Label>
                      <Select
                        value={editForm.sewerType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, sewerType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Municipal">Municipal</SelectItem>
                          <SelectItem value="Septic">Septic</SelectItem>
                          <SelectItem value="Cesspool">Cesspool</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Water Source</Label>
                      <Select
                        value={editForm.waterSource || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, waterSource: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Municipal">Municipal</SelectItem>
                          <SelectItem value="Well">Well</SelectItem>
                          <SelectItem value="Spring">Spring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Electrical Panel</Label>
                      <Select
                        value={editForm.electricalPanelType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, electricalPanelType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Circuit Breaker">Circuit Breaker</SelectItem>
                          <SelectItem value="Fuse Box">Fuse Box</SelectItem>
                          <SelectItem value="Sub-Panel">Sub-Panel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Age (years)</Label>
                      <Input
                        type="number"
                        value={editForm.electricalPanelAge}
                        onChange={(e) =>
                          setEditForm({ ...editForm, electricalPanelAge: e.target.value })
                        }
                        placeholder="e.g. 20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Wiring Type</Label>
                      <Select
                        value={editForm.wiringType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, wiringType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Copper">Copper</SelectItem>
                          <SelectItem value="Aluminum">Aluminum</SelectItem>
                          <SelectItem value="Knob & Tube">Knob & Tube</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </fieldset>

                {/* ── Foundation ── */}
                <fieldset className="rounded-lg border p-4">
                  <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
                    🧱 Foundation
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Foundation Type</Label>
                      <Select
                        value={editForm.foundationType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, foundationType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Slab">Slab</SelectItem>
                          <SelectItem value="Crawl Space">Crawl Space</SelectItem>
                          <SelectItem value="Basement">Basement</SelectItem>
                          <SelectItem value="Pier & Beam">Pier & Beam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Foundation Age (years)</Label>
                      <Input
                        type="number"
                        value={editForm.foundationAge}
                        onChange={(e) =>
                          setEditForm({ ...editForm, foundationAge: e.target.value })
                        }
                        placeholder="e.g. 30"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── Features & Energy ── */}
                <fieldset className="rounded-lg border p-4">
                  <legend className="flex items-center gap-2 px-2 text-sm font-semibold">
                    ⚡ Features & Energy
                  </legend>
                  <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Window Type</Label>
                      <Select
                        value={editForm.windowType || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, windowType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Single Pane">Single Pane</SelectItem>
                          <SelectItem value="Double Pane">Double Pane</SelectItem>
                          <SelectItem value="Triple Pane">Triple Pane</SelectItem>
                          <SelectItem value="Impact Rated">Impact Rated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Insulation Rating</Label>
                      <Select
                        value={editForm.insulationRating || ""}
                        onValueChange={(v) => setEditForm({ ...editForm, insulationRating: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="R-13">R-13</SelectItem>
                          <SelectItem value="R-19">R-19</SelectItem>
                          <SelectItem value="R-30">R-30</SelectItem>
                          <SelectItem value="R-38">R-38</SelectItem>
                          <SelectItem value="R-49">R-49</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Flood Zone</Label>
                      <Input
                        value={editForm.floodZone}
                        onChange={(e) => setEditForm({ ...editForm, floodZone: e.target.value })}
                        placeholder="e.g. Zone X"
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!editForm.hasGeneratorHookup}
                        onChange={(e) =>
                          setEditForm({ ...editForm, hasGeneratorHookup: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Generator Hookup
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!editForm.hasSmartHome}
                        onChange={(e) =>
                          setEditForm({ ...editForm, hasSmartHome: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Smart Home
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!editForm.hasLowEWindows}
                        onChange={(e) =>
                          setEditForm({ ...editForm, hasLowEWindows: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Low-E Windows
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!editForm.hasSolarPanels}
                        onChange={(e) =>
                          setEditForm({ ...editForm, hasSolarPanels: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Solar Panels
                    </label>
                  </div>
                </fieldset>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Year Built:</span>
                  <span className="font-medium">{property.yearBuilt || "N/A"}</span>
                  <span className="text-muted-foreground">Square Footage:</span>
                  <span className="font-medium">
                    {property.squareFootage?.toLocaleString() || "N/A"}
                  </span>
                  <span className="text-muted-foreground">Lot Size:</span>
                  <span className="font-medium">
                    {property.lotSize?.toLocaleString() || "N/A"} sq ft
                  </span>
                  <span className="text-muted-foreground">Stories:</span>
                  <span className="font-medium">{property.numStories || "N/A"}</span>
                  <span className="text-muted-foreground">Bedrooms:</span>
                  <span className="font-medium">{property.numBedrooms || "N/A"}</span>
                  <span className="text-muted-foreground">Bathrooms:</span>
                  <span className="font-medium">{property.numBathrooms || "N/A"}</span>
                  <span className="text-muted-foreground">Garage:</span>
                  <span className="font-medium">
                    {property.garageSpaces ? `${property.garageSpaces} spaces` : "N/A"}
                  </span>
                  <span className="text-muted-foreground">Foundation:</span>
                  <span className="font-medium">{property.foundationType || "N/A"}</span>
                  <span className="text-muted-foreground">County:</span>
                  <span className="font-medium">{property.county || "N/A"}</span>
                  <span className="text-muted-foreground">Risk Level:</span>
                  <Badge variant={riskColor as any}>{riskLevel}</Badge>
                </div>
                {!editing && (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-2"
                  >
                    <Edit2 className="h-3 w-3" /> Edit Details
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Systems Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Systems Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Roof Type:</span>
                  <span className="font-medium">{property.roofType || "N/A"}</span>
                  <span className="text-muted-foreground">Roof Age:</span>
                  <span className="font-medium">
                    {property.roofAge ? `${property.roofAge} years` : "N/A"}
                  </span>
                  <span className="text-muted-foreground">Roof Squares:</span>
                  <span className="font-medium">{property.roofSquares || "N/A"}</span>
                  <span className="text-muted-foreground">HVAC Type:</span>
                  <span className="font-medium">{property.hvacType || "N/A"}</span>
                  <span className="text-muted-foreground">HVAC Age:</span>
                  <span className="font-medium">
                    {property.hvacAge ? `${property.hvacAge} years` : "N/A"}
                  </span>
                  <span className="text-muted-foreground">Water Heater:</span>
                  <span className="font-medium">
                    {property.waterHeaterType || "N/A"}
                    {property.waterHeaterAge ? ` (${property.waterHeaterAge} yrs)` : ""}
                  </span>
                  <span className="text-muted-foreground">Plumbing:</span>
                  <span className="font-medium">{property.plumbingType || "N/A"}</span>
                  <span className="text-muted-foreground">Electrical:</span>
                  <span className="font-medium">{property.electricalPanelType || "N/A"}</span>
                  <span className="text-muted-foreground">Windows:</span>
                  <span className="font-medium">{property.windowType || "N/A"}</span>
                </div>
                {!editing && (
                  <Button
                    onClick={() => setEditing(true)}
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-2"
                  >
                    <Edit2 className="h-3 w-3" /> Edit Systems
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weather">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CloudRain className="h-5 w-5" />
                    Weather History
                  </CardTitle>
                  <CardDescription>
                    Storm events that may have impacted this property
                  </CardDescription>
                </div>
                <Link href="/maps/weather-chains">
                  <Button variant="outline" size="sm">
                    View Weather Map
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingWeather ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : weatherEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <Cloud className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No storm events recorded for this area</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weatherEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-4",
                        event.severity === "severe"
                          ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                          : "border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            event.severity === "severe"
                              ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                              : "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                          )}
                        >
                          <CloudRain className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{event.type} Event</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {event.hailSize && (
                          <p className="text-sm">🧊 {event.hailSize}&quot; hail</p>
                        )}
                        {event.windSpeed && (
                          <p className="text-sm">💨 {event.windSpeed} mph winds</p>
                        )}
                        <Badge
                          variant={
                            event.severity === "severe"
                              ? "destructive"
                              : event.severity === "moderate"
                                ? "outline"
                                : "secondary"
                          }
                          className={cn(
                            "mt-1",
                            event.severity === "moderate" &&
                              "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          )}
                        >
                          {event.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="digital-twins">
          <Card>
            <CardHeader>
              <CardTitle>Digital Twin Components</CardTitle>
              <CardDescription>
                Virtual replicas of all home components with age and condition tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {digitalTwins.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No digital twins created yet
                </div>
              ) : (
                <div className="space-y-4">
                  {digitalTwins.map((twin: any) => (
                    <div
                      key={twin.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="font-semibold">{twin.componentName}</div>
                        <div className="text-sm text-muted-foreground">{twin.componentType}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{twin.currentAge} years old</div>
                        <div className="text-sm text-muted-foreground">
                          Condition: {twin.conditionRating}/10
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Schedules</CardTitle>
              <CardDescription>Automated maintenance schedules and upcoming tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                No maintenance schedules yet
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections">
          <Card>
            <CardHeader>
              <CardTitle>AI Inspections</CardTitle>
              <CardDescription>History of AI-powered property inspections</CardDescription>
            </CardHeader>
            <CardContent>
              {inspections.length === 0 ? (
                <div className="py-8 text-center">
                  <Camera className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-4 text-muted-foreground">No inspections yet</p>
                  <Link href={`/inspections/new?propertyId=${propertyId}`}>
                    <Button>Start AI Inspection</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {inspections.map((inspection: any) => (
                    <div key={inspection.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-semibold">{inspection.componentType}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(inspection.inspectedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {inspection.detectionsJson && (
                        <div className="text-sm">{inspection.detectionsJson.summary}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Annual Reports</CardTitle>
              <CardDescription>Auto-generated annual homeowner reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="mb-4 text-muted-foreground">Generate comprehensive annual report</p>
                <Button>Generate 2025 Report</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
