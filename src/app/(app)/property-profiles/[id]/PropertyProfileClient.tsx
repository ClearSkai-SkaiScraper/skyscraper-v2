"use client";
/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Cloud,
  CloudRain,
  Edit2,
  FileText,
  Home,
  Loader2,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [editForm, setEditForm] = useState({
    yearBuilt: initialProperty.yearBuilt || "",
    squareFootage: initialProperty.squareFootage || "",
    propertyType: initialProperty.propertyType || "RESIDENTIAL",
    roofType: initialProperty.roofType || "",
    roofAge: initialProperty.roofAge || "",
    hvacAge: initialProperty.hvacAge || "",
    waterHeaterAge: initialProperty.waterHeaterAge || "",
    stories: initialProperty.stories || "",
    garageType: initialProperty.garageType || "",
    foundationType: initialProperty.foundationType || "",
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
        body: JSON.stringify({
          yearBuilt: editForm.yearBuilt ? Number(editForm.yearBuilt) : null,
          squareFootage: editForm.squareFootage ? Number(editForm.squareFootage) : null,
          propertyType: editForm.propertyType,
          roofType: editForm.roofType || null,
          roofAge: editForm.roofAge ? Number(editForm.roofAge) : null,
          hvacAge: editForm.hvacAge ? Number(editForm.hvacAge) : null,
          waterHeaterAge: editForm.waterHeaterAge ? Number(editForm.waterHeaterAge) : null,
          stories: editForm.stories ? Number(editForm.stories) : null,
          garageType: editForm.garageType || null,
          foundationType: editForm.foundationType || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProperty({ ...property, ...data.property });
        setEditing(false);
      } else {
        logger.error("Failed to save property:", res.status);
      }
    } catch (error) {
      logger.error("Failed to save property:", error);
    } finally {
      setSaving(false);
    }
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
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                      onChange={(e) => setEditForm({ ...editForm, squareFootage: e.target.value })}
                      placeholder="e.g. 2400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select
                      value={editForm.propertyType}
                      onValueChange={(v) => setEditForm({ ...editForm, propertyType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RESIDENTIAL">Residential</SelectItem>
                        <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                        <SelectItem value="MULTI_FAMILY">Multi-Family</SelectItem>
                        <SelectItem value="INDUSTRIAL">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label>HVAC Age (years)</Label>
                    <Input
                      type="number"
                      value={editForm.hvacAge}
                      onChange={(e) => setEditForm({ ...editForm, hvacAge: e.target.value })}
                      placeholder="e.g. 8"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Water Heater Age (years)</Label>
                    <Input
                      type="number"
                      value={editForm.waterHeaterAge}
                      onChange={(e) => setEditForm({ ...editForm, waterHeaterAge: e.target.value })}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stories</Label>
                    <Input
                      type="number"
                      value={editForm.stories}
                      onChange={(e) => setEditForm({ ...editForm, stories: e.target.value })}
                      placeholder="e.g. 2"
                    />
                  </div>
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
                </div>
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
                  <span className="text-muted-foreground">Property Type:</span>
                  <span className="font-medium">{property.propertyType || "N/A"}</span>
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
                  <span className="text-muted-foreground">HVAC Age:</span>
                  <span className="font-medium">
                    {property.hvacAge ? `${property.hvacAge} years` : "N/A"}
                  </span>
                  <span className="text-muted-foreground">Water Heater Age:</span>
                  <span className="font-medium">
                    {property.waterHeaterAge ? `${property.waterHeaterAge} years` : "N/A"}
                  </span>
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
                        {event.hailSize && <p className="text-sm">🧊 {event.hailSize}" hail</p>}
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
