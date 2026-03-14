"use client";

import { CheckCircle, CloudLightning, CloudRain, Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

type QuickDolCandidate = {
  date: string;
  confidence: number;
  reasoning?: string;
};

type QuickDolResponse = {
  candidates: QuickDolCandidate[];
  notes?: string;
};

type WeatherReportApiResponse = {
  weatherReportId: string;
  report: {
    id: string;
    address: string;
    lossType?: string | null;
    dol?: string | null;
    summary?: string | null;
    provider?: string | null;
  };
  pdfSaved?: boolean;
};

type Props = { params: { claimId: string } };

export default function ClaimWeatherPage({ params }: Props) {
  const { claimId } = params;

  const [address, setAddress] = useState("");
  const [lossType, setLossType] = useState<"none" | "hail" | "wind" | "water">("none");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [quickDolResult, setQuickDolResult] = useState<QuickDolResponse | null>(null);
  const [selectedDol, setSelectedDol] = useState("");

  const [isQuickDolRunning, setIsQuickDolRunning] = useState(false);
  const [isReportRunning, setIsReportRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportResult, setReportResult] = useState<WeatherReportApiResponse | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  async function downloadVerificationPdf() {
    setGeneratingPdf(true);
    try {
      toast.info("Scanning 12-month weather history…", { duration: 4000 });
      const res = await fetch(`/api/claims/${claimId}/weather/quick-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Weather-Verification-${claimId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Weather Verification PDF downloaded!");
    } catch (err) {
      logger.error("Verification PDF error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate verification PDF");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function runQuickDol() {
    setIsQuickDolRunning(true);
    setError(null);
    setQuickDolResult(null);

    if (!address.trim()) {
      setIsQuickDolRunning(false);
      setError("Address is required.");
      return;
    }

    try {
      const res = await fetch("/api/weather/quick-dol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          lossType: lossType === "none" ? null : lossType,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as QuickDolResponse;
      setQuickDolResult(data);

      // Default to highest-confidence candidate
      if (data.candidates?.length) {
        const sorted = [...data.candidates].sort(
          (a, b) => (b.confidence || 0) - (a.confidence || 0)
        );
        setSelectedDol(sorted[0].date);
      }
    } catch (err) {
      logger.error("Quick DOL error:", err);
      setError(err instanceof Error ? err.message : "Failed to run Quick DOL.");
    } finally {
      setIsQuickDolRunning(false);
    }
  }

  async function runWeatherReport() {
    setIsReportRunning(true);
    setError(null);
    setReportResult(null);

    if (!address.trim()) {
      setIsReportRunning(false);
      setError("Address is required.");
      return;
    }

    try {
      toast.info("Generating full weather & loss justification report…", { duration: 6000 });
      const res = await fetch("/api/weather/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          dol: selectedDol || null,
          lossType: lossType === "none" ? null : lossType,
          claim_id: claimId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as WeatherReportApiResponse;
      setReportResult(data);
      toast.success("Weather report generated and saved!");
    } catch (err) {
      logger.error("Weather report error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate weather report.");
    } finally {
      setIsReportRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      {/* ── Quick one-page Weather Verification PDF ── */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-sky-50 p-5 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-sky-950/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CloudLightning className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
                One-Page Weather Verification PDF
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Auto-scans 12 months of NOAA hail &amp; wind data near this property, scores
                severity, and generates a branded justification document.
              </p>
            </div>
          </div>
          <Button
            onClick={downloadVerificationPdf}
            disabled={generatingPdf}
            className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* ── Quick DOL Scan ── */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Quick DOL Scan</h2>
          <p className="text-sm text-muted-foreground">
            Find likely dates of loss based on address, peril type, and time window.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Property Address</Label>
            <Input
              id="address"
              placeholder="678 N Blanco Ct, Dewey, AZ 86327"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="loss-type">Loss Type (optional)</Label>
              <Select
                value={lossType || "NONE"}
                onValueChange={(value) =>
                  setLossType(value === "NONE" ? "none" : (value as typeof lossType))
                }
              >
                <SelectTrigger id="loss-type">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not specified</SelectItem>
                  <SelectItem value="hail">Hail</SelectItem>
                  <SelectItem value="wind">Wind</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">Date From (optional)</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="date-to">Date To (optional)</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={runQuickDol} disabled={isQuickDolRunning}>
            {isQuickDolRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Quick DOL...
              </>
            ) : (
              <>
                <CloudRain className="mr-2 h-4 w-4" />
                Run Quick DOL
              </>
            )}
          </Button>

          {error && !isReportRunning && !reportResult && (
            <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </Card>
          )}

          {/* DOL Candidates */}
          {quickDolResult && (
            <Card className="border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
                <CheckCircle className="h-4 w-4" />
                DOL Candidates ({quickDolResult.candidates.length})
              </h3>
              <div className="space-y-2">
                {quickDolResult.candidates.map((c) => (
                  <label
                    key={c.date}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-800/30 ${
                      selectedDol === c.date
                        ? "border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-800/40"
                        : "border-transparent"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dol"
                      className="mt-1"
                      title={`Select ${c.date} as DOL`}
                      checked={selectedDol === c.date}
                      onChange={() => setSelectedDol(c.date)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        {c.date}
                        <Badge variant="secondary">
                          {Math.round((c.confidence ?? 0) * 100)}% confidence
                        </Badge>
                      </div>
                      {c.reasoning && (
                        <p className="mt-1 text-sm text-muted-foreground">{c.reasoning}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {quickDolResult.notes && (
                <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                  {quickDolResult.notes}
                </p>
              )}
            </Card>
          )}
        </div>
      </Card>

      {/* ── Full Weather & Loss Justification Report ── */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Full Weather & Loss Justification Report</h2>
          <p className="text-sm text-muted-foreground">
            Generate a comprehensive multi-page weather report with event data, radar evidence, and
            carrier-ready justification using the selected DOL above.
          </p>
        </div>

        {/* Context summary */}
        <Card className="mb-4 bg-muted/50 p-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Address:</span>{" "}
              <span className={address ? "" : "italic text-muted-foreground"}>
                {address || "Enter above ↑"}
              </span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Selected DOL:</span>{" "}
              <span
                className={
                  selectedDol
                    ? "font-semibold text-emerald-700 dark:text-emerald-400"
                    : "italic text-muted-foreground"
                }
              >
                {selectedDol || "Run Quick DOL first ↑"}
              </span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Loss Type:</span>{" "}
              {lossType !== "none" ? lossType : "Not specified"}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Claim:</span> {claimId}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Button
            onClick={runWeatherReport}
            disabled={isReportRunning || !selectedDol || !address.trim()}
            size="lg"
            className={selectedDol && address.trim() ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            {isReportRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Weather Report...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Full Weather Report
              </>
            )}
          </Button>

          {!selectedDol && !isReportRunning && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Run Quick DOL above and select a candidate date before generating the full report.
            </p>
          )}

          {error && isReportRunning && (
            <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </Card>
          )}

          {/* Report result */}
          {reportResult && (
            <Card className="border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Weather Report Generated & Saved
                </h3>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Report ID:</span>{" "}
                  {reportResult.weatherReportId || reportResult.report?.id}
                </div>
                <div>
                  <span className="font-medium">Provider:</span>{" "}
                  {reportResult.report.provider || "AI Generated"}
                </div>
                {reportResult.report.summary && (
                  <div>
                    <span className="font-medium">Summary:</span>{" "}
                    <span className="text-muted-foreground">{reportResult.report.summary}</span>
                  </div>
                )}
                {reportResult.pdfSaved && (
                  <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-3.5 w-3.5" />
                    PDF saved to claim files
                  </div>
                )}
              </div>

              <p className="mt-3 border-t border-green-200 pt-3 text-xs text-muted-foreground dark:border-green-700">
                This report is now available in your Claim Files, Reports History, and can be
                referenced in Estimate, Supplement, and Claims Assembly builders.
              </p>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
}
