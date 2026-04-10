"use client";

import { format, parseISO } from "date-fns";
import { Download, Eye,FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logger } from "@/lib/logger";

interface SavedReport {
  id: string;
  mode: string;
  dol: string;
  primaryPeril: string;
  confidence: string;
  createdAt: string;
  createdBy: {
    firstName: string;
    lastName: string;
  };
}

interface SavedReportsListProps {
  claimId?: string;
  leadId?: string;
  onViewReport?: (reportId: string) => void;
}

export function SavedReportsList({ claimId, leadId, onViewReport }: SavedReportsListProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchReports();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, leadId]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (claimId) params.set("claimId", claimId);
      if (leadId) params.set("leadId", leadId);

      const response = await fetch(`/api/weather/reports?${params}`);
      if (!response.ok) throw new Error("Failed to fetch weather reports");

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weather reports");
      logger.error("Fetch reports error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async (reportId: string, dol: string) => {
    try {
      const response = await fetch(`/api/weather/reports/${reportId}/export/pdf`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to export PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `weather-report-${format(parseISO(dol), "yyyy-MM-dd")}.pdf`;
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

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "quick_dol":
        return "Quick DOL";
      case "full_report":
        return "Full Report";
      default:
        return mode;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Saved Weather Reports
        </CardTitle>
        <CardDescription>
          View and download previously generated weather analysis reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No weather reports found. Generate a report to get started.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date of Loss</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Primary Peril</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(report.dol), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getModeLabel(report.mode)}</Badge>
                    </TableCell>
                    <TableCell>{report.primaryPeril || "—"}</TableCell>
                    <TableCell>
                      <Badge className={getConfidenceColor(report.confidence)}>
                        {report.confidence || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {report.createdBy.firstName} {report.createdBy.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(report.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewReport?.(report.id)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportPDF(report.id, report.dol)}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
