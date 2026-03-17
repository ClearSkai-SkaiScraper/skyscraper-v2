"use client";

import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceId: string;
  currency: string;
  features: string[];
  seats: number;
  active: boolean;
}

interface SubscriptionClientProps {
  currentPlanName: string | null;
  subscriptionStatus: string | null;
  stripeSubscriptionId: string | null;
  orgId: string;
  seatUsage?: { current: number; limit: number };
}

export function SubscriptionClient({
  currentPlanName,
  subscriptionStatus,
  stripeSubscriptionId,
  orgId,
  seatUsage,
}: SubscriptionClientProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/billing/plans");
        const data = await res.json();
        if (data.ok && data.plans) {
          setPlans(data.plans);
        }
      } catch (err) {
        logger.error("Failed to fetch plans:", err);
        toast.error("Failed to load subscription plans");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    if (!plan.priceId) {
      toast.error("This plan is not available for purchase yet");
      return;
    }

    setUpgrading(plan.id);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: plan.priceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to start checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      logger.error("Checkout error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      logger.error("Portal error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const isCurrentPlan = (planName: string) => {
    if (!currentPlanName) return false;
    return currentPlanName.toLowerCase() === planName.toLowerCase();
  };

  const formatPrice = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  };

  const getPlanHighlight = (planId: string) => {
    if (planId === "business") return true;
    return false;
  };

  return (
    <div className="container mx-auto max-w-6xl py-6">
      {/* Current Plan Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold">
                {currentPlanName || "Free"}
                {isCurrentPlan("business") && <Badge className="ml-2 bg-blue-500">Popular</Badge>}
              </p>
              <p className="text-gray-600">
                {subscriptionStatus === "active"
                  ? "Active subscription"
                  : subscriptionStatus === "trialing"
                    ? "Trial period"
                    : "No active subscription"}
              </p>
              {seatUsage && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Team Seats</span>
                    <span className="font-medium">
                      {seatUsage.current} / {seatUsage.limit}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full transition-all ${
                        seatUsage.current >= seatUsage.limit
                          ? "bg-red-500"
                          : seatUsage.current / seatUsage.limit > 0.8
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min((seatUsage.current / seatUsage.limit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {seatUsage.current >= seatUsage.limit && (
                    <p className="mt-2 text-sm text-red-600">
                      Seat limit reached. Upgrade to add more team members.
                    </p>
                  )}
                </div>
              )}
            </div>
            {stripeSubscriptionId && (
              <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No subscription plans available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.name);
            const isHighlighted = getPlanHighlight(plan.id);

            return (
              <Card
                key={plan.id}
                className={`relative transition-all ${
                  isHighlighted
                    ? "border-2 border-blue-500 shadow-lg"
                    : isCurrent
                      ? "border-2 border-green-500"
                      : ""
                }`}
              >
                {isHighlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-500 text-white">
                      <Check className="mr-1 h-3 w-3" />
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.description && <p className="text-sm text-gray-500">{plan.description}</p>}
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {formatPrice(plan.priceMonthly, plan.currency)}
                    </span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  {plan.seats > 1 && (
                    <p className="text-sm text-gray-500">{plan.seats} seats included</p>
                  )}
                </CardHeader>

                <CardContent>
                  <ul className="mb-6 space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      isHighlighted && !isCurrent ? "bg-blue-500 hover:bg-blue-600" : ""
                    }`}
                    variant={isCurrent ? "outline" : isHighlighted ? "default" : "secondary"}
                    disabled={isCurrent || upgrading === plan.id || !plan.priceId}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {upgrading === plan.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : !plan.priceId ? (
                      "Coming Soon"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>All prices in USD. Cancel anytime from the billing portal.</p>
        <p className="mt-1">
          Need a custom plan?{" "}
          <a href="mailto:support@skaiscrape.com" className="text-blue-500 hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
