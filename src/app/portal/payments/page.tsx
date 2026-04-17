"use client";

import { CreditCard, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { PaymentPortal } from "@/components/portal/PaymentPortal";
import PortalPageHero from "@/components/portal/portal-page-hero";
import { Card, CardContent } from "@/components/ui/card";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  dueDate: string;
  description: string;
}

/**
 * 💳 Client Portal - Payments Page
 *
 * Allows clients to view payment requests and make secure payments
 * via Stripe Checkout for their projects/claims.
 */
export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/portal/invoices");
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices || []);
        }
      } catch {
        // Silently fail - show empty state
      } finally {
        setLoading(false);
      }
    }
    void fetchInvoices();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="Payments"
        subtitle="Securely pay for your projects and services. All transactions are protected by bank-level encryption."
        icon={CreditCard}
        badge="Secure Payments"
        gradient="emerald"
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* No Invoices State */}
      {!loading && invoices.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="text-lg font-semibold">No Invoices Yet</h3>
            <p className="text-sm text-slate-500">
              When your contractor sends you an invoice, it will appear here for secure payment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Portal Component */}
      {!loading && invoices.length > 0 && <PaymentPortal invoices={invoices} />}
    </div>
  );
}
