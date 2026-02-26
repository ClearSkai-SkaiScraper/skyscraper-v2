"use client";

import { Building2, ExternalLink, Palette, Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface BrandingData {
  companyName: string | null;
  logoUrl: string | null;
  teamPhotoUrl: string | null;
  colorPrimary: string;
  colorAccent: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  license: string | null;
  tax_rate: number | null;
  tax_enabled: boolean;
  business_state: string | null;
}

export default function CompanyBrandingPreview() {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/branding/get");
        const data = await res.json();
        if (!data.error) {
          setBranding(data);
        }
      } catch (err) {
        logger.error("Failed to load branding:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200/20 bg-white/60 p-6 backdrop-blur-xl dark:bg-slate-900/50">
        <div className="mb-4 h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  const isConfigured = branding?.companyName || branding?.logoUrl;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm dark:border-slate-700/50 dark:from-slate-900/80 dark:to-slate-800/60">
      {/* Accent bar */}
      <div
        className="absolute left-0 right-0 top-0 h-1"
        style={{
          background: `linear-gradient(to right, ${branding?.colorPrimary || "#117CFF"}, ${branding?.colorAccent || "#FFC838"})`,
        }}
      />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/10 p-2 dark:bg-indigo-500/20">
            <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Company Branding</h3>
        </div>
        <Link href="/settings/branding/cover-page">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Palette className="h-3.5 w-3.5" />
            Edit
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {!isConfigured ? (
        /* Empty state — prompt to set up branding */
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-8 dark:border-slate-700">
          <Upload className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Set Up Your Company Branding
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add your logo, colors, and contact info for PDF reports and proposals
            </p>
          </div>
          <Button asChild size="sm" className="mt-1">
            <Link href="/settings/branding/cover-page">
              <Palette className="mr-1.5 h-3.5 w-3.5" />
              Configure Branding
            </Link>
          </Button>
        </div>
      ) : (
        /* Branding preview card */
        <div className="space-y-5">
          {/* Hero banner: team photo with logo overlay */}
          <div className="relative overflow-hidden rounded-2xl">
            {/* Team Photo — full width banner */}
            {branding?.teamPhotoUrl ? (
              <div className="relative h-48 w-full sm:h-56">
                <Image src={branding.teamPhotoUrl} alt="Team Photo" fill className="object-cover" />
                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              </div>
            )}

            {/* Logo + Name — overlaid on banner */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 p-5">
              {branding?.logoUrl ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-white bg-white shadow-lg sm:h-20 sm:w-20">
                  <Image
                    src={branding.logoUrl}
                    alt="Company Logo"
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-white/50 bg-white/20 backdrop-blur-sm sm:h-20 sm:w-20">
                  <Building2 className="h-7 w-7 text-white/80" />
                </div>
              )}
              <div className="min-w-0 pb-1">
                <p className="truncate text-lg font-bold text-white drop-shadow-md sm:text-xl">
                  {branding?.companyName || "Your Company"}
                </p>
                {branding?.license && (
                  <p className="text-xs text-white/80 drop-shadow">Lic: {branding.license}</p>
                )}
              </div>
            </div>
          </div>

          {/* Color swatches */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full border border-slate-200 shadow-inner dark:border-slate-700"
                style={{ backgroundColor: branding?.colorPrimary || "#117CFF" }}
              />
              <span className="text-xs text-slate-500">Primary</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full border border-slate-200 shadow-inner dark:border-slate-700"
                style={{ backgroundColor: branding?.colorAccent || "#FFC838" }}
              />
              <span className="text-xs text-slate-500">Accent</span>
            </div>
            {branding?.tax_enabled && (
              <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Tax: {branding.tax_rate}% ({branding.business_state || "N/A"})
              </span>
            )}
          </div>

          {/* Contact info */}
          {(branding?.phone || branding?.email || branding?.website) && (
            <div className="flex flex-wrap gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
              {branding?.phone && <span>📞 {branding.phone}</span>}
              {branding?.email && <span>✉️ {branding.email}</span>}
              {branding?.website && <span>🌐 {branding.website}</span>}
            </div>
          )}

          {/* PDF Ready indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${branding?.logoUrl ? "bg-green-500" : "bg-amber-500"}`}
            />
            <span className="text-slate-500">
              {branding?.logoUrl
                ? "✅ PDF & Proposal branding ready"
                : "⚠️ Add a logo to complete PDF branding"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
