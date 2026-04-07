"use client";

/**
 * Measurements Hub
 *
 * Order, track, and view roof / siding / gutter measurements from
 * GAF QuickMeasure, EagleView, or manual upload.
 */

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Home,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string; icon: typeof Clock }> = {
    pending: { label: "Pending", className: "bg-gray-100 text-gray-700", icon: Clock },
    processing: {
      label: "Processing",
      className: "bg-blue-100 text-blue-700",
      icon: Loader2,
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-700",
      icon: CheckCircle2,
    },
    failed: { label: "Failed", className: "bg-red-100 text-red-700", icon: XCircle },
    cancelled: {
      label: "Cancelled",
      className: "bg-orange-100 text-orange-700",
      icon: AlertTriangle,
    },
  };
  const cfg = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600", icon: Clock };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
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

export default function MeasurementsPage() {
  const [orders, setOrders] = useState<MeasurementOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  /* ── Create form ──────────────────────────────────────────────── */
  const [createOpen, setCreateOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [provider, setProvider] = useState("gaf");
  const [orderType, setOrderType] = useState("roof");
  const [creating, setCreating] = useState(false);

  /* ── Fetch ────────────────────────────────────────────────────── */

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/measurements");
      const data = await res.json();
      if (data.ok) setOrders(data.orders ?? []);
    } catch (err) {
      logger.error("[MEASUREMENTS] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          provider,
          orderType,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCreateOpen(false);
        resetForm();
        await fetchOrders();
      }
    } catch (err) {
      logger.error("[MEASUREMENTS] create error:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this measurement order?")) return;
    try {
      await fetch(`/api/measurements/${id}`, { method: "DELETE" });
      await fetchOrders();
    } catch (err) {
      logger.error("[MEASUREMENTS] cancel error:", err);
    }
  }

  function resetForm() {
    setAddress("");
    setCity("");
    setState("");
    setZip("");
    setProvider("gaf");
    setOrderType("roof");
  }

  /* ── Filter ───────────────────────────────────────────────────── */

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (
      search &&
      !o.property_address?.toLowerCase().includes(search.toLowerCase()) &&
      !o.city?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  /* ── Stats ────────────────────────────────────────────────────── */

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending" || o.status === "processing").length,
    completed: orders.filter((o) => o.status === "completed").length,
    failed: orders.filter((o) => o.status === "failed").length,
  };

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title="Measurements"
        subtitle="Order and track roof, siding, and gutter measurements"
        icon={<Ruler className="h-6 w-6" />}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Orders", value: stats.total, icon: Ruler, color: "text-slate-600" },
          { label: "In Progress", value: stats.pending, icon: Clock, color: "text-blue-600" },
          {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            color: "text-green-600",
          },
          { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-500" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 py-4">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-slate-500">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setLoading(true);
              void fetchOrders();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Order Measurements
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Order Measurements</DialogTitle>
              <DialogDescription>
                Enter the property address and select a measurement provider.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label>Property Address *</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>City</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Phoenix"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>State</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="AZ"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>ZIP</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="85001" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
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
                <div className="grid gap-1.5">
                  <Label>Measurement Type</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roof">Roof Only</SelectItem>
                      <SelectItem value="siding">Siding Only</SelectItem>
                      <SelectItem value="gutters">Gutters Only</SelectItem>
                      <SelectItem value="full">Full Property</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!address || creating}>
                {creating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Ruler className="mr-1.5 h-4 w-4" />
                )}
                Place Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Order list */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-16">
              <Ruler className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">
                {orders.length === 0
                  ? "No measurement orders yet. Click 'Order Measurements' to get started."
                  : "No orders match your filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((order) => (
            <Card key={order.id} className="border-0 shadow-sm transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                  <Home className="h-5 w-5 text-sky-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {order.property_address}
                    {order.city ? `, ${order.city}` : ""}
                    {order.state ? ` ${order.state}` : ""}
                    {order.zip ? ` ${order.zip}` : ""}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{providerLabel(order.provider)}</span>
                    <span>·</span>
                    <span>{typeLabel(order.order_type)}</span>
                    <span>·</span>
                    <span>Ordered {new Date(order.ordered_at).toLocaleDateString()}</span>
                    {order.completed_at && (
                      <>
                        <span>·</span>
                        <span>Completed {new Date(order.completed_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </p>
                </div>

                {statusBadge(order.status)}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {order.report_url && (
                      <DropdownMenuItem asChild>
                        <a href={order.report_url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" /> Download Report
                        </a>
                      </DropdownMenuItem>
                    )}
                    {(order.status === "pending" || order.status === "processing") && (
                      <DropdownMenuItem
                        onClick={() => handleCancel(order.id)}
                        className="text-red-600"
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Cancel Order
                      </DropdownMenuItem>
                    )}
                    {order.failure_reason && (
                      <DropdownMenuItem disabled>
                        <AlertTriangle className="mr-2 h-4 w-4" /> {order.failure_reason}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Provider info cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">GAF QuickMeasure</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Aerial roof measurements from GAF. Reports delivered in 1–4 hours. Includes waste
              factor, ridge, hip, valley, and rake lengths.
            </CardDescription>
            <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs" asChild>
              <a
                href="https://www.gaf.com/en-us/for-professionals/tools/quickmeasure"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">EagleView</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Premium aerial measurement reports for roof, siding, and gutters. 3D models available.
              Typically 2–6 hours turnaround.
            </CardDescription>
            <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-xs" asChild>
              <a href="https://www.eagleview.com" target="_blank" rel="noopener noreferrer">
                Learn more <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Manual Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Upload your own measurement reports from any source. Supports PDF, images, and
              Xactimate ESX files.
            </CardDescription>
            <Button variant="outline" size="sm" className="mt-2 gap-1 text-xs">
              <Upload className="h-3 w-3" /> Upload Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
