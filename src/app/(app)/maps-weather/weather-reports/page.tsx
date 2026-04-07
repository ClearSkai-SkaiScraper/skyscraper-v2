"use client";

import { format } from "date-fns";
import {
  Calendar,
  Cloud,
  CloudRain,
  FileText,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface WeatherReport {
  id: string;
  address: string;
  dol: string | null;
  primaryPeril: string | null;
  mode: string;
  createdAt: string;
  globalSummary: any;
  events: any[];
  claims?: { id: string; claimNumber: string } | null;
}

export default function WeatherReportsPage() {
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeatherReport | null>(null);

  // Generate form
  const [address, setAddress] = useState("");
  const [dol, setDol] = useState("");
  const [peril, setPeril] = useState("hail");

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/weather/report?list=true");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      logger.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    if (!address || !dol) {
      toast.error("Address and Date of Loss are required");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/weather/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          dol,
          peril,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to generate report");
      }

      toast.success("Weather report generated successfully!");
      setShowDialog(false);
      setAddress("");
      setDol("");
      setPeril("hail");
      void fetchReports();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const getPerilIcon = (peril: string | null) => {
    switch (peril?.toLowerCase()) {
      case "hail":
      case "wind":
      case "storm":
        return <CloudRain className="h-5 w-5 text-blue-600" />;
      case "rain":
      case "water":
        return <Cloud className="h-5 w-5 text-cyan-600" />;
      default:
        return <Cloud className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Weather Reports"
        subtitle="Generate and view AI-powered weather verification reports for insurance claims"
        icon={<CloudRain className="h-6 w-6" />}
      >
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-white text-blue-600 hover:bg-blue-50"
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate New Report
        </Button>
      </PageHero>

      {/* Reports List */}
      <PageSectionCard>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <CloudRain className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              No Weather Reports Yet
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Generate your first weather verification report to support insurance claims with
              AI-powered weather event analysis.
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate First Report
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {reports.length} Report{reports.length !== 1 ? "s" : ""}
              </h3>
              <Button variant="outline" size="sm" onClick={fetchReports}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            {reports.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedReport(report)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getPerilIcon(report.primaryPeril)}
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {report.address}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          {report.dol && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              DOL: {format(new Date(report.dol), "MMM d, yyyy")}
                            </span>
                          )}
                          {report.primaryPeril && (
                            <Badge variant="outline" className="capitalize">
                              {report.primaryPeril}
                            </Badge>
                          )}
                          {report.claims?.claimNumber && (
                            <Badge variant="secondary">#{report.claims.claimNumber}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {format(new Date(report.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  {report.globalSummary?.overallAssessment && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {report.globalSummary.overallAssessment}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageSectionCard>

      {/* Generate Report Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Generate Weather Report
            </DialogTitle>
            <DialogDescription>
              Create an AI-powered weather verification report for a property
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Property Address *
              </Label>
              <Input
                id="report-address"
                placeholder="123 Main St, City, State ZIP"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-dol">Date of Loss *</Label>
              <Input
                id="report-dol"
                type="date"
                value={dol}
                onChange={(e) => setDol(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Primary Peril</Label>
              <Select value={peril} onValueChange={setPeril}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hail">🧊 Hail</SelectItem>
                  <SelectItem value="wind">🌬️ Wind</SelectItem>
                  <SelectItem value="rain">🌧️ Rain / Water</SelectItem>
                  <SelectItem value="snow">❄️ Snow / Ice</SelectItem>
                  <SelectItem value="other">❓ Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !address || !dol}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getPerilIcon(selectedReport.primaryPeril)}
                  Weather Report
                </DialogTitle>
                <DialogDescription>{selectedReport.address}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Loss</p>
                    <p className="font-medium">
                      {selectedReport.dol
                        ? format(new Date(selectedReport.dol), "MMMM d, yyyy")
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Peril</p>
                    <p className="font-medium capitalize">
                      {selectedReport.primaryPeril || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Generated</p>
                    <p className="font-medium">
                      {format(new Date(selectedReport.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                  {selectedReport.claims?.claimNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">Claim</p>
                      <p className="font-medium">#{selectedReport.claims.claimNumber}</p>
                    </div>
                  )}
                </div>

                {/* Summary */}
                {selectedReport.globalSummary?.overallAssessment && (
                  <div>
                    <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.globalSummary.overallAssessment}
                    </p>
                  </div>
                )}

                {/* Carrier Talking Points */}
                {selectedReport.globalSummary?.contractorNarrative && (
                  <div>
                    <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">
                      Carrier Talking Points
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.globalSummary.contractorNarrative}
                    </p>
                  </div>
                )}

                {/* Events */}
                {Array.isArray(selectedReport.events) && selectedReport.events.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-semibold text-slate-900 dark:text-white">
                      Weather Events ({selectedReport.events.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedReport.events.map((event: any, i: number) => (
                        <div
                          key={i}
                          className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-amber-900 dark:text-amber-100">
                              {event.type || "Weather Event"}
                            </span>
                            <span className="text-xs text-amber-700 dark:text-amber-300">
                              {event.date || "Unknown date"}
                              {event.time ? ` at ${event.time}` : ""}
                            </span>
                          </div>
                          {event.intensity && (
                            <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                              Intensity: {event.intensity}
                            </p>
                          )}
                          {event.notes && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
