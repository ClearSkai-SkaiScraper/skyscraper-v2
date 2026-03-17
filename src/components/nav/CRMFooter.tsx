"use client";

import { useOrganization } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface BrandingData {
  companyName: string | null;
  license: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

/**
 * CRM Footer Component
 * Displays organization branding (company name, license, phone) at the bottom of CRM workspace
 */
export function CRMFooter() {
  const { organization } = useOrganization();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [tradesCompanyName, setTradesCompanyName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBranding() {
      try {
        // Fetch branding and trades company in parallel
        const [brandingRes, companyRes] = await Promise.all([
          fetch("/api/branding/get").catch(() => null),
          fetch("/api/trades/company").catch(() => null),
        ]);

        if (brandingRes?.ok) {
          const data = await brandingRes.json();
          setBranding(data);
        }

        if (companyRes?.ok) {
          const companyData = await companyRes.json();
          if (companyData?.company?.name) {
            setTradesCompanyName(companyData.company.name);
          }
        }
      } catch (error) {
        logger.error("[CRMFooter] Failed to fetch branding:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBranding();
  }, []);

  if (loading) {
    return (
      <footer className="border-t bg-card/50 px-6 py-4 text-center text-xs text-muted-foreground">
        <div className="animate-pulse">Loading...</div>
      </footer>
    );
  }

  const companyName =
    branding?.companyName || organization?.name || tradesCompanyName || "SkaiScraper";
  const license = branding?.license;
  const phone = branding?.phone;
  const email = branding?.email;
  const website = branding?.website;

  return (
    <footer className="border-t bg-card/50 px-6 py-4 text-center">
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">{companyName}</div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {license && <span>License: {license}</span>}
          {phone && (
            <a href={`tel:${phone}`} className="transition-colors hover:text-foreground">
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="transition-colors hover:text-foreground">
              {email}
            </a>
          )}
          {website && (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              {website.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
        <div className="text-[10px] opacity-70">
          © {new Date().getFullYear()} {companyName}. All rights reserved.
        </div>
        {/* BuildFingerprint hidden for production - shows build info that confuses users */}
        {/* <BuildFingerprint /> */}
      </div>
    </footer>
  );
}
