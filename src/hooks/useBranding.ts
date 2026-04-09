"use client";

import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface BrandingData {
  companyName?: string | null;
  logoUrl?: string | null;
  colorPrimary?: string | null;
  colorAccent?: string | null;
}

export function useBranding() {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranding() {
      try {
        const response = await fetch("/api/branding/status");
        if (response.ok) {
          const data = await response.json();
          setBranding(data.branding);
        }
      } catch (error) {
        logger.error("Error fetching branding:", error);
      } finally {
        setLoading(false);
      }
    }

    void fetchBranding();
  }, []);

  return { branding, loading };
}
