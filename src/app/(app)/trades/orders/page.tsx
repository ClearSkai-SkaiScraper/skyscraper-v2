/**
 * Trades — Create New Order / Order Management
 *
 * Scaffolded for eventual vendor integration:
 * - Browse vendor catalogs (Lowe's, Home Depot Pro, ABC Supply, etc.)
 * - Receipt capture + document sync
 * - Delivery scheduling
 * - Per-job material tracking
 *
 * Phase 1 (current): Manual order tracking with receipt upload
 * Phase 2 (future): Embedded vendor ordering portal
 */

"use client";

import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  DollarSign,
  Loader2,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Store,
  Truck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

/* ------------------------------------------------------------------ */
/*  Vendor Definitions (Future: pull from vendor API)                   */
/* ------------------------------------------------------------------ */
const VENDORS = [
  { id: "lowes", name: "Lowe's Pro", icon: "🏠", color: "bg-blue-600" },
  { id: "homedepot", name: "Home Depot Pro", icon: "🔶", color: "bg-orange-600" },
  { id: "abc_supply", name: "ABC Supply", icon: "📦", color: "bg-red-600" },
  { id: "srs", name: "SRS Distribution", icon: "🏗️", color: "bg-green-600" },
  { id: "beacon", name: "Beacon Building", icon: "🔵", color: "bg-indigo-600" },
  { id: "other", name: "Other Vendor", icon: "🏪", color: "bg-slate-600" },
];

const ORDER_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-slate-100 text-slate-700" },
  { value: "ordered", label: "Ordered", color: "bg-blue-100 text-blue-700" },
  { value: "shipped", label: "Shipped", color: "bg-amber-100 text-amber-700" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-700" },
  { value: "installed", label: "Installed", color: "bg-purple-100 text-purple-700" },
];

interface OrderDraft {
  vendor: string;
  jobId: string;
  items: string;
  estimatedTotal: string;
  deliveryDate: string;
  notes: string;
  receiptFile: File | null;
}

export default function TradesOrdersPage() {
  const [activeTab, setActiveTab] = useState("orders");
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ active: 0, inTransit: 0, delivered: 0, totalSpent: 0 });
  const [draft, setDraft] = useState<OrderDraft>({
    vendor: "",
    jobId: "",
    items: "",
    estimatedTotal: "",
    deliveryDate: "",
    notes: "",
    receiptFile: null,
  });

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/trades/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setStats(data.stats || { active: 0, inTransit: 0, delivered: 0, totalSpent: 0 });
      }
    } catch (e) {
      logger.error("Failed to fetch orders", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSaveOrder = async () => {
    if (!draft.vendor) {
      toast.error("Please select a vendor");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/trades/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor: draft.vendor,
          items: draft.items,
          estimatedTotal: draft.estimatedTotal,
          deliveryDate: draft.deliveryDate,
          notes: draft.notes,
          jobId: draft.jobId,
        }),
      });
      if (res.ok) {
        toast.success("Order created successfully!");
        setShowNewOrder(false);
        setDraft({
          vendor: "",
          jobId: "",
          items: "",
          estimatedTotal: "",
          deliveryDate: "",
          notes: "",
          receiptFile: null,
        });
        fetchOrders();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create order");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20 p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Back to Hub */}
        <Link
          href="/trades"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Network Hub
        </Link>

        {/* Header */}
        <PageHero
          title="Orders & Materials"
          subtitle="Track material orders, receipts, and deliveries for your jobs"
          icon={<ShoppingCart className="h-5 w-5" />}
        >
          <Button onClick={() => setShowNewOrder(true)} className="gap-2">
            <Plus className="mr-2 h-5 w-5" />
            New Order
          </Button>
        </PageHero>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-blue-200/50 bg-gradient-to-br from-blue-50 to-indigo-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <Package className="h-4 w-4" />
                Active Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-900">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-700">
                <Truck className="h-4 w-4" />
                In Transit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-900">{stats.inTransit}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                Delivered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-900">{stats.delivered}</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200/50 bg-gradient-to-br from-purple-50 to-violet-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-purple-700">
                <DollarSign className="h-4 w-4" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-900">
                ${stats.totalSpent.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="orders" className="rounded-lg">
              <Package className="mr-2 h-4 w-4" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="vendors" className="rounded-lg">
              <Store className="mr-2 h-4 w-4" />
              Vendors
            </TabsTrigger>
            <TabsTrigger value="receipts" className="rounded-lg">
              <Receipt className="mr-2 h-4 w-4" />
              Receipts
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-4">
            {loading ? (
              <Card className="py-16 text-center">
                <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-slate-400" />
                <p className="text-slate-500">Loading orders...</p>
              </Card>
            ) : orders.length === 0 ? (
              <Card className="py-16 text-center">
                <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <h3 className="mb-2 text-xl font-semibold">No orders yet</h3>
                <p className="mb-4 text-slate-500">
                  Track your material orders, deliveries, and receipts in one place
                </p>
                <Button
                  onClick={() => setShowNewOrder(true)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Order
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => {
                  const statusStyle = ORDER_STATUSES.find((s) => s.value === order.status);
                  const vendorInfo = VENDORS.find((v) => v.id === order.vendorId);
                  return (
                    <Card key={order.id} className="transition-all hover:shadow-md">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${vendorInfo?.color || "bg-slate-600"} text-white`}
                        >
                          {vendorInfo?.icon || "📦"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-semibold">
                              {vendorInfo?.name || order.vendorId}
                            </h3>
                            <Badge
                              className={`text-xs ${statusStyle?.color || "bg-slate-100 text-slate-700"}`}
                            >
                              {statusStyle?.label || order.status}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-slate-500">
                            {order.orderNumber} · {order.items?.length || 0} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ${Number(order.total || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {VENDORS.map((vendor) => (
                <Card key={vendor.id} className="cursor-pointer transition-all hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl ${vendor.color} text-white`}
                    >
                      {vendor.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <p className="text-sm text-slate-500">
                        {vendor.id === "other"
                          ? "Add any vendor"
                          : "Pro account integration coming soon"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {vendor.id === "other" ? "Manual" : "Coming Soon"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-6 border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
              <h3 className="mb-2 text-lg font-semibold text-emerald-800 dark:text-emerald-200">
                Vendor Portal Integration — Coming Soon
              </h3>
              <p className="mx-auto max-w-lg text-sm text-emerald-700 dark:text-emerald-300">
                Order directly from your favorite suppliers. We&apos;re building embedded ordering,
                automatic receipt capture, delivery scheduling, and per-job material tracking — all
                from within your workspace.
              </p>
            </Card>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts" className="mt-4">
            <Card className="py-16 text-center">
              <Receipt className="mx-auto mb-4 h-16 w-16 text-slate-300" />
              <h3 className="mb-2 text-xl font-semibold">No receipts uploaded</h3>
              <p className="mb-4 text-slate-500">
                Upload receipts from your material purchases to keep everything organized
              </p>
              <Button variant="outline" className="rounded-xl">
                <Camera className="mr-2 h-4 w-4" />
                Upload Receipt
              </Button>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Order Modal */}
        {showNewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Create New Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Vendor */}
                <div>
                  <Label>Vendor</Label>
                  <Select
                    value={draft.vendor}
                    onValueChange={(v) => setDraft({ ...draft, vendor: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDORS.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.icon} {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Items */}
                <div>
                  <Label>Items / Materials</Label>
                  <Textarea
                    value={draft.items}
                    onChange={(e) => setDraft({ ...draft, items: e.target.value })}
                    placeholder="List the materials you're ordering..."
                    rows={3}
                  />
                </div>

                {/* Cost & Delivery */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Total</Label>
                    <Input
                      value={draft.estimatedTotal}
                      onChange={(e) => setDraft({ ...draft, estimatedTotal: e.target.value })}
                      placeholder="$0.00"
                    />
                  </div>
                  <div>
                    <Label>Expected Delivery</Label>
                    <Input
                      type="date"
                      value={draft.deliveryDate}
                      onChange={(e) => setDraft({ ...draft, deliveryDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    placeholder="PO number, delivery instructions, etc."
                    rows={2}
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <Label>Receipt / Invoice (optional)</Label>
                  <div className="mt-1 flex items-center gap-3 rounded-lg border-2 border-dashed p-4">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-500">Drag & drop or click to upload</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowNewOrder(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleSaveOrder}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {saving ? "Saving..." : "Save Order"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
