"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { Check, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface FullAccessStatus {
  hasFullAccess: boolean;
  expiresAt: string | null;
  stripeSubscriptionId: string | null;
}

export function FullAccessBilling() {
  const { userId } = useAuth();
  const { user } = useUser();
  const [status, setStatus] = useState<FullAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/trades/membership");
      if (response.ok) {
        const data = await response.json();
        setStatus({
          hasFullAccess: data.hasFullAccess || false,
          expiresAt: data.expiresAt || null,
          stripeSubscriptionId: data.stripeSubscriptionId || null,
        });
      }
    } catch (error) {
      logger.error("Failed to fetch Full Access status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      toast.error("Email address required");
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch("/api/trades/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.primaryEmailAddress.emailAddress,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (error) {
      logger.error("Subscribe error:", error);
      toast.error("Failed to start checkout");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your Full Access subscription? You'll lose access at the end of your billing period."
      )
    ) {
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch("/api/trades/cancel-subscription", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Subscription will cancel at end of billing period");
        void fetchStatus();
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      logger.error("Cancel error:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setActionLoading(false);
    }
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysRemaining = (dateString: string | null) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = status?.expiresAt ? getDaysRemaining(status.expiresAt) : 0;
  const expiryDate = status?.expiresAt ? formatExpiryDate(status.expiresAt) : null;

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 dark:border-violet-800 dark:from-violet-950/20 dark:to-purple-950/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <div>
              <CardTitle className="text-violet-900 dark:text-violet-100">Full Access</CardTitle>
              <CardDescription className="text-violet-700 dark:text-violet-300">
                Unlimited messaging on the Trades Network
              </CardDescription>
            </div>
          </div>
          {status?.hasFullAccess && (
            <Badge className="border-0 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {status?.hasFullAccess ? (
          /* Active Subscription */
          <div className="space-y-4">
            <div className="rounded-lg bg-white/50 p-4 dark:bg-black/20">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-violet-900 dark:text-violet-100">
                  Status
                </span>
                <span className="text-sm text-violet-700 dark:text-violet-300">
                  $9.99 per month
                </span>
              </div>
              {expiryDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-violet-700 dark:text-violet-300">
                    Renews {expiryDate}
                  </span>
                  {daysRemaining > 0 && daysRemaining <= 7 && (
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-700 dark:text-amber-400"
                    >
                      {daysRemaining} days left
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="mb-2 text-sm font-medium text-violet-900 dark:text-violet-100">
                Your Benefits:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <Check className="h-4 w-4 text-violet-600" />
                  <span>Unlimited messaging (no token costs)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <Check className="h-4 w-4 text-violet-600" />
                  <span>Post unlimited job opportunities</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <Check className="h-4 w-4 text-violet-600" />
                  <span>Priority support</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No Subscription */
          <div className="space-y-4">
            <div className="rounded-lg bg-white/50 p-4 dark:bg-black/20">
              <div className="mb-4 text-center">
                <div className="text-3xl font-bold text-violet-900 dark:text-violet-100">$9.99</div>
                <div className="text-sm text-violet-700 dark:text-violet-300">per month</div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="mb-2 text-sm font-medium text-violet-900 dark:text-violet-100">
                What's included:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <MessageCircle className="h-4 w-4 text-violet-600" />
                  <span>Unlimited messaging (no token costs)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <Send className="h-4 w-4 text-violet-600" />
                  <span>Post unlimited job opportunities</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span>Priority support</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-xs text-amber-900 dark:text-amber-100">
                💡 <strong>Note:</strong> AI tools still use tokens even with Full Access. This
                subscription removes messaging costs only.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {status?.hasFullAccess ? (
          <Button
            variant="outline"
            onClick={handleCancelSubscription}
            disabled={actionLoading}
            className="w-full border-violet-300 text-violet-700 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300"
          >
            <X className="mr-2 h-4 w-4" />
            {actionLoading ? "Processing..." : "Cancel Subscription"}
          </Button>
        ) : (
          <Button
            onClick={handleSubscribe}
            disabled={actionLoading}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {actionLoading ? "Processing..." : "Get Full Access"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
