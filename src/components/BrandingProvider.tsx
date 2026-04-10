"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface BrandingData {
  complete: boolean;
  primary?: string;
  accent?: string;
  surface?: string;
  text?: string;
  logoUrl?: string;
}

export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [brand, setBrand] = useState<BrandingData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    async function loadBranding() {
      try {
        const response = await fetch("/api/me/branding");
        const data: BrandingData = await response.json();
        setBrand(data);

        const root = document.documentElement;
        
        // Apply org-specific colors or theme defaults
        const primary = data?.primary || (resolvedTheme === "dark" ? "#7cc2ff" : "#117CFF");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const surface = data?.surface || "rgba(255,255,255,0.85)";
        
        root.style.setProperty("--primary", primary);
        root.style.setProperty(
          "--primary-weak",
          resolvedTheme === "dark" ? "rgba(124,194,255,0.16)" : "rgba(17,124,255,0.14)"
        );
        
        if (data?.accent) root.style.setProperty("--accent", data.accent);
        if (data?.text) root.style.setProperty("--text", data.text);
        
        // Mark branding as complete (hides CTA banners)
        root.classList.add("branding-complete");
        
        // Remove any localStorage flags that might force banner display
        localStorage.removeItem("show-branding-banner");
      } catch (error) {
        logger.error("Failed to load branding:", error);
        // Still mark as complete to prevent white screens on error
        const root = document.documentElement;
        root.classList.add("branding-complete");
      } finally {
        setLoading(false);
      }
    }

    void loadBranding();
  }, [resolvedTheme]);

  return <>{children}</>;
}

