"use client";

import { AlertTriangle, CheckCircle, Clock, CloudRain, Download, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
import { ClaimJobSelect, type ClaimJobSelection } from "@/components/selectors/ClaimJobSelect";
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

type ClaimLite = {
  id: string;
  claimNumber: string | null;
  propertyAddress: string | null;
  dateOfLoss: string | null;
};

type ClaimDocument = {
  id: string;
  type: string;
  title: string;
  publicUrl: string | null;
  createdAt: string;
};

export default function WeatherReportsPage() {
  const [selection, setSelection] = useState<ClaimJobSelection>({});
  const [templateId, setTemplateId] = useState("");

  const [peril, setPeril] = useState<"hail" | "wind" | "rain" | "snow" | "other" | "unspecified">(
    "unspecified"
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [addressOverride, setAddressOverride] = useState("");
  const [dolOverride, setDolOverride] = useState("");

  const [claimLiteMap, setClaimLiteMap] = useState<Record<string, ClaimLite>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [latestDoc, setLatestDoc] = useState<ClaimDocument | null>(null);
  const [weatherVerified, setWeatherVerified] = useState<boolean | null>(null);
  const [runningQuickDol, setRunningQuickDol] = useState(false);

  const resolvedClaimId = selection.resolvedClaimId;

  useEffect(() => {
    let cancelled = false;

    async function loadClaimsLite() {
      try {
        const res = await fetch("/api/claims/list-lite", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const claims: ClaimLite[] = Array.isArray(data?.claims) ? data.claims : [];
        const map: Record<string, ClaimLite> = {};
        for (const c of claims) {
          if (c && typeof c.id === "string") map[c.id] = c;
        }
        if (!cancelled) setClaimLiteMap(map);
      } catch {
        // ignore
      }
    }

    void loadClaimsLite();
    return () => {
      cancelled = true;
    };
  }, []);

  const claimDefaults = useMemo(() => {
    if (!resolvedClaimId) return null;
    return claimLiteMap[resolvedClaimId] || null;
  }, [claimLiteMap, resolvedClaimId]);

  const derivedAddress = claimDefaults?.propertyAddress || "";
  const derivedDol = claimDefaults?.dateOfLoss || "";

  const finalAddress = addressOverride.trim() || derivedAddress;
  const finalDol = dolOverride.trim() || derivedDol;

  // Check if claim has weather verification data
  useEffect(() => {
    if (!resolvedClaimId) {
      setWeatherVerified(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/claims/${resolvedClaimId}/documents?aiReportsOnly=true`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const docs: ClaimDocument[] = Array.isArray(data?.documents) ? data.documents : [];
        const hasWeather = docs.some((d) => d.type === "WEATHER" && d.publicUrl);
        if (!cancelled) setWeatherVerified(hasWeather);
      } catch {
        if (!cancelled) setWeatherVerified(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedClaimId]);

  const runQuickDol = async () => {
    if (!resolvedClaimId || !finalAddress) return;
    setRunningQuickDol(true);
    try {
      const res = await fetch(`/api/claims/${resolvedClaimId}/weather/quick-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: finalAddress, dol: finalDol }),
      });
      if (res.ok) {
        toast.success("Quick DOL verification complete — weather data is now available");
        setWeatherVerified(true);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || "Quick DOL verification failed");
      }
    } catch {
      toast.error("Quick DOL verification failed");
    } finally {
      setRunningQuickDol(false);
    }
  };

  const runWeather = async () => {
    setLatestDoc(null);

    if (!resolvedClaimId) {
      toast.error("Select a claim or a job linked to a claim");
      return;
    }

    if (!templateId) {
      toast.error("Select a PDF template before running");
      return;
    }

    if (!finalAddress) {
      toast.error("Address is required (select a claim with a property address or enter one)");
      return;
    }

    if (!finalDol) {
      toast.error("Date of loss is required (select a claim with DOL or enter one)");
      return;
    }

    setIsRunning(true);
    try {
      const res = await fetch("/api/weather/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: resolvedClaimId,
          address: finalAddress,
          dol: finalDol,
          peril: peril === "unspecified" ? undefined : peril,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          templateId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || "Failed to generate weather report";
        toast.error(msg);
        return;
      }

      // Fetch latest AI doc link (WEATHER)
      const docsRes = await fetch(`/api/claims/${resolvedClaimId}/documents?aiReportsOnly=true`, {
        cache: "no-store",
      });
      const docsJson = await docsRes.json().catch(() => ({}));
      const docs: ClaimDocument[] = Array.isArray(docsJson?.documents) ? docsJson.documents : [];
      const weatherDoc = docs.find((d) => d.type === "WEATHER" && d.publicUrl);

      if (weatherDoc) {
        setLatestDoc(weatherDoc);
        toast.success("Weather report generated");
      } else {
        toast.success("Weather report generated (PDF may still be processing)");
      }

      return data;
    } catch (e) {
      logger.error("[WeatherReportsPage] runWeather error:", e);
      toast.error(e?.message || "Failed to generate weather report");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Weather & Loss Justification Reports"
        subtitle="Storm verification using real weather data, claim context, and loss justification"
        icon={<CloudRain className="h-5 w-5" />}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports/history">
            <Clock className="mr-1 h-3 w-3" />
            Report History
          </Link>
        </Button>
      </PageHero>

      <div className="space-y-6">
        <PageSectionCard title="Build Weather Report">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Claim / Job *</Label>
                    <ClaimJobSelect value={selection} onValueChange={setSelection} />
                    {!resolvedClaimId && selection.jobId && (
                      <p className="text-xs text-destructive">Selected job has no linked claim.</p>
                    )}
                    {resolvedClaimId && weatherVerified === false && (
                      <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div>
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              No weather data found for this claim
                            </p>
                            <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                              Run a Quick DOL Pull to fetch NOAA storm data and enhance the report
                              with verified weather events.
                            </p>
                            <button
                              onClick={runQuickDol}
                              disabled={runningQuickDol || !finalAddress}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
                            >
                              <Zap className="h-3 w-3" />
                              {runningQuickDol
                                ? "Running DOL Verification..."
                                : "Run Quick DOL Pull"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {resolvedClaimId && weatherVerified === true && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-3 w-3" /> Weather data verified for this claim
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>PDF Template *</Label>
                    <SmartTemplateSelector
                      onSelect={(id) => setTemplateId(id)}
                      selectedId={templateId}
                      defaultStyle="Insurance"
                      context={{
                        intent: "claim_support",
                        damageType:
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          peril === "unspecified" || peril === "other" ? undefined : (peril as any),
                      }}
                      compact
                      label="Weather Report Template"
                    />
                    <p className="text-xs text-muted-foreground">Required before generation.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Peril</Label>
                    <Select value={peril} onValueChange={(v) => setPeril(v as typeof peril)}>
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Select peril" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">Unspecified</SelectItem>
                        <SelectItem value="hail">Hail</SelectItem>
                        <SelectItem value="wind">Wind</SelectItem>
                        <SelectItem value="rain">Rain</SelectItem>
                        <SelectItem value="snow">Snow</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range (From)</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range (To)</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={addressOverride}
                      onChange={(e) => setAddressOverride(e.target.value)}
                      placeholder={derivedAddress || "Enter address"}
                    />
                    {derivedAddress && !addressOverride.trim() && (
                      <p className="text-xs text-muted-foreground">Using claim property address.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Date of Loss</Label>
                    <Input
                      type="date"
                      value={dolOverride}
                      onChange={(e) => setDolOverride(e.target.value)}
                      placeholder={derivedDol ? derivedDol.slice(0, 10) : "YYYY-MM-DD"}
                    />
                    {derivedDol && !dolOverride.trim() && (
                      <p className="text-xs text-muted-foreground">Using claim date of loss.</p>
                    )}
                  </div>
                </div>

                <Button onClick={runWeather} disabled={isRunning} className="w-full">
                  {isRunning ? "Generating..." : "Generate Weather Report"}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Output</h3>
                {latestDoc?.publicUrl ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href={latestDoc.publicUrl} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download Latest PDF
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Generate a report to see a download link.
                  </p>
                )}

                <div className="text-xs text-muted-foreground">
                  This generates a combined Weather & Loss Justification report using live NOAA
                  weather data, storm event databases, and your claim&apos;s property details. The
                  report includes storm verification, damage correlation, and loss justification
                  analysis.
                </div>
              </div>
            </Card>
          </div>
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}
