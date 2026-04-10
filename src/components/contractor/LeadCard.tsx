"use client";

import { Calendar, CreditCard, Lock, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";

import ClaimLeadButton from "./ClaimLeadButton";

interface ClientLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  damageType: string;
  description: string;
  urgency: string;
  createdAt: Date;
  status: string;
}

interface ContractorSubscription {
  isActive: boolean;
  tier: "free" | "basic" | "pro" | "enterprise";
  leadsRemaining?: number;
}

interface LeadCardProps {
  lead: ClientLead;
  subscription: ContractorSubscription;
}

export default function LeadCard({ lead, subscription }: LeadCardProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Determine if user has unlimited access (Pro tier active subscription)
  const hasUnlimitedAccess = subscription.isActive && subscription.tier === "pro";

  // Determine if lead contact info is locked
  const isLocked =
    lead.status === "OPEN" &&
    (!subscription.isActive ||
      (subscription.tier === "free" && (subscription.leadsRemaining ?? 0) <= 0));

  // Get claim button hook
  const { handleClaim, loading: claiming } = ClaimLeadButton({
    leadId: lead.id,
    hasUnlimitedAccess,
  });

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get urgency badge color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "emergency":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      case "urgent":
        return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "normal":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <>
      <div className="relative rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10">
        {/* Lead Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="mb-1 text-xl font-bold text-white">{lead.name}</h3>
            <p className="flex items-center gap-2 text-sm text-white/60">
              <Calendar className="h-4 w-4" />
              {formatDate(lead.createdAt)}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${getUrgencyColor(lead.urgency)}`}
          >
            {lead.urgency}
          </span>
        </div>

        {/* Property & Damage Info */}
        <div className="mb-4 space-y-3">
          <div className="flex items-start gap-2 text-white/80">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{lead.propertyAddress}</span>
          </div>
          <div>
            <span className="text-xs text-white/40">Damage Type:</span>
            <p className="text-sm font-medium text-white/80">{lead.damageType}</p>
          </div>
          <div>
            <span className="text-xs text-white/40">Description:</span>
            <p className="line-clamp-2 text-sm text-white/80">{lead.description}</p>
          </div>
        </div>

        {/* Contact Information (Gated) */}
        <div className="space-y-2 border-t border-white/10 pt-4">
          {isLocked ? (
            <>
              {/* Blurred Contact Info */}
              <div className="relative">
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/20 backdrop-blur-sm">
                  <div className="text-center">
                    <Lock className="mx-auto mb-2 h-8 w-8 text-white/60" />
                    <p className="text-sm font-medium text-white/80">Contact Info Locked</p>
                  </div>
                </div>
                <div className="pointer-events-none select-none blur-sm">
                  <div className="mb-2 flex items-center gap-2 text-sm text-white/60">
                    <Phone className="h-4 w-4" />
                    <span>(555) 123-4567</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Mail className="h-4 w-4" />
                    <span>contact@example.com</span>
                  </div>
                </div>
              </div>

              {/* Unlock Button */}
              <button
                onClick={() => setShowPaymentModal(true)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-indigo px-4 py-3 font-medium text-white transition-opacity hover:opacity-90"
              >
                <CreditCard className="h-5 w-5" />
                {subscription.tier === "free" ? "Unlock Lead - $25" : "Subscribe to Unlock"}
              </button>
            </>
          ) : (
            <>
              {/* Visible Contact Info */}
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Phone className="h-4 w-4" />
                <a href={`tel:${lead.phone}`} className="transition-colors hover:text-white">
                  {lead.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${lead.email}`} className="transition-colors hover:text-white">
                  {lead.email}
                </a>
              </div>
              <button className="mt-4 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-medium text-white transition-colors hover:bg-white/20">
                Contact Client
              </button>
            </>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute right-4 top-4">
          <span
            className={`rounded px-2 py-1 text-xs font-medium ${
              lead.status === "new"
                ? "border border-green-500/30 bg-green-500/10 text-green-400"
                : "border border-gray-500/30 bg-gray-500/10 text-gray-400"
            }`}
          >
            {lead.status}
          </span>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-md">
            <h3 className="mb-4 text-2xl font-bold text-white">
              {subscription.tier === "free" ? "Purchase Lead" : "Subscribe to Unlock"}
            </h3>

            {subscription.tier === "free" ? (
              <>
                <p className="mb-6 text-white/70">
                  Pay $25 to unlock this lead&apos;s contact information and connect with the client
                  directly.
                </p>
                <div className="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-white/60">Lead Access</span>
                    <span className="font-medium text-white">$25.00</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="font-medium text-white">Total</span>
                    <span className="text-xl font-bold text-white">$25.00</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mb-6 text-white/70">
                  Subscribe to our Pro plan to unlock unlimited leads and access premium features.
                </p>
                <div className="mb-6 rounded-lg border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 p-6">
                  <h4 className="mb-2 text-xl font-bold text-white">Pro Plan</h4>
                  <p className="mb-4 text-3xl font-bold text-white">
                    $99<span className="text-lg font-normal text-white/60">/month</span>
                  </p>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li>✓ Unlimited lead access</li>
                    <li>✓ Priority listing in directory</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Direct messaging</li>
                  </ul>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-medium text-white transition-colors hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleClaim();
                  setShowPaymentModal(false);
                }}
                disabled={claiming}
                className="flex-1 rounded-lg bg-gradient-indigo px-4 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {claiming
                  ? "Processing..."
                  : subscription.tier === "free"
                    ? "Purchase $25"
                    : "Subscribe $99/mo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
