/* eslint-disable react/forbid-dom-props */
// CompanyBrandingPreview.tsx
// Full-featured company branding preview card with live preview of all branding details

import {
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  Palette,
  Phone,
  Shield,
} from "lucide-react";
import Link from "next/link";

import { getResolvedOrgIdSafe } from "@/lib/auth/getResolvedOrgId";
import prisma from "@/lib/prisma";

interface OrgBrandingRecord {
  companyName: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  license: string | null;
  colorPrimary: string | null;
  colorAccent: string | null;
  logoUrl: string | null;
  teamPhotoUrl: string | null;
  address?: string | null;
  tagline?: string | null;
}

function isComplete(b: OrgBrandingRecord | null): boolean {
  if (!b) return false;
  return Boolean(b.companyName && b.email && b.colorPrimary && b.colorAccent);
}

export default async function CompanyBrandingPreview() {
  const orgId = await getResolvedOrgIdSafe();
  if (!orgId) {
    return (
      <div className="animate-pulse space-y-3 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Company Branding
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Initialize organization to configure branding
        </p>
      </div>
    );
  }

  let branding: OrgBrandingRecord | null = null;
  try {
    branding = (await prisma.org_branding.findFirst({
      where: { orgId: orgId },
    })) as OrgBrandingRecord | null;
  } catch {
    branding = null;
  }

  const complete = isComplete(branding);

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-xl backdrop-blur-sm dark:border-slate-700/50 dark:from-slate-900 dark:to-slate-800">
      {/* Header with logo preview */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {branding?.logoUrl ? (
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 shadow-lg"
              style={{ borderColor: branding.colorPrimary || "#e2e8f0" }}
            >
              <img
                src={branding.logoUrl}
                alt="Company Logo"
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {branding?.companyName || "Your Company"}
            </h2>
            {branding?.tagline && (
              <p className="mt-1 text-sm italic text-slate-600 dark:text-slate-400">
                {branding.tagline}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              {complete ? (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Shield className="h-3 w-3" /> Branding Complete
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  Setup Required
                </span>
              )}
            </div>
          </div>
        </div>
        <Link
          href="/settings/branding"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {complete ? "Edit Branding" : "Complete Setup"}
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {/* Brand Colors Preview */}
      {(branding?.colorPrimary || branding?.colorAccent) && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Palette className="h-4 w-4" /> Brand Colors
          </h3>
          <div className="flex items-center gap-4">
            {branding?.colorPrimary && (
              <div className="group flex items-center gap-2">
                <div
                  className="h-12 w-12 rounded-lg border-2 border-white shadow-md transition-transform group-hover:scale-110"
                  style={{ backgroundColor: branding.colorPrimary }}
                />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Primary</p>
                  <p className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                    {branding.colorPrimary}
                  </p>
                </div>
              </div>
            )}
            {branding?.colorAccent && (
              <div className="group flex items-center gap-2">
                <div
                  className="h-12 w-12 rounded-lg border-2 border-white shadow-md transition-transform group-hover:scale-110"
                  style={{ backgroundColor: branding.colorAccent }}
                />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Accent</p>
                  <p className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">
                    {branding.colorAccent}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact & Business Info Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Email */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Email</p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {branding?.email || "Not set"}
            </p>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Phone</p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {branding?.phone || "Not set"}
            </p>
          </div>
        </div>

        {/* Website */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
            <Globe className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Website</p>
            {branding?.website ? (
              <a
                href={
                  branding.website.startsWith("http")
                    ? branding.website
                    : `https://${branding.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                {branding.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                Not set
              </p>
            )}
          </div>
        </div>

        {/* License */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">License #</p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {branding?.license || "Not set"}
            </p>
          </div>
        </div>
      </div>

      {/* Team Photo Preview */}
      {branding?.teamPhotoUrl && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Team Photo</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-md dark:border-slate-700">
            <img src={branding.teamPhotoUrl} alt="Team" className="h-48 w-full object-cover" />
          </div>
        </div>
      )}

      {/* PDF Preview Banner */}
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: `linear-gradient(135deg, ${branding?.colorPrimary || "#117CFF"}, ${branding?.colorAccent || "#FFC838"})`,
        }}
      >
        <p className="text-sm font-medium text-white/90">
          ✨ This branding will appear on all your PDF reports, proposals, and exports
        </p>
      </div>
    </div>
  );
}
