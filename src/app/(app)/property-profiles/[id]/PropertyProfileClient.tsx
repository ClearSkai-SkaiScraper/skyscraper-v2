"use client";
/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */

import { AlertTriangle, ArrowLeft, Camera, FileText, Home, TrendingUp, Wrench } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

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
  const [property] = useState(initialProperty);
  const [healthScore, setHealthScore] = useState(initialHealthScore);
  const [digitalTwins] = useState(initialDigitalTwins);
  const [inspections] = useState(initialInspections);
  const [calculating, setCalculating] = useState(false);

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
          <Link href={`/inspections/new?propertyId=${propertyId}`}>
            <Button variant="outline" className="gap-2">
              <Camera className="h-4 w-4" />
              AI Inspection
            </Button>
          </Link>
          <Link href={`/property-profiles/${propertyId}`}>
            <Button>Edit Property</Button>
          </Link>
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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="digital-twins">Digital Twins</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
              </CardContent>
            </Card>
          </div>
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
