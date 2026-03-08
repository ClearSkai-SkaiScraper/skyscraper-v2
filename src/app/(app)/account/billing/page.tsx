"use client";

import { useOrganization, useUser } from "@clerk/nextjs";
import { Clock, CreditCard, ExternalLink, FileText, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RBACGuard } from "@/components/rbac/RBACGuard";
import { logger } from "@/lib/logger";

interface BillingData {
  org: {
    id: string;
    name: string;
    subscriptionStatus: string | null;
    planKey: string | null;
    trialEndsAt: string | null;
  };
  paymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }>;
  invoices: Array<{
    id: string;
    number: string | null;
    amountDue: number;
    amountPaid: number;
    currency: string;
    status: "draft" | "open" | "paid" | "uncollectible" | "void" | null;
    created: number; // Unix timestamp in seconds
    periodStart: number | null;
    periodEnd: number | null;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
    description: string | null;
  }>;
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "paid":
      return { bg: "bg-green-100", text: "text-green-800", label: "Paid" };
    case "open":
      return { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" };
    case "draft":
      return { bg: "bg-gray-100", text: "text-gray-800", label: "Draft" };
    case "uncollectible":
      return { bg: "bg-red-100", text: "text-red-800", label: "Uncollectible" };
    case "void":
      return { bg: "bg-gray-100", text: "text-gray-600", label: "Void" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800", label: status || "Unknown" };
  }
}

export default function BillingPage() {
  const _router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Soft gate: if not signed in, allow page to render in read-only/demo mode
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!organization) return;

    const fetchBillingData = async () => {
      try {
        const res = await fetch(`/api/billing/info?orgId=${organization.id}`);
        if (res.ok) {
          const billingData = await res.json();
          setData(billingData);
        }
      } catch (error) {
        logger.error("Failed to fetch billing data:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchBillingData();
  }, [organization]);

  if (!isLoaded) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

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
      }
    } catch (error) {
      logger.error("Failed to open billing portal:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[color:var(--text)]">
            Billing information unavailable
          </h1>
          <p className="mt-2 text-slate-700 dark:text-slate-300">
            Please contact support if this persists.
          </p>
        </div>
      </div>
    );
  }

  const hasSubscription = data.org.subscriptionStatus === "active";
  const isTrialing = data.org.trialEndsAt && !hasSubscription;

  return (
    <RBACGuard
      permission="billing:view"
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-amber-200 bg-amber-50/50 py-12 text-center dark:border-amber-800 dark:bg-amber-950/20">
            <Lock className="h-12 w-12 text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold">Admin Access Required</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Billing information is restricted to owners and admins.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--text)]">Billing</h1>
            <p className="mt-2 text-slate-700 dark:text-slate-300">
              Manage your subscription and payment methods
            </p>
          </div>

          {!isSignedIn && (
            <div className="rounded-lg border bg-[var(--surface-1)] p-4 text-sm">
              <p>
                You’re viewing billing in demo mode. Sign in for full access.
                <Link href="/sign-in" className="ml-2 underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* Status Card */}
          <div className="rounded-lg border bg-[var(--surface-1)] p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
              Subscription Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Plan</span>
                <span className="font-medium capitalize">{data.org.planKey || "Free Trial"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Status</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    hasSubscription
                      ? "bg-green-100 text-green-800"
                      : isTrialing
                        ? "bg-blue-100 text-blue-800"
                        : "bg-[var(--surface-1)] text-[color:var(--text)]"
                  }`}
                >
                  {hasSubscription ? "Active" : isTrialing ? "Trial" : "No Subscription"}
                </span>
              </div>
              {isTrialing && data.org.trialEndsAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">Trial Ends</span>
                  <span className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4 text-amber-600" />
                    {new Date(data.org.trialEndsAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {!hasSubscription && (
              <div className="mt-6 border-t pt-6">
                <Link
                  href="/pricing"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 font-medium text-white transition-colors hover:bg-sky-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Subscribe Now
                </Link>
              </div>
            )}
          </div>

          {/* Payment Methods */}
          {hasSubscription && (
            <div className="rounded-lg border bg-[var(--surface-1)] p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[color:var(--text)]">Payment Method</h2>
                <button
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Manage in Stripe
                </button>
              </div>

              {data.paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {data.paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                        <div>
                          <div className="font-medium capitalize">
                            {pm.brand} •••• {pm.last4}
                          </div>
                          <div className="text-sm text-slate-700 dark:text-slate-300">
                            Expires {pm.expMonth}/{pm.expYear}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  No payment methods on file
                </p>
              )}
            </div>
          )}

          {/* Invoices */}
          {hasSubscription && (
            <div className="rounded-lg border bg-[var(--surface-1)] p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
                Invoice History
              </h2>

              {data.invoices.length > 0 ? (
                <div className="space-y-3">
                  {data.invoices.map((invoice) => {
                    const statusBadge = getStatusBadge(invoice.status);
                    return (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] p-4 transition-colors hover:bg-[var(--surface-1)]"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                          <div>
                            <div className="font-medium">{invoice.number || "Invoice"}</div>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                              {new Date(invoice.created * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}
                          >
                            {statusBadge.label}
                          </span>
                          <span className="font-semibold">
                            $
                            {(
                              (invoice.status === "paid" ? invoice.amountPaid : invoice.amountDue) /
                              100
                            ).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-2">
                            {invoice.hostedInvoiceUrl && (
                              <a
                                href={invoice.hostedInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                title="View Invoice"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {invoice.invoicePdf && (
                              <a
                                href={invoice.invoicePdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                title="Download PDF"
                              >
                                <FileText className="h-4 w-4" />
                                PDF
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300">No invoices yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </RBACGuard>
  );
}
