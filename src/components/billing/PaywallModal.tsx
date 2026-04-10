"use client";

import { ArrowUpRight, Check, Lock, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
  currentPlan?: string;
  usage?: {
    used: number;
    limit: number;
    type: string;
  };
}

export function PaywallModal({
  open,
  onClose,
  feature = "this feature",
  currentPlan = "Solo",
  usage,
}: PaywallModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-2xl border-[var(--border)] bg-[var(--surface-1)] p-0 backdrop-blur-xl">
        {/* Header with gradient */}
        <div className="relative bg-gradient-blue p-8 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Lock className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl font-bold">Upgrade Required</DialogTitle>
            </div>
            <p className="text-lg text-white/90">
              You&apos;ve reached your plan limits. Upgrade to continue using {feature}.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Usage Stats */}
          {usage && (
            <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[color:var(--muted)]">Current Usage</span>
                <span className="text-sm font-bold text-[color:var(--text)]">
                  {usage.used} / {usage.limit} {usage.type}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className={`h-full bg-gradient-blue transition-all`}
                  style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Current Plan */}
          <div className="mb-6">
            <p className="mb-1 text-sm text-[color:var(--muted)]">Your Current Plan</p>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1">
              <span className="text-sm font-semibold text-[color:var(--text)]">{currentPlan}</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
              Unlock with Business or Enterprise:
            </h3>
            <div className="space-y-3">
              {[
                "Unlimited AI claims & reports",
                "10x higher storage limits",
                "Priority processing & support",
                "Advanced analytics & insights",
                "API access & integrations",
                "White-label options",
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/10">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-[color:var(--text)]">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUpgrade}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-blue px-6 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              <Zap className="h-5 w-5" />
              Upgrade Plan
              <ArrowUpRight className="h-5 w-5" />
            </button>

            <button
              onClick={onClose}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-6 py-3 font-medium text-[color:var(--text)] transition-all hover:bg-[var(--surface-3)]"
            >
              Maybe Later
            </button>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-[color:var(--muted)]">
            Cancel anytime. No long-term contracts. Instant access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
