"use client";

/**
 * Branding Card - Dashboard Widget
 * Shows logo preview, brand colors, and completion status
 */

import { AlertCircle, CheckCircle2, ExternalLink, Palette } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface BrandingStatus {
  complete: boolean;
  hasLogo: boolean;
  hasCompanyName: boolean;
  hasPrimaryColor: boolean;
  logoUrl?: string;
  companyName?: string;
  primaryColor?: string;
  accentColor?: string;
}

export function BrandingCard() {
  const [status, setStatus] = useState<BrandingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadBrandingStatus();
  }, []);

  async function loadBrandingStatus() {
    try {
      const res = await fetch("/api/branding/status");
      if (res.ok) {
        const data = await res.json();
        // API returns { isComplete, branding: {...}, requirements: {...} }
        const branding = data.branding || {};
        setStatus({
          complete: !!(branding.logoUrl && branding.companyName && branding.colorPrimary),
          hasLogo: !!branding.logoUrl,
          hasCompanyName: !!branding.companyName,
          hasPrimaryColor: !!branding.colorPrimary,
          logoUrl: branding.logoUrl,
          companyName: branding.companyName,
          primaryColor: branding.colorPrimary,
          accentColor: branding.colorAccent,
        });
      }
    } catch (error) {
      console.error("Failed to load branding status:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading branding...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5" />
          <p className="font-semibold">Failed to Load Branding</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Company Branding</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Logo, colors, identity</p>
          </div>
        </div>
        {status.complete ? (
          <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <AlertCircle className="h-4 w-4" />
            Incomplete
          </div>
        )}
      </div>

      {/* Logo Preview */}
      {status.hasLogo && status.logoUrl ? (
        <div className="mb-4 flex h-20 items-center justify-center rounded-md bg-gray-50 dark:bg-slate-900">
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={status.logoUrl}
            alt="Company Logo"
            className="max-h-16 max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-4 flex h-20 items-center justify-center rounded-md border-2 border-dashed border-gray-300 dark:border-slate-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">No logo uploaded</p>
        </div>
      )}

      {/* Company Name */}
      {status.hasCompanyName && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {status.companyName}
          </p>
        </div>
      )}

      {/* Color Chips */}
      <div className="mb-4 flex gap-2">
        {status.hasPrimaryColor && status.primaryColor && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div
              className="h-8 w-8 rounded-md border border-gray-300 dark:border-slate-600"
              style={{ backgroundColor: status.primaryColor }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">Primary</span>
          </div>
        )}
        {status.accentColor && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div
              className="h-8 w-8 rounded-md border border-gray-300 dark:border-slate-600"
              style={{ backgroundColor: status.accentColor }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">Accent</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <Link
        href="/settings/branding"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
      >
        {status.complete ? "Open Branding" : "Complete Branding"}
        <ExternalLink className="h-4 w-4" />
      </Link>

      {/* Missing Items */}
      {!status.complete && (
        <div className="mt-3 rounded-md bg-orange-50 p-3 dark:bg-orange-950">
          <p className="mb-1 text-xs font-semibold text-orange-800 dark:text-orange-200">
            Missing:
          </p>
          <ul className="space-y-1 text-xs text-orange-700 dark:text-orange-300">
            {!status.hasLogo && <li>• Company logo</li>}
            {!status.hasCompanyName && <li>• Company name</li>}
            {!status.hasPrimaryColor && <li>• Primary brand color</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
