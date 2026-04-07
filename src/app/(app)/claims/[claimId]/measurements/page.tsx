// src/app/(app)/claims/[claimId]/measurements/page.tsx
"use client";

/**
 * Claim-scoped Measurements Tab
 *
 * Order, track, and view roof / siding / gutter measurements
 * from GAF QuickMeasure, EagleView, or manual upload — scoped
 * to this claim's property.
 */

import { CheckCircle2, Clock, Download, Loader2, Plus, Ruler, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MeasurementOrder {
  id: string;
  property_address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  provider: string;
  order_type: string;
  status: string;
  report_url: string | null;
  measurements: Record<string, unknown> | null;
  external_id: string | null;
  ordered_by: string;
  ordered_at: string;
  completed_at: string | null;
  failure_reason: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function statusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "processing":
    case "pending":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400" />;
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-orange-100 text-orange-700",
  };
  return (
    <Badge className={map[status] ?? "bg-slate-100 text-slate-600"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function providerLabel(provider: string) {
  const map: Record<string, string> = {
    gaf: "GAF QuickMeasure",
    eagleview: "EagleView",
    manual: "Manual Upload",
  };
  return map[provider] ?? provider;
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    roof: "Roof",
    siding: "Siding",
    gutters: "Gutters",
    full: "Full Property",
  };
  return map[type] ?? type;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ClaimMeasurementsPage() {
  const params = useParams();
  const claimId = (params?.claimId ?? "") as string;

  const [orders, setOrders] = useState<MeasurementOrder[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Create form ──────────────────────────────────────────────── */
  const [createOpen, setCreateOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [provider, setProvider] = useState("gaf");
  const [orderType, setOrderType] = useState("roof");
  const [creating, setCreating] = useState(false);

  /* ── Manual measurement entry ─────────────────────────────────── */
  const [manualOpen, setManualOpen] = useState(false);
  const [manualArea, setManualArea] = useState("");
  const [manualType, setManualType] = useState("roof");
  const [manualNotes, setManualNotes] = useState("");
  const [manualPitch, setManualPitch] = useState("");
  const [manualPerimeter, setManualPerimeter] = useState("");
  const [manualRidges, setManualRidges] = useState("");
  const [manualValleys, setManualValleys] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  /* ── Fetch ────────────────────────────────────────────────────── */

  const fetchOrders = useCallback(async () => {
    try {
      // Fetch measurements scoped to this claim
      const res = await fetch(`/api/measurements?claimId=${claimId}`);
      const data = await res.json();
      if (data.ok) setOrders(data.orders ?? []);
    } catch (err) {
      logger.error("[MEASUREMENTS] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  /* ── Create ───────────────────────────────────────────────────── */

  async function handleCreate() {
    if (!address) return;
    setCreating(true);
    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyAddress: address,
          provider,
          orderType,
          claimId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreateOpen(false);
        setAddress("");
        setProvider("gaf");
        setOrderType("roof");
        await fetchOrders();
      }
    } catch (err) {
      logger.error("[MEASUREMENTS] create error:", err);
    } finally {
      setCreating(false);
    }
  }

  /* ── Stats ────────────────────────────────────────────────────── */

  async function handleManualCreate() {
    if (!manualArea) return;
    setManualSaving(true);
    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyAddress: "Manual Entry",
          provider: "manual",
          orderType: manualType,
          claimId,
          measurements: {
            totalArea: parseFloat(manualArea) || 0,
            pitch: manualPitch || null,
            perimeter: parseFloat(manualPerimeter) || null,
            ridges: parseFloat(manualRidges) || null,
            valleys: parseFloat(manualValleys) || null,
            notes: manualNotes || null,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setManualOpen(false);
        setManualArea("");
        setManualType("roof");
        setManualNotes("");
        setManualPitch("");
        setManualPerimeter("");
        setManualRidges("");
        setManualValleys("");
        await fetchOrders();
      }
    } catch (err) {
      logger.error("[MEASUREMENTS] manual create error:", err);
    } finally {
      setManualSaving(false);
    }
  }

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending" || o.status === "processing").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHero
        title="Measurements"
        subtitle="Order roof, siding & gutter measurements for this claim"
        icon={<Ruler className="h-6 w-6" />}
        actions={
          <div className="flex gap-2">
            <Link href="/measurements">
              <Button variant="outline" size="sm">
                <Ruler className="mr-2 h-4 w-4" />
                All Measurements
              </Button>
            </Link>
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Ruler className="mr-2 h-4 w-4" />
                  Add Hand Measurements
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Hand Measurements</DialogTitle>
                  <DialogDescription>
                    Enter measurements gathered on-site for this claim.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Measurement Type</Label>
                      <Select value={manualType} onValueChange={setManualType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="roof">Roof</SelectItem>
                          <SelectItem value="siding">Siding</SelectItem>
                          <SelectItem value="gutters">Gutters</SelectItem>
                          <SelectItem value="full">Full Property</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Total Area (sq ft)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 2400"
                        value={manualArea}
                        onChange={(e) => setManualArea(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pitch</Label>
                      <Input
                        placeholder="e.g. 6/12"
                        value={manualPitch}
                        onChange={(e) => setManualPitch(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Perimeter (ft)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 320"
                        value={manualPerimeter}
                        onChange={(e) => setManualPerimeter(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ridges (ft)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 45"
                        value={manualRidges}
                        onChange={(e) => setManualRidges(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Valleys (ft)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 30"
                        value={manualValleys}
                        onChange={(e) => setManualValleys(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      placeholder="Additional notes about the measurements..."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setManualOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleManualCreate} disabled={manualSaving || !manualArea}>
                    {manualSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Measurements
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Order Measurement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Order Measurement</DialogTitle>
                  <DialogDescription>
                    Order a measurement report for this claim&apos;s property.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Property Address</Label>
                    <Input
                      placeholder="123 Main St, Phoenix, AZ 85001"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Provider</Label>
                      <Select value={provider} onValueChange={setProvider}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gaf">GAF QuickMeasure</SelectItem>
                          <SelectItem value="eagleview">EagleView</SelectItem>
                          <SelectItem value="manual">Manual Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={orderType} onValueChange={setOrderType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="roof">Roof</SelectItem>
                          <SelectItem value="siding">Siding</SelectItem>
                          <SelectItem value="gutters">Gutters</SelectItem>
                          <SelectItem value="full">Full Property</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={creating || !address}>
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Order Now
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-slate-500">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
              <p className="text-xs text-slate-500">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
              <Ruler className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No measurements yet
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Order a roof, siding, or gutter measurement from GAF QuickMeasure or EagleView to get
              started.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Order First Measurement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {statusIcon(order.status)}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {order.property_address}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{providerLabel(order.provider)}</span>
                        <span>·</span>
                        <span>{typeLabel(order.order_type)}</span>
                        <span>·</span>
                        <span>
                          {new Date(order.ordered_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {statusBadge(order.status)}
                    {order.report_url && (
                      <a
                        href={order.report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Failure reason */}
                {order.status === "failed" && order.failure_reason && (
                  <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {order.failure_reason}
                  </div>
                )}

                {/* Completed measurements preview */}
                {order.status === "completed" && order.measurements && (
                  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/10">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Report ready — measurement data available
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
