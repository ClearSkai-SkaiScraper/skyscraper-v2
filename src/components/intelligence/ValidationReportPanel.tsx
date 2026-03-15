"use client";

/**
 * ValidationReportPanel — Displays results from the validation harness.
 *
 * Designed to be embedded in the tuning dashboard or shown as a standalone
 * page. Accepts a ValidationReport JSON (from scripts/validate-intelligence.ts)
 * via a file upload or API fetch.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileCheck2,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";

// ─── Types (mirrors validate-intelligence.ts output) ─────────────────────────

interface EngineResult {
  engine: string;
  status: "pass" | "warn" | "fail";
  durationMs: number;
  output: Record<string, unknown>;
  notes: string[];
}

interface ClaimValidation {
  claimId: string;
  claimNumber: string;
  damageType: string;
  carrier: string | null;
  isDemo: boolean;
  engines: EngineResult[];
  overallStatus: "pass" | "warn" | "fail";
}

interface ValidationReport {
  timestamp: string;
  configVersion: string;
  configErrors: string[];
  labelAudit: Record<string, string>;
  claims: ClaimValidation[];
  summary: {
    totalClaims: number;
    pass: number;
    warn: number;
    fail: number;
    engineCoverage: Record<string, { ran: number; passed: number }>;
  };
}

// ─── Status helpers ──────────────────────────────────────────────────────────

const statusIcon = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  fail: <XCircle className="h-4 w-4 text-red-500" />,
};

const statusBadge = {
  pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  fail: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ValidationReportPanel({ className }: { className?: string }) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as ValidationReport;
        setReport(parsed);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }, []);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // ─── Empty state ──────────────────────────────────────────────────────────

  if (!report) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            Load a validation report
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Run{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">
              REPORT_FILE=report.json npx tsx scripts/validate-intelligence.ts
            </code>{" "}
            then upload the JSON file.
          </p>
          <label className="cursor-pointer rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
            Upload Report
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </CardContent>
      </Card>
    );
  }

  // ─── Report loaded ────────────────────────────────────────────────────────

  const { summary } = report;
  const ts = new Date(report.timestamp).toLocaleString();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="h-5 w-5 text-indigo-500" />
              Validation Report
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {ts}
            </div>
          </div>
          <CardDescription>
            Config v{report.configVersion} — {summary.totalClaims} claim(s) tested
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary badges */}
          <div className="flex flex-wrap gap-3">
            <Badge className={statusBadge.pass}>
              <CheckCircle2 className="mr-1 h-3 w-3" /> {summary.pass} Pass
            </Badge>
            <Badge className={statusBadge.warn}>
              <AlertTriangle className="mr-1 h-3 w-3" /> {summary.warn} Warn
            </Badge>
            <Badge className={statusBadge.fail}>
              <XCircle className="mr-1 h-3 w-3" /> {summary.fail} Fail
            </Badge>
          </div>

          {/* Config errors */}
          {report.configErrors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
              <p className="mb-1 text-xs font-semibold text-red-600 dark:text-red-400">
                Config Errors
              </p>
              <ul className="space-y-1">
                {report.configErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">
                    • {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Engine coverage */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Engine Coverage
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {Object.entries(summary.engineCoverage).map(([engine, stats]) => (
                <div
                  key={engine}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm dark:border-slate-700"
                >
                  <span className="text-slate-600 dark:text-slate-400">{engine}</span>
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold",
                      stats.passed === stats.ran
                        ? "text-emerald-600"
                        : stats.passed > 0
                          ? "text-amber-600"
                          : "text-red-600"
                    )}
                  >
                    {stats.passed}/{stats.ran}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-claim results */}
      {report.claims.map((claim) => (
        <Card key={claim.claimId} className="overflow-hidden">
          <button
            onClick={() => toggle(claim.claimId)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <div className="flex items-center gap-3">
              {statusIcon[claim.overallStatus]}
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {claim.claimNumber}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {claim.damageType} | {claim.carrier ?? "no carrier"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", statusBadge[claim.overallStatus])}>
                {claim.overallStatus.toUpperCase()}
              </Badge>
              {expanded[claim.claimId] ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {expanded[claim.claimId] && (
            <CardContent className="border-t pt-4 dark:border-slate-700">
              <div className="space-y-4">
                {claim.engines.map((eng) => (
                  <div key={eng.engine} className="rounded-lg border p-3 dark:border-slate-700">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {statusIcon[eng.status]}
                        <span className="text-sm font-medium">{eng.engine}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{eng.durationMs}ms</span>
                    </div>
                    {eng.notes.length > 0 && (
                      <ul className="space-y-0.5 pl-6">
                        {eng.notes.map((note, i) => (
                          <li
                            key={i}
                            className={cn(
                              "text-xs",
                              note.includes("❌")
                                ? "text-red-500"
                                : note.includes("⚠️")
                                  ? "text-amber-500"
                                  : "text-muted-foreground"
                            )}
                          >
                            {note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Load another */}
      <div className="flex justify-center">
        <label className="cursor-pointer text-xs text-indigo-500 underline hover:text-indigo-600">
          Load another report
          <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    </div>
  );
}
