"use client";

import { Check, CreditCard, ExternalLink, Receipt, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  dueDate: string;
  description: string;
}

interface PaymentPortalProps {
  invoices: Invoice[];
  className?: string;
}

export function PaymentPortal({ invoices, className }: PaymentPortalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handlePayInvoice = async (invoiceId: string) => {
    setProcessingId(invoiceId);
    try {
      const res = await fetch("/api/portal/payments/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      if (!res.ok) throw new Error("Failed to create payment session");

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      toast.error("Unable to process payment. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingInvoices = invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalOwed = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Card */}
      <div className="rounded-2xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#117CFF]/10">
              <CreditCard className="h-6 w-6 text-[#117CFF]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Payment Center</h3>
              <p className="text-sm text-muted-foreground">Manage your invoices</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-2xl font-bold text-foreground">
              ${(totalOwed / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {totalOwed > 0 && (
          <Button
            className="w-full bg-[#117CFF] hover:bg-[#0066DD]"
            onClick={() => pendingInvoices[0] && handlePayInvoice(pendingInvoices[0].id)}
            disabled={processingId !== null}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Pay All Outstanding Invoices
          </Button>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secure payments powered by Stripe</span>
        </div>
      </div>

      {/* Pending Invoices */}
      {pendingInvoices.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 font-medium">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Outstanding Invoices
          </h4>
          <div className="space-y-2">
            {pendingInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border bg-card p-4",
                  invoice.status === "overdue" && "border-red-500/30 bg-red-50 dark:bg-red-950/20"
                )}
              >
                <div>
                  <p className="font-medium">{invoice.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Invoice #{invoice.number} • Due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                  {invoice.status === "overdue" && (
                    <span className="mt-1 inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
                      Overdue
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">
                    ${(invoice.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handlePayInvoice(invoice.id)}
                    disabled={processingId === invoice.id}
                  >
                    {processingId === invoice.id ? "Processing..." : "Pay Now"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paid Invoices */}
      {paidInvoices.length > 0 && (
        <div>
          <h4 className="mb-3 font-medium text-muted-foreground">Payment History</h4>
          <div className="space-y-2">
            {paidInvoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm">{invoice.description}</p>
                    <p className="text-xs text-muted-foreground">Invoice #{invoice.number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    ${(invoice.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <button className="flex items-center gap-1 text-xs text-[#117CFF] hover:underline">
                    Receipt <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {invoices.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>No invoices yet</p>
          <p className="text-sm">Your invoices will appear here</p>
        </div>
      )}
    </div>
  );
}
