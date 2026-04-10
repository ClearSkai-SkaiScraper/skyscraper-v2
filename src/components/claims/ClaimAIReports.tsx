"use client";

import { format } from "date-fns";
import { Brain, ChevronDown, ChevronUp, Clock, Download,FileText, Loader2 } from "lucide-react";
import { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface AIReport {
  id: string;
  type: string;
  createdAt: string;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any;
}

interface ClaimAIReportsProps {
  claimId: string;
}

export function ClaimAIReports({ claimId }: ClaimAIReportsProps) {
  const [reports, setReports] = useState<AIReport[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pdfMap, setPdfMap] = useState<Map<string, { id: string; url: string; title: string }>>(
    new Map()
  );

  useEffect(() => {
    void fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    void fetchPDFs();
  }, [claimId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/claims/${claimId}/ai-reports`);
      if (!res.ok) {
        // Graceful degradation - API might not exist yet
        setReports([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      logger.error("Failed to fetch AI reports:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPDFs = async () => {
    try {
      const res = await fetch(`/api/claims/${claimId}/documents?aiReportsOnly=true`);
      if (res.ok) {
        const data = await res.json();
        const pdfs = data.documents || [];
        const map = new Map<string, { id: string; url: string; title: string }>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pdfs.forEach((doc: any) => {
          if (
            doc.type &&
            ["WEATHER", "REBUTTAL", "DEPRECIATION", "SUPPLEMENT"].includes(doc.type)
          ) {
            map.set(doc.type, {
              id: doc.id,
              url: doc.publicUrl,
              title: doc.title || doc.label || "Report",
            });
          }
        });
        setPdfMap(map);
      }
    } catch (err) {
      logger.error("Failed to fetch PDFs:", err);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      weather: "Weather Report",
      rebuttal: "Rebuttal Letter",
      supplement: "Supplement Builder",
      damage: "Damage Assessment",
      mockup: "AI Mockup",
    };
    return labels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      weather: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      rebuttal: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      supplement: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      damage: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      mockup: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    };
    return colors[type] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

  if (loading) {
    return (
      <Card className="border-slate-200/50 bg-white/90 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Reports & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="border-slate-200/50 bg-white/90 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Reports & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-blue-400 opacity-50" />
            <p className="mt-4 font-medium text-slate-900">No AI reports yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Run Weather, Rebuttal, or Damage tools from the claim page to see AI-generated reports
              here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/50 bg-white/90 shadow-lg backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Brain className="h-5 w-5 text-blue-600" />
          AI Reports & Analysis ({reports.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reports.map((report) => {
            const reportTypeUpper = report.type.toUpperCase();
            const hasPDF = pdfMap.has(reportTypeUpper);
            const pdf = pdfMap.get(reportTypeUpper);

            return (
              <div
                key={report.id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getTypeBadgeColor(report.type)}`}
                      >
                        {getTypeLabel(report.type)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          report.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {report.status}
                      </span>
                      {hasPDF && pdf && (
                        <a
                          href={pdf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          title={`Download ${pdf.title}`}
                        >
                          <Download className="h-3 w-3" />
                          PDF
                        </a>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {format(new Date(report.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <Button
                    onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
                    variant="ghost"
                    size="sm"
                  >
                    {expandedId === report.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {expandedId === report.id && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    <div className="space-y-3">
                      {report.output?.summary && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">Summary</h4>
                          <p className="mt-1 text-sm text-slate-700">{report.output.summary}</p>
                        </div>
                      )}
                      {report.output?.rebuttal && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">Rebuttal Content</h4>
                          <p className="mt-1 text-sm text-slate-700">{report.output.rebuttal}</p>
                        </div>
                      )}
                      {report.output?.confidence && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">Confidence</h4>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-slate-200">
                              <div
                                className="h-2 rounded-full bg-blue-600"
                                style={{ width: `${report.output.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-700">
                              {Math.round(report.output.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {report.output?.events && report.output.events.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">Weather Events</h4>
                          // eslint-disable-next-line react/jsx-no-comment-textnodes
                          <ul className="mt-1 space-y-1">
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            {report.output.events.slice(0, 3).map((event: any, idx: number) => (
                              <li key={idx} className="text-sm text-slate-700">
                                • {event.description || event.type}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
