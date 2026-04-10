// ...existing code...
// OrgBrandingCard.tsx
// Server component: loads organization branding and renders completion state.
// Falls back to skeleton + call-to-action when incomplete or missing.

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
}

function isComplete(b: OrgBrandingRecord | null): boolean {
  if (!b) return false;
  return Boolean(b.companyName && b.email && b.colorPrimary && b.colorAccent);
}

export default async function OrgBrandingCard() {
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

  // Check org_branding for completeness
  // NOTE: brandingCompleted field may not exist in org table - use field checks as fallback
  let brandingCompleted = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    // brandingCompleted field may not exist - we'll check branding fields instead
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    brandingCompleted = false;
  } catch {
    // Org lookup failed - continue with branding check
  }

  let branding: OrgBrandingRecord | null = null;
  try {
    branding = (await prisma.org_branding.findFirst({
      where: { orgId: orgId },
    })) as OrgBrandingRecord | null;
  } catch {
    // org_branding table may not exist - graceful fallback
    branding = null;
  }

  // Use field-based check for completeness
  const complete = isComplete(branding);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Company Branding
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Applied across reports, exports & proposal PDFs
          </p>
        </div>
        <Link
          href="/settings/branding"
          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {complete ? "Edit" : "Setup"}
        </Link>
      </div>
      {!complete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <p>
            <strong>Branding Incomplete.</strong> Complete your company branding to unlock polished
            exports.
          </p>
        </div>
      )}
      {branding && (
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">{branding.companyName ? "✓" : "○"}</span>
            <div className="flex-1">
              <p className="text-slate-500 dark:text-slate-400">Company</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {branding.companyName || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">{branding.website ? "✓" : "○"}</span>
            <div className="flex-1">
              <p className="text-slate-500 dark:text-slate-400">Website</p>
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                {branding.website || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">{branding.email ? "✓" : "○"}</span>
            <div className="flex-1">
              <p className="text-slate-500 dark:text-slate-400">Email</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {branding.email || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">{branding.phone ? "✓" : "○"}</span>
            <div className="flex-1">
              <p className="text-slate-500 dark:text-slate-400">Phone</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {branding.phone || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">{branding.license ? "✓" : "○"}</span>
            <div className="flex-1">
              <p className="text-slate-500 dark:text-slate-400">License</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {branding.license || "Not set"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-500">
              {branding.colorPrimary && branding.colorAccent ? "✓" : "○"}
            </span>
            <div className="flex-1 space-y-1">
              <p className="text-slate-500 dark:text-slate-400">Brand Colors</p>
              <div className="flex items-center gap-2">
                {branding.colorPrimary && branding.colorAccent ? (
                  <>
                    <span
                      className="h-6 w-6 rounded-md border border-slate-200 dark:border-slate-700"
                      style={{ background: branding.colorPrimary }}
                      title={branding.colorPrimary}
                    />
                    <span
                      className="h-6 w-6 rounded-md border border-slate-200 dark:border-slate-700"
                      style={{ background: branding.colorAccent }}
                      title={branding.colorAccent}
                    />
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">Not set</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {(branding?.logoUrl || branding?.teamPhotoUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <div className="flex gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          {branding.logoUrl && (
            <img src={branding.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
          // eslint-disable-next-line @next/next/no-img-element
          )}
          {branding.teamPhotoUrl && (
            <img
              src={branding.teamPhotoUrl}
              alt="Team"
              className="h-12 w-12 rounded-md object-cover"
            />
          )}
        </div>
      )}
    </div>
  );
}
