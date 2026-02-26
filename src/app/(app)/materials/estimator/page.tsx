"use client";

import {
  Bookmark,
  Calculator,
  CheckCircle,
  Clock,
  DollarSign,
  Link2,
  Mail,
  MoreVertical,
  Package,
  RotateCcw,
  Send,
  Trash2,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { ClaimJobSelect, type ClaimJobSelection } from "@/components/selectors/ClaimJobSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types matching the API response shape ───────────────────────────────────
interface MaterialLine {
  category: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  coverage?: string;
}

interface EstimateResult {
  id: string;
  materials: MaterialLine[];
  totalCost: number;
  wasteFactor: number;
  measurements: {
    totalArea: number;
    pitch: string;
  };
}

interface SavedEstimate {
  id: string;
  jobId?: string;
  claimId?: string;
  jobLabel: string;
  createdAt: string;
  totalArea: number;
  pitch: string;
  shingleType: string;
  materials: MaterialLine[];
  totalCost: number;
  wasteFactor: number;
}

// ── Pitch options — value is the actual pitch string the API expects ────────
const ROOF_PITCHES = [
  { label: "Flat (2/12)", value: "2/12" },
  { label: "Low (4/12)", value: "4/12" },
  { label: "Standard (6/12)", value: "6/12" },
  { label: "Moderate (8/12)", value: "8/12" },
  { label: "Steep (10/12)", value: "10/12" },
  { label: "Very Steep (12/12)", value: "12/12" },
];

// ── Shingle types — value matches ShingleSpec.type ─────────────────────────
const SHINGLE_TYPES = [
  { label: "3-Tab Asphalt", value: "THREE_TAB" },
  { label: "Architectural Shingle", value: "ARCHITECTURAL" },
  { label: "Designer / Premium", value: "PREMIUM" },
];

// ── Complexity — matches WASTE_FACTORS keys ────────────────────────────────
const COMPLEXITY_OPTIONS = [
  { label: "Simple (gable)", value: "LOW" },
  { label: "Moderate (hip, some valleys)", value: "MEDIUM" },
  { label: "Complex (multiple valleys/dormers)", value: "HIGH" },
  { label: "Very Complex (turrets, multi-level)", value: "VERY_HIGH" },
];

export default function MaterialEstimatorPage() {
  // Measurements
  const [totalArea, setTotalArea] = useState("");
  const [pitch, setPitch] = useState("6/12");
  const [complexity, setComplexity] = useState("MEDIUM");
  const [ridgeLf, setRidgeLf] = useState("");
  const [hipLf, setHipLf] = useState("");
  const [valleyLf, setValleyLf] = useState("");
  const [eaveLf, setEaveLf] = useState("");
  const [rakeLf, setRakeLf] = useState("");

  // Shingle
  const [shingleType, setShingleType] = useState("ARCHITECTURAL");

  // Job context
  const [jobContext, setJobContext] = useState<ClaimJobSelection>({});
  const [jobLabel, setJobLabel] = useState("");

  // State
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeStatus, setRouteStatus] = useState<"idle" | "routing" | "routed">("idle");

  // Saved estimates
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [estimatesLoading, setEstimatesLoading] = useState(true);

  // ── Fetch saved estimates from DB on mount ────────────────────────────────
  const loadEstimates = useCallback(async () => {
    try {
      const res = await fetch("/api/materials/estimates");
      const data = await res.json();
      if (data.ok && data.estimates) {
        setSavedEstimates(data.estimates);
      }
    } catch {
      /* silently fail — estimates panel just stays empty */
    } finally {
      setEstimatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  // ── Auto-estimate linear feet from area if user leaves them blank ────────
  function deriveLinearFeet(areaNum: number) {
    const side = Math.sqrt(areaNum);
    return {
      ridgeLength: ridgeLf ? Number(ridgeLf) : Math.round(side),
      hipLength: hipLf ? Number(hipLf) : 0,
      valleyLength: valleyLf ? Number(valleyLf) : 0,
      eaveLength: eaveLf ? Number(eaveLf) : Math.round(side * 2),
      rakeLength: rakeLf ? Number(rakeLf) : Math.round(side * 2),
    };
  }

  const handleEstimate = async () => {
    const areaNum = Number(totalArea);
    if (!totalArea || areaNum <= 0) {
      setError("Enter a valid roof area in square feet");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const derived = deriveLinearFeet(areaNum);

      const res = await fetch("/api/materials/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate",
          measurements: {
            totalArea: areaNum,
            pitch,
            complexity,
            ...derived,
          },
          shingleSpec: {
            type: shingleType,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Estimation failed");
      }

      setResult(data.estimate);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Estimation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRouteToABC = async () => {
    if (!result) return;
    setRouteStatus("routing");
    try {
      const res = await fetch("/api/materials/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "route",
          estimate: result,
          jobSiteZip: "86001",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to route to ABC Supply");
      }
      setRouteStatus("routed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Routing failed");
      setRouteStatus("idle");
    }
  };

  const handleReset = () => {
    setTotalArea("");
    setPitch("6/12");
    setComplexity("MEDIUM");
    setShingleType("ARCHITECTURAL");
    setRidgeLf("");
    setHipLf("");
    setValleyLf("");
    setEaveLf("");
    setRakeLf("");
    setResult(null);
    setError("");
    setRouteStatus("idle");
  };

  // ── Save current estimate to DB ────────────────────────────────────────────
  const handleSaveEstimate = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/materials/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobContext.jobId,
          claimId: jobContext.claimId || jobContext.resolvedClaimId,
          jobLabel: jobLabel || "Unlinked Estimate",
          totalArea: result.measurements.totalArea,
          pitch: result.measurements.pitch,
          shingleType,
          wasteFactor: result.wasteFactor,
          materials: result.materials,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      await loadEstimates(); // re-fetch full list from DB
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      setError("Failed to save estimate");
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/estimates?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setSavedEstimates((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to delete estimate");
    }
  };

  // ── Transfer estimate to ABC Supply order ──────────────────────────────────
  const handleTransferToOrder = async (est: SavedEstimate) => {
    try {
      const res = await fetch("/api/materials/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "route",
          estimate: {
            materials: est.materials,
            totalCost: est.totalCost,
            wasteFactor: est.wasteFactor,
            measurements: { totalArea: est.totalArea, pitch: est.pitch },
          },
          jobSiteZip: "86001",
        }),
      });
      if (!res.ok) throw new Error("Route failed");
      alert("✅ Estimate transferred to ABC Supply!");
    } catch {
      alert("Failed to route — try again.");
    }
  };

  // ── Build materials text for email ─────────────────────────────────────────
  const buildMaterialsText = (est: SavedEstimate) => {
    const lines = est.materials.map(
      (m) => `${m.productName}: ${m.quantity} ${m.unit} ($${m.totalPrice.toLocaleString()})`
    );
    return [
      `Material Estimate — ${est.jobLabel}`,
      `Date: ${new Date(est.createdAt).toLocaleDateString()}`,
      `Roof: ${est.totalArea} sq ft • ${est.pitch} pitch`,
      ``,
      ...lines,
      ``,
      `Total: $${est.totalCost.toLocaleString()}`,
      ``,
      `— Generated by SkaiScraper`,
    ].join("%0A");
  };

  const handleRequestQuote = (est: SavedEstimate) => {
    const subject = encodeURIComponent(
      `Quote Request — ${est.jobLabel} (${est.materials.length} items)`
    );
    const body = buildMaterialsText(est);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleEmailPartner = (est: SavedEstimate) => {
    const subject = encodeURIComponent(`Materials List — ${est.jobLabel}`);
    const body = buildMaterialsText(est);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  // ── Attach estimate as a document link to the job/claim ──────────────────
  const handleAttachToJobDocs = async (est: SavedEstimate) => {
    if (!est.jobId && !est.claimId) {
      alert("This estimate isn't linked to a job or claim. Save it with a job first.");
      return;
    }
    try {
      const res = await fetch("/api/documents/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "estimate",
          sourceId: est.id,
          jobId: est.jobId || null,
          claimId: est.claimId || null,
          title: `Material Estimate — ${est.jobLabel}`,
          url: `/materials/estimator?load=${est.id}`,
          mimeType: "application/json",
          sizeBytes: null,
          category: "estimate",
        }),
      });
      if (res.ok) {
        alert("✅ Estimate attached to job documents!");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to attach");
      }
    } catch {
      alert("Failed to attach estimate to job docs");
    }
  };

  // ── Derived stats for the results header ─────────────────────────────────
  const totalSquares = result ? (result.measurements.totalArea / 100).toFixed(1) : null;
  const wasteLabel = result?.wasteFactor ? `${Math.round((result.wasteFactor - 1) * 100)}%` : null;

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="trades"
        title="Material Estimator"
        subtitle="Calculate materials from roof measurements. Route orders to ABC Supply with one click."
        icon={<Calculator className="h-7 w-7" />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Input Form ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Roof Measurements</CardTitle>
            <CardDescription>
              Enter measurements from your inspection or Xactimate sketch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Link to Job / Claim */}
            <div className="space-y-2">
              <Label>Link to Job / Claim (optional)</Label>
              <ClaimJobSelect
                value={jobContext}
                onValueChange={(next) => {
                  setJobContext(next);
                  // Derive label for saved estimates
                  const el = document.querySelector(
                    "[data-radix-select-viewport] [data-state=checked]"
                  );
                  setJobLabel(el?.textContent || "Linked Job");
                }}
                placeholder="Link estimate to a job or claim…"
              />
            </div>

            {/* Total Area */}
            <div className="space-y-2">
              <Label htmlFor="sqft">Total Roof Area (sq ft) *</Label>
              <Input
                id="sqft"
                type="number"
                placeholder="2400"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value)}
              />
            </div>

            {/* Pitch & Complexity side-by-side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Roof Pitch</Label>
                <Select value={pitch} onValueChange={setPitch}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOF_PITCHES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Complexity</Label>
                <Select value={complexity} onValueChange={setComplexity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLEXITY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Shingle Type */}
            <div className="space-y-2">
              <Label>Shingle Type</Label>
              <Select value={shingleType} onValueChange={setShingleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHINGLE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Linear measurements — optional, auto-estimated if blank */}
            <div>
              <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                Linear Measurements (optional — estimated from area if blank)
              </Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="ridge" className="text-xs">
                    Ridge (ft)
                  </Label>
                  <Input
                    id="ridge"
                    type="number"
                    placeholder="auto"
                    value={ridgeLf}
                    onChange={(e) => setRidgeLf(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hip" className="text-xs">
                    Hip (ft)
                  </Label>
                  <Input
                    id="hip"
                    type="number"
                    placeholder="0"
                    value={hipLf}
                    onChange={(e) => setHipLf(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="valley" className="text-xs">
                    Valley (ft)
                  </Label>
                  <Input
                    id="valley"
                    type="number"
                    placeholder="0"
                    value={valleyLf}
                    onChange={(e) => setValleyLf(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="eave" className="text-xs">
                    Eave (ft)
                  </Label>
                  <Input
                    id="eave"
                    type="number"
                    placeholder="auto"
                    value={eaveLf}
                    onChange={(e) => setEaveLf(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rake" className="text-xs">
                    Rake (ft)
                  </Label>
                  <Input
                    id="rake"
                    type="number"
                    placeholder="auto"
                    value={rakeLf}
                    onChange={(e) => setRakeLf(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleEstimate} disabled={isLoading} className="flex-1">
                {isLoading ? (
                  "Calculating..."
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Materials
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Results ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Material List
            </CardTitle>
            <CardDescription>
              {result
                ? `${totalSquares} squares • ${wasteLabel} waste • ${pitch} pitch`
                : "Enter measurements and click Calculate"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  {result.materials.map((mat, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {mat.productName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {mat.category}
                          {mat.coverage ? ` • ${mat.coverage}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {mat.quantity}
                        </span>
                        <span className="ml-1 text-sm text-slate-500">{mat.unit}</span>
                        <p className="text-xs text-slate-400">${mat.totalPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Cost */}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <DollarSign className="h-4 w-4" />
                    Estimated Total
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    ${result.totalCost.toLocaleString()}
                  </span>
                </div>

                {/* Actions row */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleRouteToABC}
                    disabled={routeStatus !== "idle"}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  >
                    {routeStatus === "routing" ? (
                      "Routing..."
                    ) : routeStatus === "routed" ? (
                      <>
                        <Truck className="mr-2 h-4 w-4" />✅ Routed
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        ABC Supply
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSaveEstimate}
                    variant={saveSuccess ? "default" : "outline"}
                    className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Bookmark className="mr-2 h-4 w-4" />
                        Save Estimate
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package className="mb-3 h-12 w-12 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Material list will appear here after calculation
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ───────── SAVED ESTIMATES HOLDER ───────── */}
      {(savedEstimates.length > 0 || estimatesLoading) && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Bookmark className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Estimates</h2>
              <p className="text-sm text-slate-500">
                {estimatesLoading
                  ? "Loading saved estimates…"
                  : `${savedEstimates.length} estimate${savedEstimates.length !== 1 ? "s" : ""} — transfer to orders, request quotes, or email to partners`}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {savedEstimates.map((est) => (
              <div
                key={est.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-orange-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Header row */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{est.jobLabel}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {new Date(est.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* 3-dot action menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => handleTransferToOrder(est)}>
                        <Truck className="mr-2 h-4 w-4 text-orange-500" />
                        Transfer to ABC Supply
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRequestQuote(est)}>
                        <Send className="mr-2 h-4 w-4 text-blue-500" />
                        Request Vendor Quote
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEmailPartner(est)}>
                        <Mail className="mr-2 h-4 w-4 text-emerald-500" />
                        Email to Partner
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAttachToJobDocs(est)}>
                        <Link2 className="mr-2 h-4 w-4 text-purple-500" />
                        Attach to Job Docs
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteEstimate(est.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Estimate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Specs */}
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {est.totalArea.toLocaleString()} sq ft
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {est.pitch}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {est.materials.length} items
                  </span>
                </div>

                {/* Material summary (first 3 items) */}
                <div className="mb-3 space-y-1">
                  {est.materials.slice(0, 3).map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="truncate text-slate-600 dark:text-slate-400">
                        {m.productName}
                      </span>
                      <span className="ml-2 font-medium text-slate-900 dark:text-white">
                        {m.quantity} {m.unit}
                      </span>
                    </div>
                  ))}
                  {est.materials.length > 3 && (
                    <p className="text-xs text-slate-400">+{est.materials.length - 3} more items</p>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Estimated Total
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    ${est.totalCost.toLocaleString()}
                  </span>
                </div>

                {/* Bottom slide animation */}
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-orange-500 to-amber-500 transition-all group-hover:w-full" />
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
