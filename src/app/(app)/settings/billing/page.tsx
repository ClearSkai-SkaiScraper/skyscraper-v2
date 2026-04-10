"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import { useOrganization } from "@clerk/nextjs";
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  Minus,
  Plus,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import useSWR, { mutate } from "swr";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { RBACGuard } from "@/components/rbac/RBACGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_SEATS, PRICE_PER_SEAT_DOLLARS as PRICE_PER_SEAT } from "@/lib/billing/seat-pricing";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function BillingPage() {
  const { organization } = useOrganization();
  const { data: seatData, isLoading } = useSWR("/api/billing/seats", fetcher, {
    refreshInterval: 30_000,
  });

  const [seatInput, setSeatInput] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasSubscription = seatData?.subscription?.hasSubscription;
  const currentSeats = seatData?.subscription?.seatCount || 0;
  const seatsUsed = seatData?.seatsUsed || 0;
  const subStatus = seatData?.subscription?.status || "none";
  const periodEnd = seatData?.subscription?.currentPeriodEnd;

  // Desired seat count (from input or current)
  const desiredSeats = (seatInput ?? currentSeats) || 1;
  const monthlyTotal = desiredSeats * PRICE_PER_SEAT;
  const annualTotal = monthlyTotal * 12;
  const seatsChanged = seatInput !== null && seatInput !== currentSeats;

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // ── Create new subscription ─────────────────────────────────────
  const handleCreateSubscription = useCallback(async () => {
    clearMessages();
    const seats = seatInput || 1;
    if (seats < 1 || seats > MAX_SEATS) {
      setError(`Seats must be between 1 and ${MAX_SEATS}.`);
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCount: seats }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create subscription.");
        return;
      }
      setSuccess(
        `✅ Subscription created! ${seats} seat${seats > 1 ? "s" : ""} × $${PRICE_PER_SEAT}/mo = $${seats * PRICE_PER_SEAT}/mo`
      );
      void mutate("/api/billing/seats");
      setSeatInput(null);
    } catch (err) {
      setError(err.message || "Failed to create subscription.");
    } finally {
      setIsCreating(false);
    }
  }, [seatInput]);

  // ── Update seats ────────────────────────────────────────────────
  const handleUpdateSeats = useCallback(async () => {
    clearMessages();
    if (!seatInput || seatInput < 1 || seatInput > MAX_SEATS) {
      setError(`Seats must be between 1 and ${MAX_SEATS}.`);
      return;
    }
    if (seatInput === currentSeats) return;

    setIsUpdating(true);
    try {
      const res = await fetch("/api/billing/update-seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCount: seatInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update seats.");
        return;
      }
      setSuccess(
        `✅ Seats updated: ${currentSeats} → ${seatInput}. ${seatInput > currentSeats ? "Prorated charge applied." : "Prorated credit applied."}`
      );
      void mutate("/api/billing/seats");
      setSeatInput(null);
    } catch (err) {
      setError(err.message || "Failed to update seats.");
    } finally {
      setIsUpdating(false);
    }
  }, [seatInput, currentSeats]);

  // ── Open Stripe Portal ──────────────────────────────────────────
  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: organization?.id }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const data = await res.json();
        setError(data.error || "Failed to open billing portal.");
      }
    } catch (err) {
      setError(err.message || "Failed to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#117CFF]" />
      </div>
    );
  }

  return (
    <RBACGuard
      permission="billing:manage"
      fallback={
        <PageContainer maxWidth="5xl">
          <PageHero
            section="settings"
            title="Billing & Seats"
            subtitle="Manage your team size and subscription"
            icon={<CreditCard className="h-5 w-5" />}
          />
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Lock className="h-12 w-12 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold">Admin Access Required</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only organization owners and admins can manage billing and subscriptions. Contact
                  your admin to make changes.
                </p>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      }
    >
      <PageContainer maxWidth="5xl">
        <PageHero
          section="settings"
          title="Billing & Seats"
          subtitle="Manage your team size and subscription"
          icon={<CreditCard className="h-5 w-5" />}
        />

        <div className="space-y-8">
          {/* ── Status Messages ──────────────────────────────────────── */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
              {success}
            </div>
          )}

          {/* ── Beta banner ──────────────────────────────────────────── */}
          {process.env.NEXT_PUBLIC_BETA_MODE !== "false" && !hasSubscription && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <CardContent className="flex items-center gap-3 py-4">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Beta Access — All Features Unlocked
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Free beta access active. Subscribe below when you&apos;re ready to lock in your
                    team size.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Overview Cards ───────────────────────────────────────── */}
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Seats Used */}
            <Card className="border-2 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Seats Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {seatsUsed}
                  <span className="text-lg font-normal text-muted-foreground">
                    {" "}
                    / {hasSubscription ? currentSeats : "∞"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Active team members</p>
              </CardContent>
            </Card>

            {/* Price Per Seat */}
            <Card className="border-2 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  Price Per Seat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${PRICE_PER_SEAT}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Per user / month</p>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card className="border-2 border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      subStatus === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : subStatus === "trialing"
                          ? "bg-blue-100 text-blue-800"
                          : subStatus === "past_due"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    }
                  >
                    {subStatus === "none" ? "No subscription" : subStatus}
                  </Badge>
                </div>
                {periodEnd && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Renews {new Date(periodEnd).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Seat Selector Card ───────────────────────────────────── */}
          <Card className="border-2 border-[#117CFF]/20 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/10">
            <CardHeader>
              <CardTitle className="text-xl">
                {hasSubscription ? "Adjust Seats" : "Choose Your Seats"}
              </CardTitle>
              <CardDescription>
                $80 per seat per month · 1–500 seats · Stripe handles proration automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Seat stepper */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setSeatInput(Math.max(1, desiredSeats - 1))}
                  disabled={desiredSeats <= 1}
                >
                  <Minus className="h-5 w-5" />
                </Button>

                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min={1}
                    max={MAX_SEATS}
                    value={desiredSeats}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setSeatInput(Math.min(MAX_SEATS, Math.max(1, val)));
                    }}
                    className="w-24 rounded-xl border-2 border-[#117CFF]/30 bg-transparent text-center text-4xl font-bold text-[#117CFF] focus:border-[#117CFF] focus:outline-none focus:ring-2 focus:ring-[#117CFF]/20"
                  />
                  <span className="mt-1 text-sm text-muted-foreground">seats</span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setSeatInput(Math.min(MAX_SEATS, desiredSeats + 1))}
                  disabled={desiredSeats >= MAX_SEATS}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Quick-pick buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 5, 10, 25, 50, 100, 200].map((n) => (
                  <Button
                    key={n}
                    variant={desiredSeats === n ? "default" : "outline"}
                    size="sm"
                    className={desiredSeats === n ? "bg-[#117CFF] text-white" : ""}
                    onClick={() => setSeatInput(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>

              {/* Price breakdown */}
              <div className="mx-auto max-w-md rounded-2xl border bg-white/80 p-6 dark:bg-slate-800/80">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {desiredSeats} seat{desiredSeats !== 1 ? "s" : ""} × ${PRICE_PER_SEAT}/mo
                    </span>
                    <span className="font-semibold">${monthlyTotal.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Annual estimate</span>
                    <span className="text-muted-foreground">
                      ${annualTotal.toLocaleString()}/yr
                    </span>
                  </div>
                  {seatsChanged && hasSubscription && (
                    <div className="flex items-center justify-between border-t pt-2 text-[#117CFF]">
                      <span className="flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        {desiredSeats > currentSeats ? "Adding" : "Removing"}{" "}
                        {Math.abs(desiredSeats - currentSeats)} seat
                        {Math.abs(desiredSeats - currentSeats) !== 1 ? "s" : ""}
                      </span>
                      <span className="font-semibold">
                        {desiredSeats > currentSeats ? "+" : "-"}$
                        {(Math.abs(desiredSeats - currentSeats) * PRICE_PER_SEAT).toLocaleString()}
                        /mo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seat count warning */}
              {seatInput !== null && seatInput < seatsUsed && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  ⚠️ You have {seatsUsed} active members. Reducing to {seatInput} seats will prevent
                  new invitations until members are removed.
                </div>
              )}

              {/* Action button */}
              <div className="flex justify-center">
                {hasSubscription ? (
                  <Button
                    size="lg"
                    className="bg-[#117CFF] px-8 hover:bg-[#0066DD]"
                    onClick={handleUpdateSeats}
                    disabled={isUpdating || !seatsChanged}
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : seatsChanged ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Update to {desiredSeats} Seats — ${monthlyTotal.toLocaleString()}/mo
                      </>
                    ) : (
                      "No changes"
                    )}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="bg-[#117CFF] px-8 hover:bg-[#0066DD]"
                    onClick={handleCreateSubscription}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating subscription...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Subscribe — {desiredSeats} Seat{desiredSeats !== 1 ? "s" : ""} · $
                        {monthlyTotal.toLocaleString()}/mo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Billing Portal Link ──────────────────────────────────── */}
          {hasSubscription && (
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Manage Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    Update payment method, view invoices, or cancel
                  </p>
                </div>
                <Button onClick={openBillingPortal} disabled={portalLoading} variant="outline">
                  {portalLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Stripe Billing Portal
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Pricing Breakdown ────────────────────────────────────── */}
          <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle>Pricing Examples</CardTitle>
              <CardDescription>
                Simple, transparent pricing. No tiers, no minimums, no hidden fees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { seats: 1, label: "Solo" },
                  { seats: 10, label: "Small Team" },
                  { seats: 50, label: "Growing" },
                  { seats: 200, label: "Enterprise" },
                ].map(({ seats, label }) => (
                  <button
                    key={seats}
                    onClick={() => setSeatInput(seats)}
                    className="rounded-xl border p-4 text-left transition-all hover:border-[#117CFF] hover:shadow-md"
                  >
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 text-lg font-bold">
                      {seats} seat{seats !== 1 ? "s" : ""}
                    </div>
                    <div className="text-2xl font-bold text-[#117CFF]">
                      ${(seats * PRICE_PER_SEAT).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </RBACGuard>
  );
}
