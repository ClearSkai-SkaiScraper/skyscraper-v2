"use client";

import { useState } from "react";

import { logger } from "@/lib/logger";

interface ClaimLeadButtonProps {
  leadId: string;
  hasUnlimitedAccess: boolean;
}

export default function ClaimLeadButton({ leadId, hasUnlimitedAccess }: ClaimLeadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    try {
      // If user has unlimited access (Pro tier), claim directly
      if (hasUnlimitedAccess) {
        const response = await fetch("/api/contractor/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        });

        if (!response.ok) {
          throw new Error("Failed to claim lead");
        }

        const data = await response.json();
        
        if (data.success) {
          window.location.reload(); // Reload to show unlocked lead
        }
      } else {
        // Otherwise, initiate payment flow
        const response = await fetch("/api/contractor/leads/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to initiate checkout");
        }

        const data = await response.json();
        
        if (data.checkoutUrl) {
          // Redirect to Stripe Checkout
          window.location.href = data.checkoutUrl;
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error("Error claiming lead:", error);
      alert(error.message || "Failed to claim lead. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return { handleClaim, loading };
}
