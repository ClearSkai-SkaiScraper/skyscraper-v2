"use client";

import { Clock, CloudRain, Download } from "lucide-react";
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
        title="Weather Reports"
        subtitle="Storm verification using real weather data and claim context"
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
                  No mock weather data is generated; this uses live weather tooling and claim
                  context.
                </div>
              </div>
            </Card>
          </div>
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}
