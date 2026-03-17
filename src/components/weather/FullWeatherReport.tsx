"use client";

import { format, parseISO } from "date-fns";
import { AlertTriangle, Cloud, Download, Droplets, FileText, Loader2, Thermometer,Wind } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { logger } from "@/lib/logger";

interface WeatherEvent {
  date: string;
  peril: string;
  severity: string;
  description: string;
  temperature?: number;
  windSpeed?: number;
  precipitation?: number;
  humidity?: number;
}

interface WeatherReport {
  id: string;
  mode: string;
  dol: string;
  periodFrom: string;
  periodTo: string;
  primaryPeril: string;
  overallAssessment: string;
  confidence: string;
  globalSummary: {
    narrative: string;
    keyFindings: string[];
    recommendations: string[];
  };
  events: WeatherEvent[];
  createdAt: string;
}

interface FullWeatherReportProps {
  claimId?: string;
  leadId?: string;
  initialDol?: string;
  onReportGenerated?: (reportId: string) => void;
}

export function FullWeatherReport({ claimId, leadId, initialDol, onReportGenerated }: FullWeatherReportProps) {
  const [dol, setDol] = useState(initialDol || "");
  const [periodDays, setPeriodDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!dol) {
      setError("Please enter a date of loss");
      return;
    }

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch("/api/weather/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dol,
          periodDays: parseInt(periodDays),
          claimId,
          leadId,
          mode: "full_report",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate weather report");
      }

      const data = await response.json();
      setReport(data);
      onReportGenerated?.(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate weather report");
      logger.error("Weather report error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;

    try {
      const response = await fetch(`/api/weather/reports/${report.id}/export/pdf`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to export PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weather-report-${format(parseISO(report.dol), "yyyy-MM-dd")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      logger.error("PDF export error:", err);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case "high":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "low":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "severe":
      case "extreme":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "moderate":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "minor":
      case "light":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Full Weather Report
        </CardTitle>
        <CardDescription>
          Generate a comprehensive weather analysis for the loss period
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation Form */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="dol">Date of Loss</Label>
            <Input
              id="dol"
              type="date"
              value={dol}
              onChange={(e) => setDol(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="periodDays">Analysis Period (days)</Label>
            <Input
              id="periodDays"
              type="number"
              min="7"
              max="90"
              value={periodDays}
              onChange={(e) => setPeriodDays(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Report Display */}
        {report && (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Weather Analysis Summary</CardTitle>
                    <CardDescription>
                      Period: {format(parseISO(report.periodFrom), "MMM dd, yyyy")} -{" "}
                      {format(parseISO(report.periodTo), "MMM dd, yyyy")}
                    </CardDescription>
                  </div>
                  <Button onClick={handleExportPDF} size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Date of Loss</p>
                    <p className="text-lg font-semibold">{format(parseISO(report.dol), "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Primary Peril</p>
                    <Badge variant="outline" className="mt-1">
                      {report.primaryPeril}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <Badge className={`mt-1 ${getConfidenceColor(report.confidence)}`}>
                      {report.confidence}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 font-semibold">Overall Assessment</h4>
                  <p className="text-sm text-muted-foreground">{report.overallAssessment}</p>
                </div>

                {report.globalSummary?.narrative && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-2 font-semibold">AI Analysis</h4>
                      <p className="text-sm text-muted-foreground">{report.globalSummary.narrative}</p>
                    </div>
                  </>
                )}

                {report.globalSummary?.keyFindings && report.globalSummary.keyFindings.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-2 font-semibold">Key Findings</h4>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {report.globalSummary.keyFindings.map((finding, i) => (
                          <li key={i}>{finding}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {report.globalSummary?.recommendations && report.globalSummary.recommendations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-2 font-semibold">Recommendations</h4>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {report.globalSummary.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Events Timeline */}
            {report.events && report.events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cloud className="h-4 w-4" />
                    Weather Events Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.events.map((event, index) => (
                      <div
                        key={index}
                        className="rounded-lg border p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{format(parseISO(event.date), "MMM dd, yyyy")}</p>
                              <Badge variant="outline">{event.peril}</Badge>
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                        {(event.temperature || event.windSpeed || event.precipitation || event.humidity) && (
                          <div className="mt-3 flex flex-wrap gap-4 border-t pt-3">
                            {event.temperature && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Thermometer className="h-4 w-4 text-muted-foreground" />
                                <span>{event.temperature}°F</span>
                              </div>
                            )}
                            {event.windSpeed && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Wind className="h-4 w-4 text-muted-foreground" />
                                <span>{event.windSpeed} mph</span>
                              </div>
                            )}
                            {event.precipitation && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Droplets className="h-4 w-4 text-muted-foreground" />
                                <span>{event.precipitation} in</span>
                              </div>
                            )}
                            {event.humidity && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Cloud className="h-4 w-4 text-muted-foreground" />
                                <span>{event.humidity}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !report && !error && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Enter a date of loss and analysis period to generate a comprehensive weather report
          </div>
        )}
      </CardContent>
    </Card>
  );
}
