"use client";

import { Calculator, DollarSign, Package, RotateCcw, Truck } from "lucide-react";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  // State
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeStatus, setRouteStatus] = useState<"idle" | "routing" | "routed">("idle");

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

                {/* Route to ABC Supply */}
                <Button
                  onClick={handleRouteToABC}
                  disabled={routeStatus !== "idle"}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  {routeStatus === "routing" ? (
                    "Routing to ABC Supply..."
                  ) : routeStatus === "routed" ? (
                    <>
                      <Truck className="mr-2 h-4 w-4" />✅ Routed to ABC Supply
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Route to ABC Supply
                    </>
                  )}
                </Button>
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
    </PageContainer>
  );
}
