"use client";

import { CheckCircle, CloudRain, Loader2 } from "lucide-react";
import { useState } from "react";

import { Wizard, WizardStep } from "@/components/common/Wizard";
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
      setError(err.message || "Failed to run Quick DOL.");
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
    } catch (err) {
      logger.error("Weather report error:", err);
      setError(err.message || "Failed to generate weather report.");
    } finally {
      setIsReportRunning(false);
    }
  }

  const steps: WizardStep[] = [
    {
      id: "quick-dol",
      title: "Quick DOL Scan",
      description: "Find likely dates of loss based on address, peril, and time window.",
      render: () => (
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

          <div className="grid grid-cols-3 gap-4">
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

          {error && (
            <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</Card>
          )}

          {quickDolResult && (
            <Card className="p-4">
              <h3 className="mb-3 font-semibold">
                DOL Candidates ({quickDolResult.candidates.length})
              </h3>
              <div className="space-y-3">
                {quickDolResult.candidates.map((c) => (
                  <label
                    key={c.date}
                    className="flex cursor-pointer items-start gap-3 rounded p-2 hover:bg-muted"
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
      ),
    },
    {
      id: "full-report",
      title: "Generate Full Weather Report",
      description:
        "Use the selected Date of Loss to create and save a full weather verification report.",
      render: () => (
        <div className="space-y-4">
          <Card className="bg-muted p-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Claim:</span> {claimId}
              </div>
              <div>
                <span className="font-medium">Address:</span>{" "}
                {address || "— (enter in previous step)"}
              </div>
              <div>
                <span className="font-medium">Selected DOL:</span>{" "}
                {selectedDol || "— (select a candidate)"}
              </div>
              {lossType && (
                <div>
                  <span className="font-medium">Loss Type:</span> {lossType}
                </div>
              )}
            </div>
          </Card>

          <Button onClick={runWeatherReport} disabled={isReportRunning || !selectedDol}>
            {isReportRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Weather Report...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Generate Weather Report
              </>
            )}
          </Button>

          {error && (
            <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</Card>
          )}

          {reportResult && (
            <Card className="border-green-200 bg-green-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">Weather Report Saved</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Report ID:</span> {reportResult.weatherReportId}
                </div>
                <div>
                  <span className="font-medium">Provider:</span>{" "}
                  {reportResult.report.provider || "AI Generated"}
                </div>
                {reportResult.report.summary && (
                  <div>
                    <span className="font-medium">Summary:</span> {reportResult.report.summary}
                  </div>
                )}
              </div>

              <p className="mt-3 border-t border-green-200 pt-3 text-xs text-muted-foreground">
                You can now reference this Weather Report in Estimate, Supplement, and Report
                Builders.
              </p>
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl py-6">
      <Wizard steps={steps} onFinishAction={() => {}} />
    </div>
  );
}
