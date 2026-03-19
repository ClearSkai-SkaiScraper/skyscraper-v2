"use client";

import {
  CalendarCheck,
  CheckCircle,
  CloudLightning,
  CloudRain,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  MapPin,
  RefreshCw,
  Trash2,
  Wind,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

// ─── Types ─────────────────────────────────────────────────────────────────

type QuickDolCandidate = {
  date: string;
  confidence: number;
  reasoning?: string;
  perilType?: string;
};

type QuickDolResponse = {
  candidates: QuickDolCandidate[];
  notes?: string;
  scanId?: string | null;
};

type SavedScan = {
  id: string;
  mode: string;
  address: string;
  dol: string | null;
  lossType: string | null;
  primaryPeril: string | null;
  confidence: number | null;
  candidateDates: QuickDolCandidate[] | null;
  events: unknown[] | null;
  globalSummary: { notes?: string; scanType?: string; perilCategory?: string } | null;
  createdAt: string;
  periodFrom: string | null;
  periodTo: string | null;
  users: { name: string | null } | null;
};

type SavedWeatherReport = {
  id: string;
  reportId: string;
  address: string;
  dol: string | null;
  primaryPeril: string | null;
  summary: string | null;
  pdfUrl: string | null;
  createdAt: string;
};

type RadarImage = {
  url: string;
  timestamp: string;
  source: string;
  stationId?: string;
  label: string;
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
  pdfUrl?: string | null;
  pdfError?: string;
};

const PERIL_COLORS: Record<string, string> = {
  hail: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  wind: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  water: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  tropical: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const PERIL_ICONS: Record<string, React.ReactNode> = {
  hail: <CloudRain className="h-4 w-4 text-blue-500" />,
  wind: <Wind className="h-4 w-4 text-amber-500" />,
  water: <CloudRain className="h-4 w-4 text-cyan-500" />,
  tropical: <CloudLightning className="h-4 w-4 text-purple-500" />,
};

// ─── Main Component ────────────────────────────────────────────────────────

type Props = { params: { claimId: string } };

export default function ClaimWeatherPage({ params }: Props) {
  const { claimId } = params;

  // Form state — structured address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [zip, setZip] = useState("");
  const [lossType, setLossType] = useState<"none" | "hail" | "wind" | "water">("none");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Quick DOL state
  const [quickDolResult, setQuickDolResult] = useState<QuickDolResponse | null>(null);
  const [selectedDol, setSelectedDol] = useState("");
  const [isQuickDolRunning, setIsQuickDolRunning] = useState(false);

  // Saved scans state
  const [savedScans, setSavedScans] = useState<SavedScan[]>([]);
  const [savedWeatherReports, setSavedWeatherReports] = useState<SavedWeatherReport[]>([]);
  const [currentDol, setCurrentDol] = useState<string | null>(null);
  const [loadingScans, setLoadingScans] = useState(true);
  const [settingDol, setSettingDol] = useState<string | null>(null);

  // Radar state
  const [radarImages, setRadarImages] = useState<RadarImage[]>([]);
  const [radarStation, setRadarStation] = useState<string | null>(null);
  const [loadingRadar, setLoadingRadar] = useState(false);
  const [selectedRadarIdx, setSelectedRadarIdx] = useState(0);

  // Full report state
  const [isReportRunning, setIsReportRunning] = useState(false);
  const [reportResult, setReportResult] = useState<WeatherReportApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // generatingPdf state removed — quick-verify PDF section was removed in favor of Generate Full Weather Report

  // ── Compose full address string for API calls ──
  const fullAddress = [street, city, [addrState, zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  // ── Load claim property address on mount (auto-fill) ──
  useEffect(() => {
    async function loadClaimAddress() {
      try {
        const res = await fetch(`/api/weather/scans?claimId=${claimId}`);
        if (res.ok) {
          const data = await res.json();
          setSavedScans(data.scans || []);
          setSavedWeatherReports(data.weatherReports || []);
          setCurrentDol(data.currentDol || null);

          // Auto-fill from claim property data (structured)
          if (data.claimProperty && !street) {
            if (data.claimProperty.street) setStreet(data.claimProperty.street);
            if (data.claimProperty.city) setCity(data.claimProperty.city);
            if (data.claimProperty.state) setAddrState(data.claimProperty.state);
            if (data.claimProperty.zipCode) setZip(data.claimProperty.zipCode);
          } else if (data.claimAddress && !street) {
            // Fallback: parse concatenated address "street, city, state zip"
            const parts = (data.claimAddress as string).split(",").map((s: string) => s.trim());
            if (parts.length >= 2) {
              setStreet(parts[0]);
              setCity(parts[1]);
              if (parts[2]) {
                const stateZip = parts[2].split(" ").filter(Boolean);
                if (stateZip.length >= 1) setAddrState(stateZip[0]);
                if (stateZip.length >= 2) setZip(stateZip.slice(1).join(" "));
              }
            } else {
              setStreet(data.claimAddress);
            }
          }
        }
      } catch (err) {
        logger.error("Failed to load claim address:", err);
      } finally {
        setLoadingScans(false);
      }
    }
    loadClaimAddress();
  }, [claimId]);

  // ── Load saved scans ──
  async function loadSavedScans() {
    setLoadingScans(true);
    try {
      const res = await fetch(`/api/weather/scans?claimId=${claimId}`);
      if (res.ok) {
        const data = await res.json();
        setSavedScans(data.scans || []);
        setSavedWeatherReports(data.weatherReports || []);
        setCurrentDol(data.currentDol || null);
      }
    } catch (err) {
      logger.error("Failed to load saved scans:", err);
    } finally {
      setLoadingScans(false);
    }
  }

  // ── Quick DOL Scan ──
  async function runQuickDol() {
    setIsQuickDolRunning(true);
    setError(null);
    setQuickDolResult(null);

    if (!fullAddress.trim()) {
      setIsQuickDolRunning(false);
      setError("Address is required.");
      return;
    }

    try {
      const res = await fetch("/api/weather/quick-dol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fullAddress,
          lossType: lossType === "none" ? null : lossType,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          claimId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as QuickDolResponse & { warning?: string };
      setQuickDolResult(data);

      if (data.candidates?.length) {
        const sorted = [...data.candidates].sort(
          (a, b) => (b.confidence || 0) - (a.confidence || 0)
        );
        setSelectedDol(sorted[0].date);
      }

      // Refresh saved scans to include the new one
      await loadSavedScans();

      if (data.warning) {
        toast.warning(data.warning);
      } else if (data.scanId) {
        toast.success("DOL scan complete and saved!");
      } else {
        toast.warning("DOL scan completed but could not be saved.");
      }
    } catch (err) {
      logger.error("Quick DOL error:", err);
      setError(err instanceof Error ? err.message : "Failed to run Quick DOL.");
    } finally {
      setIsQuickDolRunning(false);
    }
  }

  // ── Set DOL on Claim ──
  async function setDolOnClaim(dol: string, scanId?: string) {
    setSettingDol(dol);
    try {
      const res = await fetch("/api/weather/set-dol", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, dol, scanId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update DOL");
      }

      setCurrentDol(dol);
      setSelectedDol(dol);
      toast.success(`Date of Loss updated to ${new Date(dol).toLocaleDateString()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set DOL");
    } finally {
      setSettingDol(null);
    }
  }

  // ── Fetch Radar Images ──
  async function fetchRadar(date: string) {
    setLoadingRadar(true);
    setRadarImages([]);
    try {
      // Parse and format the date to YYYY-MM-DD
      const dateObj = new Date(date);
      const formattedDate = dateObj.toISOString().split("T")[0];

      // Geocode address via Open-Meteo (free — works best with city names)
      const geoQuery = city && addrState ? `${city}, ${addrState}` : fullAddress;
      if (!geoQuery.trim()) {
        toast.error("Enter an address first to fetch radar images");
        return;
      }

      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(geoQuery)}&count=1&language=en&format=json`
      );
      let lat = 34.5;
      let lng = -112.4;
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results?.[0]) {
          lat = geoData.results[0].latitude;
          lng = geoData.results[0].longitude;
        }
      }

      const res = await fetch(`/api/weather/radar?lat=${lat}&lng=${lng}&date=${formattedDate}`);
      if (res.ok) {
        const data = await res.json();
        if (data.images?.length > 0) {
          setRadarImages(data.images);
          setRadarStation(data.stationId || null);
          setSelectedRadarIdx(0);
          toast.success(`Loaded ${data.images.length} radar images for ${formattedDate}`);
        } else {
          toast.info("No radar images available for this date");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to fetch radar images");
      }
    } catch (err) {
      logger.error("Radar fetch error:", err);
      toast.error("Failed to fetch radar images");
    } finally {
      setLoadingRadar(false);
    }
  }

  // ── Generate Full Report ──
  async function runWeatherReport() {
    setIsReportRunning(true);
    setError(null);
    setReportResult(null);

    if (!fullAddress.trim()) {
      setIsReportRunning(false);
      setError("Address is required.");
      return;
    }

    // Use selectedDol if available, otherwise fallback to currentDol (saved on claim)
    const effectiveDol = selectedDol || currentDol;

    try {
      toast.info("Generating full weather & loss justification report…", { duration: 6000 });
      const res = await fetch("/api/weather/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: fullAddress,
          dol: effectiveDol || null,
          lossType: lossType === "none" ? null : lossType,
          claim_id: claimId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const step = data.step as string | undefined;
        const stepMessages: Record<string, string> = {
          ai_generation: "AI weather analysis failed — try again in a moment.",
          db_save: "Report generated but couldn't be saved. Try again.",
          rate_limit: "Too many requests — please wait a minute.",
          billing: "Token balance issue — check billing settings.",
        };
        throw new Error(
          (step && stepMessages[step]) || data.error || `Request failed (${res.status})`
        );
      }

      const data = (await res.json()) as WeatherReportApiResponse;
      setReportResult(data);
      await loadSavedScans();

      if (data.pdfSaved && data.pdfUrl) {
        toast.success("Weather report generated with PDF!");
        window.open(data.pdfUrl, "_blank");
      } else if (data.pdfError) {
        toast.warning(
          "Report data saved, but PDF generation failed. You can retry from Report History.",
          { duration: 8000 }
        );
      } else {
        toast.success("Weather report generated and saved!");
      }
    } catch (err) {
      logger.error("Weather report error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate weather report.");
    } finally {
      setIsReportRunning(false);
    }
  }

  // ── Categorize saved scans ──
  function categorizeScan(scan: SavedScan): string {
    const peril = (scan.primaryPeril || scan.lossType || "").toLowerCase();
    if (peril.includes("hail") && peril.includes("wind")) return "hail_wind";
    if (peril.includes("hail")) return "hail";
    if (peril.includes("wind")) return "wind";
    if (peril.includes("tropical") || peril.includes("hurricane")) return "tropical";
    if (peril.includes("water") || peril.includes("flood") || peril.includes("rain"))
      return "water";
    return "other";
  }

  const scanCategories = [
    { key: "hail", label: "Hail", emoji: "🧊" },
    { key: "wind", label: "Wind", emoji: "💨" },
    { key: "hail_wind", label: "Hail & Wind", emoji: "⚡" },
    { key: "tropical", label: "Tropical Storm", emoji: "🌀" },
    { key: "water", label: "Water / Flood", emoji: "🌊" },
    { key: "other", label: "Other / Auto", emoji: "📊" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      {/* ── Current DOL Banner ── */}
      {currentDol && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-green-950/30">
          <div className="flex items-center gap-3">
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                Current Date of Loss on Claim
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {new Date(currentDol).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Quick DOL Scan ── */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick DOL Scan
          </h2>
          <p className="text-sm text-muted-foreground">
            Find likely dates of loss based on address, peril type, and time window. Each scan is
            automatically saved to this claim.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                placeholder="678 N Blanco Ct"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Dewey"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="addr-state">State</Label>
                <Input
                  id="addr-state"
                  placeholder="AZ"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="zip">Zip Code</Label>
                <Input
                  id="zip"
                  placeholder="86327"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="loss-type">Loss Type</Label>
              <Select
                value={lossType || "NONE"}
                onValueChange={(v) => setLossType(v === "NONE" ? "none" : (v as typeof lossType))}
              >
                <SelectTrigger id="loss-type">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Auto Detect</SelectItem>
                  <SelectItem value="hail">🧊 Hail</SelectItem>
                  <SelectItem value="wind">💨 Wind</SelectItem>
                  <SelectItem value="water">🌊 Water</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">Date From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="date-to">Date To</Label>
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
                Run Quick DOL Scan
              </>
            )}
          </Button>

          {error && !isReportRunning && !reportResult && (
            <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </Card>
          )}

          {/* DOL Candidates from current scan */}
          {quickDolResult && (
            <Card className="border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-100">
                <CheckCircle className="h-4 w-4" />
                DOL Candidates ({quickDolResult.candidates.length})
              </h3>
              <div className="space-y-2">
                {quickDolResult.candidates.map((c) => (
                  <div
                    key={c.date}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      selectedDol === c.date
                        ? "border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-800/40"
                        : "border-transparent hover:bg-blue-100/50 dark:hover:bg-blue-800/30"
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
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {new Date(c.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        <Badge variant="secondary">
                          {Math.round((c.confidence ?? 0) * 100)}% confidence
                        </Badge>
                        {c.perilType && (
                          <Badge className={PERIL_COLORS[c.perilType] || PERIL_COLORS.other}>
                            {c.perilType}
                          </Badge>
                        )}
                      </div>
                      {c.reasoning && (
                        <p className="mt-1 text-sm text-muted-foreground">{c.reasoning}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchRadar(c.date)}
                        disabled={loadingRadar}
                        title="View radar imagery for this date"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Radar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDolOnClaim(c.date, quickDolResult.scanId || undefined)}
                        disabled={settingDol === c.date || currentDol === c.date}
                        className={
                          currentDol === c.date ? "bg-emerald-600" : "bg-blue-600 hover:bg-blue-700"
                        }
                      >
                        {settingDol === c.date ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : currentDol === c.date ? (
                          <>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Current DOL
                          </>
                        ) : (
                          <>
                            <CalendarCheck className="mr-1 h-3.5 w-3.5" />
                            Set as DOL
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
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

      {/* ── Radar Preview ── */}
      {radarImages.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b bg-slate-50 px-5 py-3 dark:bg-slate-800/50">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 text-red-500" />
              NEXRAD Radar Imagery
              {radarStation && (
                <Badge variant="outline" className="ml-2">
                  Station: {radarStation}
                </Badge>
              )}
            </h3>
          </div>
          <div className="p-5">
            <div className="mb-4 flex justify-center">
              <div className="relative w-full max-w-lg overflow-hidden rounded-lg border bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={radarImages[selectedRadarIdx]?.url}
                  alt={radarImages[selectedRadarIdx]?.label || "Radar image"}
                  className="h-auto w-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%231e293b' width='400' height='300'/%3E%3Ctext fill='%2394a3b8' x='200' y='150' text-anchor='middle' font-size='14'%3ERadar image not available for this time%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                  {radarImages[selectedRadarIdx]?.label}
                </div>
              </div>
            </div>

            {/* Time slider */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Time:</span>
              <input
                type="range"
                min={0}
                max={radarImages.length - 1}
                value={selectedRadarIdx}
                onChange={(e) => setSelectedRadarIdx(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="min-w-[80px] text-right text-xs font-medium">
                {radarImages[selectedRadarIdx]?.label.split("—")[1]?.trim() || ""}
              </span>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Source: Iowa Environmental Mesonet NEXRAD Archive / NWS RIDGE. Drag the slider to see
              radar at different times of day.
            </p>
          </div>
        </Card>
      )}

      {loadingRadar && (
        <Card className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-500" />
          <span className="text-sm text-muted-foreground">Loading radar imagery…</span>
        </Card>
      )}

      {/* ── Saved Scans History ── */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <History className="h-5 w-5 text-violet-500" />
              Saved Weather Scans
            </h2>
            <p className="text-sm text-muted-foreground">
              All scans for this claim organized by peril type. Select any date to set it as the
              DOL.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadSavedScans} disabled={loadingScans}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loadingScans ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadingScans ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : savedScans.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed py-8 text-center text-muted-foreground">
            <CloudRain className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="font-medium">No saved scans yet</p>
            <p className="text-sm">Run a Quick DOL scan above to get started</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">All ({savedScans.length})</TabsTrigger>
              {scanCategories.map((cat) => {
                const count = savedScans.filter((s) => categorizeScan(s) === cat.key).length;
                if (count === 0) return null;
                return (
                  <TabsTrigger key={cat.key} value={cat.key}>
                    {cat.emoji} {cat.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {["all", ...scanCategories.map((c) => c.key)].map((tabKey) => {
              const filtered =
                tabKey === "all"
                  ? savedScans
                  : savedScans.filter((s) => categorizeScan(s) === tabKey);

              return (
                <TabsContent key={tabKey} value={tabKey} className="space-y-3">
                  {filtered.map((scan) => (
                    <SavedScanCard
                      key={scan.id}
                      scan={scan}
                      currentDol={currentDol}
                      settingDol={settingDol}
                      onSetDol={(dol) => setDolOnClaim(dol, scan.id)}
                      onSelectDol={(dol) => setSelectedDol(dol)}
                      onViewRadar={(date) => fetchRadar(date)}
                      loadingRadar={loadingRadar}
                      categorizeScan={categorizeScan}
                    />
                  ))}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </Card>

      {/* ── Full Weather & Loss Justification Report ── */}
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-emerald-500" />
            Full Weather & Loss Justification Report
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate a comprehensive multi-page weather report with event data, radar evidence, and
            carrier-ready justification using the selected DOL.
          </p>
        </div>

        {/* Context summary */}
        <Card className="mb-4 bg-muted/50 p-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Address:</span>{" "}
              <span className={fullAddress ? "" : "italic text-muted-foreground"}>
                {fullAddress || "Enter above ↑"}
              </span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Date of Loss:</span>{" "}
              <span
                className={
                  selectedDol || currentDol
                    ? "font-semibold text-emerald-700 dark:text-emerald-400"
                    : "italic text-muted-foreground"
                }
              >
                {selectedDol || currentDol
                  ? new Date(selectedDol || currentDol!).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Run Quick DOL first ↑"}
              </span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Loss Type:</span>{" "}
              {lossType !== "none" ? lossType : "Auto detect"}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Claim:</span> {claimId}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Button
            onClick={runWeatherReport}
            disabled={isReportRunning || (!selectedDol && !currentDol) || !fullAddress.trim()}
            size="lg"
            className={
              (selectedDol || currentDol) && fullAddress.trim()
                ? "bg-emerald-600 hover:bg-emerald-700"
                : ""
            }
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

          {!selectedDol && !currentDol && !isReportRunning && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠️ Run Quick DOL above and select a candidate date, or set a DOL on the claim before
              generating the full report.
            </p>
          )}

          {error && !reportResult && (
            <Card className="border-red-200 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-red-500">⚠️</span>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">
                    Report Generation Failed
                  </p>
                  <p className="mt-1 text-red-600 dark:text-red-400">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setError(null);
                      runWeatherReport();
                    }}
                    disabled={isReportRunning}
                  >
                    Retry
                  </Button>
                </div>
              </div>
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
                {reportResult.pdfError && !reportResult.pdfSaved && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="font-medium text-amber-700 dark:text-amber-300">
                      ⚠️ PDF generation failed
                    </p>
                    <p className="mt-1 text-amber-600 dark:text-amber-400">
                      Report data was saved successfully. PDF can be retried from Report History.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setReportResult(null);
                        runWeatherReport();
                      }}
                      disabled={isReportRunning}
                    >
                      Retry Report with PDF
                    </Button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {reportResult.pdfUrl && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-green-200 pt-4 dark:border-green-700">
                  <Button
                    size="sm"
                    onClick={() => window.open(reportResult.pdfUrl!, "_blank")}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch(reportResult.pdfUrl!);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `weather-report-${claimId}.pdf`;
                        link.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        // Fallback: open in new tab
                        window.open(reportResult.pdfUrl!, "_blank");
                      }
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              )}

              <p className="mt-3 border-t border-green-200 pt-3 text-xs text-muted-foreground dark:border-green-700">
                This report is available in Claim Files, Reports History, and can be referenced in
                Estimate, Supplement, and Claims Assembly builders.
              </p>
            </Card>
          )}

          {/* ── Saved Weather Reports ── */}
          {savedWeatherReports.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileText className="h-4 w-4" />
                Previously Generated Weather Reports ({savedWeatherReports.length})
              </h3>
              <div className="space-y-2">
                {savedWeatherReports.map((report) => (
                  <Card
                    key={report.id}
                    className="flex items-center justify-between border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-emerald-600" />
                        Weather Report
                        {report.primaryPeril && (
                          <Badge
                            className={
                              PERIL_COLORS[report.primaryPeril.toLowerCase()] || PERIL_COLORS.other
                            }
                          >
                            {report.primaryPeril}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {report.address} •{" "}
                        {new Date(report.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      {report.summary && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {report.summary}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 gap-2">
                      {report.pdfUrl ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => window.open(report.pdfUrl!, "_blank")}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={async () => {
                              try {
                                const res = await fetch(report.pdfUrl!);
                                const blob = await res.blob();
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `weather-report-${report.id}.pdf`;
                                link.click();
                                URL.revokeObjectURL(url);
                              } catch {
                                window.open(report.pdfUrl!, "_blank");
                              }
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20"
                          onClick={async () => {
                            const toastId = toast.loading("Retrying PDF generation...");
                            try {
                              const res = await fetch(
                                `/api/weather/report/${report.reportId}/retry-pdf`,
                                { method: "POST" }
                              );
                              const data = await res.json();
                              if (!res.ok) {
                                throw new Error(data.error || "Retry failed");
                              }
                              toast.success("PDF generated successfully!", { id: toastId });
                              // Update the report in state with the new PDF URL
                              setSavedWeatherReports((prev) =>
                                prev.map((r) =>
                                  r.id === report.id ? { ...r, pdfUrl: data.pdfUrl } : r
                                )
                              );
                            } catch (err) {
                              logger.error("[WEATHER] PDF retry failed:", err);
                              toast.error(err instanceof Error ? err.message : "PDF retry failed", {
                                id: toastId,
                              });
                            }
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Retry PDF
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Delete this weather report? This removes the report and any generated PDF. Raw weather data is not affected."
                            )
                          )
                            return;
                          try {
                            const res = await fetch(`/api/weather/report/${report.reportId}`, {
                              method: "DELETE",
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              throw new Error(err.error || "Delete failed");
                            }
                            setSavedWeatherReports((prev) =>
                              prev.filter((r) => r.id !== report.id)
                            );
                            toast.success("Weather report deleted");
                          } catch (err) {
                            logger.error("[WEATHER] Delete failed:", err);
                            toast.error(
                              err instanceof Error ? err.message : "Failed to delete report"
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ─── Saved Scan Card Component ─────────────────────────────────────────────

function SavedScanCard({
  scan,
  currentDol,
  settingDol,
  onSetDol,
  onSelectDol,
  onViewRadar,
  loadingRadar,
  categorizeScan,
}: {
  scan: SavedScan;
  currentDol: string | null;
  settingDol: string | null;
  onSetDol: (dol: string) => void;
  onSelectDol: (dol: string) => void;
  onViewRadar: (date: string) => void;
  loadingRadar: boolean;
  categorizeScan: (scan: SavedScan) => string;
}) {
  const candidates = (scan.candidateDates || []) as QuickDolCandidate[];
  const isCurrentDol =
    scan.dol && currentDol && scan.dol.split("T")[0] === currentDol.split("T")[0];
  const peril = scan.primaryPeril || scan.lossType || "auto";

  return (
    <Card
      className={`overflow-hidden transition-all ${
        isCurrentDol ? "border-emerald-300 ring-1 ring-emerald-200" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          {PERIL_ICONS[peril] || <CloudRain className="h-4 w-4 text-slate-400" />}
          <span className="text-sm font-semibold">
            {scan.mode === "quick_dol" ? "Quick DOL Scan" : "Full Weather Report"}
          </span>
          <Badge className={PERIL_COLORS[peril] || PERIL_COLORS.other}>{peril}</Badge>
          {isCurrentDol && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              ✓ Active DOL
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(scan.createdAt).toLocaleDateString()} at{" "}
          {new Date(scan.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 text-xs text-muted-foreground">
          📍 {scan.address}
          {scan.periodFrom && scan.periodTo && (
            <span className="ml-2">
              | {new Date(scan.periodFrom).toLocaleDateString()} –{" "}
              {new Date(scan.periodTo).toLocaleDateString()}
            </span>
          )}
        </div>

        {candidates.length > 0 ? (
          <div className="space-y-1.5">
            {candidates.map((c, i) => {
              const isActive = currentDol && c.date === currentDol.split("T")[0];
              return (
                <div
                  key={`${scan.id}-${i}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {new Date(c.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round((c.confidence ?? 0) * 100)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onViewRadar(c.date)}
                      disabled={loadingRadar}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Radar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => onSelectDol(c.date)}
                    >
                      Select
                    </Button>
                    <Button
                      size="sm"
                      className={`h-7 px-2 text-xs ${
                        isActive
                          ? "bg-emerald-600 hover:bg-emerald-600"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      onClick={() => onSetDol(c.date)}
                      disabled={!!settingDol || !!isActive}
                    >
                      {settingDol === c.date ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isActive ? (
                        "✓ DOL"
                      ) : (
                        "Set as DOL"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : scan.dol ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span className="font-medium">
              {new Date(scan.dol).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <Button
              size="sm"
              className="h-7 bg-blue-600 px-2 text-xs hover:bg-blue-700"
              onClick={() => onSetDol(scan.dol!.split("T")[0])}
              disabled={!!settingDol}
            >
              Set as DOL
            </Button>
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">No candidate dates in this scan</p>
        )}

        {scan.globalSummary?.notes && (
          <p className="mt-2 text-xs text-muted-foreground">{scan.globalSummary.notes}</p>
        )}
      </div>
    </Card>
  );
}
