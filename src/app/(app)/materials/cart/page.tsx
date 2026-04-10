"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CreditCard,
  Package,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { AZ_DEFAULT_TAX_RATE } from "@/lib/constants/taxRates";
import type { SupplierCartItem, SupplierName } from "@/lib/suppliers/types";
import { SUPPLIER_CONFIG } from "@/lib/suppliers/types";

// Cart items loaded from localStorage (no mock data)

export default function MaterialsCartPage() {
  const { user, isLoaded } = useUser();
  const [items, setItems] = useState<SupplierCartItem[]>([]);
  const [linkedJob, setLinkedJob] = useState<string | null>(null);
  const [linkedClaim, setLinkedClaim] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "delivery" | "review" | "complete">(
    "cart"
  );
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    city: "",
    state: "AZ",
    zip: "",
  });
  const [deliveryErrors, setDeliveryErrors] = useState<Record<string, string>>({});

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("skai-material-cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch {
        setItems([]);
      }
    } else {
      setItems([]);
    }

    // Check for linked job/claim
    const urlParams = new URLSearchParams(window.location.search);
    setLinkedJob(urlParams.get("job"));
    setLinkedClaim(urlParams.get("claim"));
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem("skai-material-cart", JSON.stringify(items));
  }, [items]);

  // Group items by supplier
  const itemsBySupplier = items.reduce<Record<SupplierName, SupplierCartItem[]>>(
    (acc, item) => {
      if (!acc[item.supplier]) {
        acc[item.supplier] = [];
      }
      acc[item.supplier].push(item);
      return acc;
    },
    {} as Record<SupplierName, SupplierCartItem[]>
  );

  const suppliers = Object.keys(itemsBySupplier) as SupplierName[];

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  // TODO: resolve city from org branding or claim address for precise rate
  const taxRate = AZ_DEFAULT_TAX_RATE;
  const tax = subtotal * taxRate;
  const shipping = subtotal > 500 ? 0 : 75; // Free shipping over $500
  const total = subtotal + tax + shipping;

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity: newQuantity } : item))
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem("skai-material-cart");
  };

  const validateDelivery = (): boolean => {
    const errors: Record<string, string> = {};
    if (!deliveryAddress.street.trim()) errors.street = "Street address is required";
    if (!deliveryAddress.city.trim()) errors.city = "City is required";
    if (!deliveryAddress.zip.trim()) errors.zip = "ZIP code is required";
    else if (!/^\d{5}(-\d{4})?$/.test(deliveryAddress.zip.trim()))
      errors.zip = "Enter a valid ZIP code";
    setDeliveryErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validateDelivery()) return;
    setIsCheckingOut(true);
    // Simulate order processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCheckoutStep("complete");
    setIsCheckingOut(false);
    clearCart();
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/vendors"
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <PageHero
                title="Material Order Cart"
                subtitle={
                  linkedClaim
                    ? `Linked to Claim #${linkedClaim}`
                    : linkedJob
                      ? `Linked to Job #${linkedJob}`
                      : undefined
                }
                icon={<ShoppingCart className="h-5 w-5" />}
                size="compact"
              />
            </div>

            {items.length > 0 && checkoutStep === "cart" && (
              <button
                onClick={clearCart}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear Cart
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {checkoutStep === "complete" ? (
          /* Order Complete */
          <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center dark:bg-gray-800">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Submitted!</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Your material orders have been sent to {suppliers.length} supplier
              {suppliers.length > 1 ? "s" : ""}.
            </p>
            <div className="mt-6 space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {SUPPLIER_CONFIG[supplier]?.displayName || supplier}
                  </span>
                  <span className="text-sm text-gray-500">
                    Order #ORD-{Date.now().toString().slice(-6)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                href="/vendors"
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Continue Shopping
              </Link>
              <Link
                href="/materials/orders"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                View Orders
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* Empty Cart */
          <div className="rounded-xl bg-white p-12 text-center dark:bg-gray-800">
            <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your cart is empty
            </h2>
            <p className="mt-2 text-gray-500">Add materials from vendor catalogs to get started</p>
            <Link
              href="/vendors"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Browse Vendors
            </Link>
          </div>
        ) : (
          /* Cart Content */
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="space-y-6 lg:col-span-2">
              {suppliers.map((supplier) => (
                <div
                  key={supplier}
                  className="overflow-hidden rounded-xl bg-white dark:bg-gray-800"
                >
                  {/* Supplier Header */}
                  <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50">
                    {SUPPLIER_CONFIG[supplier]?.logoUrl && (
                      <div className="relative h-8 w-8 overflow-hidden rounded bg-white">
                        <Image
                          src={SUPPLIER_CONFIG[supplier].logoUrl}
                          alt={SUPPLIER_CONFIG[supplier].displayName}
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {SUPPLIER_CONFIG[supplier]?.displayName || supplier}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {itemsBySupplier[supplier].length} items
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {itemsBySupplier[supplier].map((item) => (
                      <div key={item.productId} className="flex gap-4 p-4">
                        {/* Product Image Placeholder */}
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={80}
                              height={80}
                              className="object-contain p-2"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                            ${item.unitPrice.toFixed(2)} / {item.unit}
                          </p>
                        </div>

                        {/* Quantity & Total */}
                        <div className="flex flex-col items-end justify-between">
                          <button
                            onClick={() => removeItem(item.productId)}
                            className="p-1 text-gray-400 transition-colors hover:text-red-500"
                            aria-label="Remove item"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded border border-gray-300 dark:border-gray-600">
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                className="px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                              >
                                −
                              </button>
                              <span className="min-w-[3rem] px-3 py-1 text-center font-medium text-gray-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                className="px-2 py-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                              >
                                +
                              </button>
                            </div>

                            <span className="min-w-[80px] text-right font-semibold text-gray-900 dark:text-white">
                              ${(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 rounded-xl bg-white p-6 dark:bg-gray-800">
                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Subtotal ({items.length} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Shipping</span>
                    <span className={shipping === 0 ? "text-green-600" : ""}>
                      {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Est. Tax (5.6%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-white">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Info */}
                {checkoutStep === "delivery" && (
                  <div className="mt-6 space-y-4">
                    <h4 className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                      <Truck className="h-4 w-4" />
                      Delivery Address
                    </h4>
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={deliveryAddress.street}
                      onChange={(e) => {
                        setDeliveryAddress((prev) => ({ ...prev, street: e.target.value }));
                        setDeliveryErrors((prev) => ({ ...prev, street: "" }));
                      }}
                      className={`w-full rounded-lg border ${deliveryErrors.street ? "border-red-500" : "border-gray-300"} bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                    />
                    {deliveryErrors.street && (
                      <p className="mt-1 text-xs text-red-500">{deliveryErrors.street}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={deliveryAddress.city}
                        onChange={(e) => {
                          setDeliveryAddress((prev) => ({ ...prev, city: e.target.value }));
                          setDeliveryErrors((prev) => ({ ...prev, city: "" }));
                        }}
                        className={`rounded-lg border ${deliveryErrors.city ? "border-red-500" : "border-gray-300"} bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                      />
                      {deliveryErrors.city && (
                        <p className="mt-1 text-xs text-red-500">{deliveryErrors.city}</p>
                      )}
                      <input
                        type="text"
                        placeholder="ZIP"
                        value={deliveryAddress.zip}
                        onChange={(e) => {
                          setDeliveryAddress((prev) => ({ ...prev, zip: e.target.value }));
                          setDeliveryErrors((prev) => ({ ...prev, zip: "" }));
                        }}
                        className={`rounded-lg border ${deliveryErrors.zip ? "border-red-500" : "border-gray-300"} bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white`}
                      />
                      {deliveryErrors.zip && (
                        <p className="mt-1 text-xs text-red-500">{deliveryErrors.zip}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 space-y-3">
                  {checkoutStep === "cart" && (
                    <button
                      onClick={() => setCheckoutStep("delivery")}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
                    >
                      <CreditCard className="h-5 w-5" />
                      Proceed to Checkout
                    </button>
                  )}
                  {checkoutStep === "delivery" && (
                    <>
                      <button
                        onClick={handleCheckout}
                        disabled={
                          isCheckingOut ||
                          !deliveryAddress.street ||
                          !deliveryAddress.city ||
                          !deliveryAddress.zip
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isCheckingOut ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Check className="h-5 w-5" />
                            Place Order
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setCheckoutStep("cart")}
                        className="w-full py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                      >
                        Back to Cart
                      </button>
                    </>
                  )}
                </div>

                {/* Notes */}
                <div className="mt-6 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Multi-Supplier Order</p>
                      <p className="mt-1">
                        Items from {suppliers.length} different suppliers will be ordered
                        separately. Each supplier will process their portion independently.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Linked Job/Claim */}
                {(linkedJob || linkedClaim) && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This order will be tracked under{" "}
                      <Link
                        href={linkedClaim ? `/claims/${linkedClaim}` : `/jobs/${linkedJob}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {linkedClaim ? `Claim #${linkedClaim}` : `Job #${linkedJob}`}
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
