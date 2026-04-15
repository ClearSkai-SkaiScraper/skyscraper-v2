"use client";

import { ArrowLeft, Clock, Package, Search, ShoppingCart, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ── Types for saved order history ────────────────────────────────────────────
interface OrderItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface MaterialOrder {
  id: string;
  createdAt: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  supplier: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  deliveryAddress?: string;
  trackingNumber?: string;
  jobLabel?: string;
}

const STATUS_CONFIG: Record<
  MaterialOrder["status"],
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: Package,
  },
  shipped: {
    label: "Shipped",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    icon: Package,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    icon: Clock,
  },
};

export default function MaterialOrdersPage() {
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Load orders from localStorage (until DB-backed order system is built)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("skai-material-orders");
      if (raw) {
        setOrders(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
    setIsLoading(false);
  }, []);

  const filteredOrders = orders.filter(
    (o) =>
      !searchQuery ||
      o.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.jobLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <PageContainer maxWidth="5xl">
      <div className="mb-4">
        <Link
          href="/materials"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Materials
        </Link>
      </div>

      <PageHero
        section="build"
        title="Material Orders"
        subtitle="Track orders, deliveries, and order history across all suppliers"
        icon={<Truck className="h-7 w-7" />}
      />

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter((o) => o.status === "processing").length}
            </p>
            <p className="text-xs text-muted-foreground">Processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-purple-600">
              {orders.filter((o) => o.status === "shipped").length}
            </p>
            <p className="text-xs text-muted-foreground">In Transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">
              {orders.filter((o) => o.status === "delivered").length}
            </p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders by supplier, job, or item…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Link href="/materials/estimator">
          <Button variant="outline">
            <ShoppingCart className="mr-2 h-4 w-4" />
            New Estimate
          </Button>
        </Link>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const StatusIcon = statusConfig.icon;
            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </CardTitle>
                      <CardDescription>
                        {order.supplier}
                        {order.jobLabel && ` — ${order.jobLabel}`}
                        {" · "}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                    {order.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {item.name}
                        </span>
                        <span className="text-sm font-medium">
                          {item.quantity} {item.unit} · $
                          {(item.unitPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="px-4 py-2 text-xs text-muted-foreground">
                        +{order.items.length - 4} more items
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {order.trackingNumber && <span>Tracking: {order.trackingNumber}</span>}
                      <span>{order.items.length} items</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      ${order.total.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
              <Package className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              No Orders Yet
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Create a material estimate, add items to your cart, and place your first order. Orders
              will appear here for tracking.
            </p>
            <div className="flex gap-3">
              <Link href="/materials/estimator">
                <Button>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Create Estimate
                </Button>
              </Link>
              <Link href="/materials/cart">
                <Button variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  View Cart
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
