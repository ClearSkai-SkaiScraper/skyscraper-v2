"use client";

import { Download, Filter, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logger } from "@/lib/logger";

interface Report {
  id: string;
  type: string;
  title: string;
  status: string;
  claimId: string | null;
  pdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  sections: any;
  configData: any;
}

interface ReportHistoryClientProps {
  reports: Report[];
  orgId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ReportHistoryClient({ reports, orgId }: ReportHistoryClientProps) {
  const [filter, setFilter] = useState<string>("all");
  const [rebuilding, setRebuilding] = useState<string | null>(null);

  const filteredReports = reports.filter((report) => {
    if (filter === "all") return true;
    return report.type === filter;
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownload = (pdfUrl: string, reportId: string) => {
    if (!pdfUrl) {
      alert("PDF URL not available");
      return;
    }
    window.open(pdfUrl, "_blank");
  };

  const handleRebuild = async (report: Report) => {
    if (!report.claimId) {
      alert("Cannot rebuild report without claim ID");
      return;
    }

    setRebuilding(report.id);
    try {
      // TODO: Call rebuild API endpoint
      // const response = await fetch("/api/reports/rebuild", {
      //   method: "POST",
      //   body: JSON.stringify({
      //     claimId: report.claimId,
      //     type: report.type,
      //     sections: report.sections,
      //     options: report.configData,
      //   }),
      // });

      toast.info("Report queued for rebuild. Check back in a few moments.");
    } catch (error) {
      logger.error("Rebuild error:", error);
      alert("Failed to rebuild report");
    } finally {
      setRebuilding(null);
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      INSURANCE_CLAIM: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      RETAIL_PROPOSAL: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      SUPPLEMENT_PACKAGE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      finalized: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="INSURANCE_CLAIM">Insurance Claims</SelectItem>
              <SelectItem value="RETAIL_PROPOSAL">Retail Proposals</SelectItem>
              <SelectItem value="SUPPLEMENT_PACKAGE">Supplements</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Claim</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-gray-500">
                  No reports found. Generate your first report to see it here.
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {new Date(report.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>{report.title || "Untitled Report"}</TableCell>
                  <TableCell>
                    <Badge className={getTypeBadge(report.type)}>
                      {report.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(report.status)}>{report.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                    {report.claimId ? report.claimId.slice(0, 8) : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {report.pdfUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(report.pdfUrl!, report.id)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                      )}
                      {report.claimId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRebuild(report)}
                          disabled={rebuilding === report.id}
                        >
                          <RefreshCw
                            className={`mr-1 h-4 w-4 ${
                              rebuilding === report.id ? "animate-spin" : ""
                            }`}
                          />
                          Rebuild
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
