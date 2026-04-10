// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { AlertCircle, CheckCircle2, ExternalLink,Palette } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getBranding, isBrandingComplete } from "@/lib/branding";

/**
 * Server Component: BrandingCard
 * Displays real branding data from database with no client-side caching
 */
export async function BrandingCardServer() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, orgId } = await auth();
  const resolvedOrgId = orgId || userId || "";

  if (!resolvedOrgId) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Palette className="h-5 w-5 text-purple-600" />
          Company Branding
        </h3>
        <p className="text-sm text-gray-600">Please sign in to configure branding.</p>
      </section>
    );
  }

  const branding = await getBranding(resolvedOrgId);
  const isComplete = isBrandingComplete(branding);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Palette className="h-5 w-5 text-purple-600" />
          Company Branding
        </h3>
        {isComplete ? (
          <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            Incomplete
          </div>
        )}
      </div>

      {!isComplete ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-sm text-amber-900">
            Add your company details, logo, and colors to unlock polished AI reports and proposals.
          </p>
          <Link
            href="/settings/branding"
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
          >
            <Palette className="h-4 w-4" />
            Complete Branding Setup
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : branding ? (
        <div className="space-y-4">
          {/* Company Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Company Name
              </div>
              <div className="font-semibold text-gray-900">{branding.companyName}</div>
              {branding.website && (
                <a
                  href={branding.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {branding.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                Contact
              </div>
              <div className="space-y-0.5 text-sm text-gray-700">
                {branding.email && <div>{branding.email}</div>}
                {branding.phone && <div>{branding.phone}</div>}
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Brand Colors
            </div>
            <div className="flex items-center gap-3">
              {branding.colorPrimary && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg border border-gray-200 shadow-sm"
                    style={{ backgroundColor: branding.colorPrimary }}
                    title={`Primary: ${branding.colorPrimary}`}
                  />
                  <span className="font-mono text-xs text-gray-600">{branding.colorPrimary}</span>
                </div>
              )}
              {branding.colorAccent && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg border border-gray-200 shadow-sm"
                    style={{ backgroundColor: branding.colorAccent }}
                    title={`Accent: ${branding.colorAccent}`}
                  />
                  <span className="font-mono text-xs text-gray-600">{branding.colorAccent}</span>
                </div>
              )}
            </div>
          </div>

          {/* Logos */}
          {(branding.logoUrl || branding.teamPhotoUrl) && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                Brand Assets
              </div>
              <div className="flex items-center gap-4">
                {branding.logoUrl && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <Image
                      src={branding.logoUrl}
                      alt="Company Logo"
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                )}
                {branding.teamPhotoUrl && (
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200">
                    <Image
                      src={branding.teamPhotoUrl}
                      alt="Team Photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Link */}
          <div className="pt-2">
            <Link
              href="/settings/branding"
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
            >
              Edit branding settings
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
