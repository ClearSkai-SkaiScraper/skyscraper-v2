/**
 * VIN — Materials Cart Client
 * Lists active carts, items, actions for submit / remove
 */

"use client";

import { Loader2, ShoppingCart, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CartItem {
  id: string;
  productId: string | null;
  productName: string;
  sku: string | null;
  qty: number;
  unitPrice: number;
  unit: string | null;
  notes: string | null;
  vendorName?: string;
}

interface Cart {
  id: string;
  status: string;
  claimId: string | null;
  vendorId: string | null;
  vendorName: string | null;
  items: CartItem[];
  totalItems: number;
  totalValue: number;
  createdAt: string;
}

export function MaterialsCartClient() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchCarts = useCallback(async () => {
    try {
      const res = await fetch("/api/vin/cart");
      const data = await res.json();
      if (data.success) setCarts(data.carts);
    } catch {
      toast.error("Failed to load carts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCarts();
  }, [fetchCarts]);

  const removeItem = async (cartId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/vin/cart?cartId=${cartId}&itemId=${itemId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Item removed");
        void fetchCarts();
      }
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const submitCart = async (cartId: string) => {
    setSubmitting(cartId);
    try {
      const res = await fetch("/api/vin/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_cart", cartId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Order submitted successfully!");
        void fetchCarts();
      } else {
        toast.error(data.error || "Submit failed");
      }
    } catch {
      toast.error("Failed to submit order");
    } finally {
      setSubmitting(null);
    }
  };

  const deleteCart = async (cartId: string) => {
    try {
      const res = await fetch(`/api/vin/cart?cartId=${cartId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Cart deleted");
        void fetchCarts();
      }
    } catch {
      toast.error("Failed to delete cart");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (carts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">No active carts</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse the vendor network and add products to start a materials order.
        </p>
        <Link href="/vendor-network">
          <Button className="mt-4">Browse Vendors</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {carts.map((cart) => (
        <Card key={cart.id} className="overflow-hidden">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b bg-muted/50 px-5 py-3">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">{cart.vendorName || "Mixed Vendors"} Cart</h3>
                <p className="text-xs text-muted-foreground">
                  {cart.totalItems} items · ${cart.totalValue.toFixed(2)} total
                </p>
              </div>
              <Badge variant={cart.status === "draft" ? "secondary" : "default"}>
                {cart.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              {cart.status === "draft" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => submitCart(cart.id)}
                    disabled={submitting === cart.id}
                  >
                    {submitting === cart.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="mr-2 h-4 w-4" />
                    )}
                    Submit Order
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCart(cart.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-5 py-2 text-left font-medium">Product</th>
                  <th className="px-5 py-2 text-left font-medium">SKU</th>
                  <th className="px-5 py-2 text-right font-medium">Price</th>
                  <th className="px-5 py-2 text-center font-medium">Qty</th>
                  <th className="px-5 py-2 text-right font-medium">Subtotal</th>
                  <th className="px-5 py-2 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-5 py-3 font-medium">{item.productName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{item.sku || "—"}</td>
                    <td className="px-5 py-3 text-right">
                      ${item.unitPrice.toFixed(2)}
                      {item.unit && <span className="text-muted-foreground">/{item.unit}</span>}
                    </td>
                    <td className="px-5 py-3 text-center">{item.qty}</td>
                    <td className="px-5 py-3 text-right font-medium">
                      ${(item.unitPrice * item.qty).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {cart.status === "draft" && (
                        <button
                          onClick={() => removeItem(cart.id, item.id)}
                          aria-label="Remove item"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50">
                  <td colSpan={4} className="px-5 py-3 text-right font-semibold">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right text-lg font-bold text-primary">
                    ${cart.totalValue.toFixed(2)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {cart.items.some((i) => i.notes) && (
            <div className="border-t bg-muted/30 px-5 py-3">
              <p className="text-xs font-medium text-muted-foreground">Notes:</p>
              {cart.items
                .filter((i) => i.notes)
                .map((i) => (
                  <p key={i.id} className="text-xs text-muted-foreground">
                    {i.productName}: {i.notes}
                  </p>
                ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
