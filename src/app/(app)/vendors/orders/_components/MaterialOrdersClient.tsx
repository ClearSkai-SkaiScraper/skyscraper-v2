"use client";

import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  MapPin,
  Package,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

// Order status configuration
const ORDER_STATUSES = [
  { id: "draft", label: "Draft", color: "bg-slate-400", icon: Clock },
  { id: "submitted", label: "Submitted", color: "bg-blue-500", icon: Send },
  { id: "confirmed", label: "Vendor Confirmed", color: "bg-green-500", icon: CheckCircle2 },
  { id: "fulfilled", label: "Fulfilled", color: "bg-emerald-600", icon: Truck },
  { id: "cancelled", label: "Cancelled", color: "bg-red-500", icon: X },
];

// Demo vendors
const DEMO_VENDORS = [
  { id: "gaf", name: "GAF Materials", category: "Shingle" },
  { id: "abc", name: "ABC Supply", category: "Distribution" },
  { id: "srs", name: "SRS Distribution", category: "Distribution" },
  { id: "beacon", name: "Beacon Building", category: "Distribution" },
];

interface MaterialOrderItem {
  id: string;
  productName: string;
  category: string;
  manufacturer?: string;
  color?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

interface MaterialOrder {
  id: string;
  orderNumber: string;
  vendor: string;
  vendorName?: string;
  status: string;
  orderType: string;
  deliveryDate?: string;
  deliveryAddress: string;
  dropZoneNotes?: string;
  specialInstructions?: string;
  subtotal: number;
  tax: number;
  delivery: number;
  total: number;
  createdAt: string;
  linkedJobs?: { id: string; title: string }[];
  items: MaterialOrderItem[];
}

interface MaterialOrdersClientProps {
  orgId: string;
  userId: string;
}

export function MaterialOrdersClient({ orgId, userId }: MaterialOrdersClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaterialOrder | null>(null);

  // Schedule delivery prompt state
  const [showSchedulePrompt, setShowSchedulePrompt] = useState(false);
  const [orderToSchedule, setOrderToSchedule] = useState<MaterialOrder | null>(null);

  // New order form state
  const [newOrder, setNewOrder] = useState({
    vendor: "",
    orderType: "standard",
    deliveryDate: "",
    deliveryAddress: "",
    dropZoneNotes: "",
    specialInstructions: "",
    linkedJobId: "",
  });

  // Cart items
  const [cartItems, setCartItems] = useState<Omit<MaterialOrderItem, "id">[]>([]);
  const [newItem, setNewItem] = useState({
    productName: "",
    category: "shingles",
    manufacturer: "",
    color: "",
    quantity: 1,
    unit: "bundle",
    unitPrice: 0,
  });

  useEffect(() => {
    void fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);

      const res = await fetch(`/api/vendors/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        // Demo data
        setOrders(getDemoOrders());
      }
    } catch (error) {
      logger.error("Failed to fetch orders:", error);
      setOrders(getDemoOrders());
    } finally {
      setLoading(false);
    }
  };

  const getDemoOrders = (): MaterialOrder[] => {
    return [
      {
        id: "order-1",
        orderNumber: "MO-2024-001",
        vendor: "gaf",
        vendorName: "GAF Materials",
        status: "confirmed",
        orderType: "standard",
        deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryAddress: "123 Oak Street, Phoenix, AZ 85001",
        dropZoneNotes: "Driveway ok for forklift delivery",
        subtotal: 4250.0,
        tax: 382.5,
        delivery: 175.0,
        total: 4807.5,
        createdAt: new Date().toISOString(),
        linkedJobs: [{ id: "job-1", title: "Smith Residence Roof Replacement" }],
        items: [
          {
            id: "item-1",
            productName: "Timberline HDZ Shingles",
            category: "shingles",
            manufacturer: "GAF",
            color: "Charcoal",
            quantity: 45,
            unit: "bundle",
            unitPrice: 85.0,
            lineTotal: 3825.0,
          },
          {
            id: "item-2",
            productName: "Starter Strip Plus",
            category: "accessories",
            manufacturer: "GAF",
            quantity: 10,
            unit: "roll",
            unitPrice: 42.5,
            lineTotal: 425.0,
          },
        ],
      },
      {
        id: "order-2",
        orderNumber: "MO-2024-002",
        vendor: "abc",
        vendorName: "ABC Supply",
        status: "submitted",
        orderType: "rush",
        deliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryAddress: "456 Maple Ave, Scottsdale, AZ 85251",
        subtotal: 1200.0,
        tax: 108.0,
        delivery: 95.0,
        total: 1403.0,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            id: "item-3",
            productName: "Ice & Water Shield",
            category: "underlayment",
            manufacturer: "GAF",
            quantity: 8,
            unit: "roll",
            unitPrice: 150.0,
            lineTotal: 1200.0,
          },
        ],
      },
      {
        id: "order-3",
        orderNumber: "MO-2024-003",
        vendor: "srs",
        vendorName: "SRS Distribution",
        status: "draft",
        orderType: "standard",
        deliveryAddress: "789 Pine Road, Tempe, AZ 85281",
        subtotal: 2850.0,
        tax: 256.5,
        delivery: 0,
        total: 3106.5,
        createdAt: new Date().toISOString(),
        items: [
          {
            id: "item-4",
            productName: "Standing Seam Metal Panels",
            category: "metal",
            manufacturer: "McElroy",
            color: "Dark Bronze",
            quantity: 25,
            unit: "panel",
            unitPrice: 114.0,
            lineTotal: 2850.0,
          },
        ],
      },
    ];
  };

  const getStatusConfig = (status: string) => {
    return ORDER_STATUSES.find((s) => s.id === status) || ORDER_STATUSES[0];
  };

  const handleAddItem = () => {
    if (!newItem.productName || newItem.quantity <= 0) {
      toast.error("Please enter product name and quantity");
      return;
    }

    const lineTotal = newItem.quantity * newItem.unitPrice;
    setCartItems([...cartItems, { ...newItem, lineTotal }]);
    setNewItem({
      productName: "",
      category: "shingles",
      manufacturer: "",
      color: "",
      quantity: 1,
      unit: "bundle",
      unitPrice: 0,
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async () => {
    if (!newOrder.vendor || cartItems.length === 0) {
      toast.error("Please select a vendor and add items");
      return;
    }

    try {
      const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const tax = subtotal * 0.09; // 9% tax
      const delivery = newOrder.orderType === "rush" ? 195 : 95;
      const total = subtotal + tax + delivery;

      const res = await fetch("/api/vendors/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newOrder,
          items: cartItems,
          subtotal,
          tax,
          delivery,
          total,
        }),
      });

      if (res.ok) {
        toast.success("Order created successfully");
        setIsNewOrderDialogOpen(false);
        void fetchOrders();
        // Reset form
        setNewOrder({
          vendor: "",
          orderType: "standard",
          deliveryDate: "",
          deliveryAddress: "",
          dropZoneNotes: "",
          specialInstructions: "",
          linkedJobId: "",
        });
        setCartItems([]);
      } else {
        toast.error("Failed to create order");
      }
    } catch (error) {
      logger.error("Failed to create order:", error);
      toast.error("Failed to create order");
    }
  };

  const handleSubmitOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/vendors/orders/${orderId}/submit`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Order submitted to vendor");
        void fetchOrders();
      } else {
        toast.error("Failed to submit order");
      }
    } catch (error) {
      logger.error("Failed to submit order:", error);
      toast.error("Failed to submit order");
    }
  };

  // Handle when vendor confirms an order - prompt for scheduling
  const handleOrderConfirmed = (order: MaterialOrder) => {
    setOrderToSchedule(order);
    setShowSchedulePrompt(true);
  };

  // Navigate to job scheduling with order details pre-filled
  const handleScheduleDelivery = () => {
    if (!orderToSchedule) return;

    // Build query params to pre-fill the job scheduling form
    const params = new URLSearchParams({
      type: "delivery",
      title: `Material Delivery - ${orderToSchedule.orderNumber}`,
      address: orderToSchedule.deliveryAddress,
      date: orderToSchedule.deliveryDate || "",
      notes: `Order: ${orderToSchedule.orderNumber}\nVendor: ${orderToSchedule.vendorName}\n${orderToSchedule.dropZoneNotes || ""}`,
      orderId: orderToSchedule.id,
    });

    router.push(`/appointments/schedule?${params.toString()}`);
    setShowSchedulePrompt(false);
    setOrderToSchedule(null);
  };

  const filteredOrders = orders.filter((order) => {
    // First filter by status
    if (filter !== "all" && order.status !== filter) {
      return false;
    }
    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.vendorName?.toLowerCase().includes(query) ||
        order.deliveryAddress.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 rounded bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500 p-2">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Draft Orders</p>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "draft").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500 p-2">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "submitted").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500 p-2">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "confirmed").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-600 p-2">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, vendors, addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button onClick={() => setIsNewOrderDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Orders Yet</h3>
              <p className="mb-4 text-muted-foreground">
                Create your first material order to get started
              </p>
              <Button onClick={() => setIsNewOrderDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            return (
              <Card key={order.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-3 ${statusConfig.color}`}>
                        <StatusIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{order.orderNumber}</span>
                          <Badge className={`${statusConfig.color} text-white`}>
                            {statusConfig.label}
                          </Badge>
                          {order.orderType === "rush" && <Badge variant="destructive">Rush</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {order.vendorName || order.vendor}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {order.deliveryAddress.split(",")[0]}
                          </div>
                          {order.deliveryDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(order.deliveryDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <div className="text-sm">
                          {order.items.length} item{order.items.length !== 1 ? "s" : ""} •{" "}
                          <span className="font-medium">${order.total.toLocaleString()}</span>
                        </div>
                        {order.linkedJobs && order.linkedJobs.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Linked to:</span>
                            {order.linkedJobs.map((job) => (
                              <Link
                                key={job.id}
                                href={`/appointments/schedule/${job.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {job.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      {order.status === "draft" && (
                        <Button size="sm" onClick={() => handleSubmitOrder(order.id)}>
                          <Send className="mr-1 h-4 w-4" />
                          Submit
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-yellow-500 hover:bg-yellow-600"
                          onClick={() => handleOrderConfirmed(order)}
                        >
                          <Calendar className="mr-1 h-4 w-4" />
                          Schedule
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* New Order Dialog */}
      <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Material Order</DialogTitle>
            <DialogDescription>Build a material order from vendor catalogs</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Order Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Select
                  value={newOrder.vendor}
                  onValueChange={(v) => setNewOrder({ ...newOrder, vendor: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_VENDORS.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} ({v.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderType">Order Type</Label>
                <Select
                  value={newOrder.orderType}
                  onValueChange={(v) => setNewOrder({ ...newOrder, orderType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Delivery</SelectItem>
                    <SelectItem value="rush">Rush Delivery (+$100)</SelectItem>
                    <SelectItem value="willcall">Will Call (Pickup)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={newOrder.deliveryDate}
                  onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedJob">Link to Job (Optional)</Label>
                <Input
                  id="linkedJob"
                  value={newOrder.linkedJobId}
                  onChange={(e) => setNewOrder({ ...newOrder, linkedJobId: e.target.value })}
                  placeholder="Job ID or search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Input
                id="deliveryAddress"
                value={newOrder.deliveryAddress}
                onChange={(e) => setNewOrder({ ...newOrder, deliveryAddress: e.target.value })}
                placeholder="123 Main St, City, State ZIP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dropZoneNotes">Drop Zone Notes</Label>
              <Textarea
                id="dropZoneNotes"
                value={newOrder.dropZoneNotes}
                onChange={(e) => setNewOrder({ ...newOrder, dropZoneNotes: e.target.value })}
                placeholder="e.g., Driveway ok for forklift, avoid sprinklers"
                rows={2}
              />
            </div>

            {/* Add Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-2">
                    <Input
                      placeholder="Product name"
                      value={newItem.productName}
                      onChange={(e) => setNewItem({ ...newItem, productName: e.target.value })}
                    />
                  </div>
                  <Select
                    value={newItem.category}
                    onValueChange={(v) => setNewItem({ ...newItem, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shingles">Shingles</SelectItem>
                      <SelectItem value="underlayment">Underlayment</SelectItem>
                      <SelectItem value="metal">Metal</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="flashing">Flashing</SelectItem>
                      <SelectItem value="ventilation">Ventilation</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    value={newItem.unitPrice || ""}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
                  />
                  <Button onClick={handleAddItem} variant="secondary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {cartItems.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${item.lineTotal.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(i)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {cartItems.length > 0 && (
                  <div className="flex justify-end border-t pt-4">
                    <div className="space-y-1 text-right">
                      <div className="text-sm text-muted-foreground">
                        Subtotal: ${cartSubtotal.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tax (9%): ${(cartSubtotal * 0.09).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Delivery: ${newOrder.orderType === "rush" ? "195.00" : "95.00"}
                      </div>
                      <div className="text-lg font-bold">
                        Total: $
                        {(
                          cartSubtotal +
                          cartSubtotal * 0.09 +
                          (newOrder.orderType === "rush" ? 195 : 95)
                        ).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={!newOrder.vendor || cartItems.length === 0}
            >
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.orderNumber}</DialogTitle>
            <DialogDescription>Order details and line items</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Vendor</Label>
                  <p className="font-medium">{selectedOrder.vendorName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={`${getStatusConfig(selectedOrder.status).color} text-white`}>
                    {getStatusConfig(selectedOrder.status).label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Date</Label>
                  <p className="font-medium">
                    {selectedOrder.deliveryDate
                      ? new Date(selectedOrder.deliveryDate).toLocaleDateString()
                      : "TBD"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Address</Label>
                  <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedOrder.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.productName}</div>
                        {item.color && (
                          <div className="text-sm text-muted-foreground">Color: {item.color}</div>
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">${item.lineTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end border-t pt-4">
                <div className="space-y-1 text-right">
                  <div className="text-sm text-muted-foreground">
                    Subtotal: ${selectedOrder.subtotal.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Tax: ${selectedOrder.tax.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Delivery: ${selectedOrder.delivery.toFixed(2)}
                  </div>
                  <div className="text-lg font-bold">Total: ${selectedOrder.total.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
            {selectedOrder?.status === "draft" && (
              <Button onClick={() => handleSubmitOrder(selectedOrder.id)}>
                <Send className="mr-2 h-4 w-4" />
                Submit Order
              </Button>
            )}
            {selectedOrder?.status === "confirmed" && (
              <Button
                className="bg-yellow-500 hover:bg-yellow-600"
                onClick={() => {
                  setSelectedOrder(null);
                  handleOrderConfirmed(selectedOrder);
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Delivery
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Delivery Prompt Dialog */}
      <Dialog open={showSchedulePrompt} onOpenChange={setShowSchedulePrompt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Order Confirmed!
            </DialogTitle>
            <DialogDescription>
              Your vendor has confirmed order {orderToSchedule?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-5 w-5 text-green-600" />
                <div className="space-y-1">
                  <p className="font-medium text-green-900">Delivery Details</p>
                  <p className="text-sm text-green-700">
                    {orderToSchedule?.deliveryDate
                      ? `Scheduled for ${new Date(orderToSchedule.deliveryDate).toLocaleDateString()}`
                      : "Delivery date to be confirmed"}
                  </p>
                  <p className="text-sm text-green-700">{orderToSchedule?.deliveryAddress}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-900">Would you like to:</p>
                  <ul className="list-inside list-disc text-sm text-amber-700">
                    <li>Add this delivery to your job schedule?</li>
                    <li>Notify your client about the delivery?</li>
                    <li>Schedule your crew for the project start?</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setShowSchedulePrompt(false);
                setOrderToSchedule(null);
              }}
            >
              Maybe Later
            </Button>
            <Button className="bg-yellow-500 hover:bg-yellow-600" onClick={handleScheduleDelivery}>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule & Notify Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
