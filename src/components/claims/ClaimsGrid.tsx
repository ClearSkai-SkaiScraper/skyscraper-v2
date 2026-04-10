"use client";

"use client";

import { formatDistanceToNow } from "date-fns";
import { Calendar, ChevronRight, DollarSign, FileText, MapPin } from "lucide-react";
import Link from "next/link";

import { logger } from "@/lib/logger";

type ClaimItem = {
  id: string;
  claimNumber: string | null;
  insured_name?: string | null;
  status: string | null;
  carrier: string | null;
  estimatedValue?: number | null;
  rcvTotal?: number | null;
  propertyAddress?: string | null;
  lossDate?: Date | string | null;
  dateOfLoss?: Date | string | null;
  updatedAt: Date | string;
};

const STATUS_COLORS: Record<string, string> = {
  FILED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  DENIED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function ClaimsGrid({ claims, publicMode }: { claims: ClaimItem[]; publicMode?: boolean }) {
  // 🔥 DEBUG: Log claims data
  logger.debug("[ClaimsGrid] Rendering with claims:", claims.length);
  if (claims.length > 0) {
    // eslint-disable-next-line no-console
    console.log("[ClaimsGrid] First claim:", {
      id: claims[0].id,
      claimNumber: claims[0].claimNumber,
      insured_name: claims[0].insured_name,
      linkUrl: `/claims/${claims[0].id}/overview`,
    });
  }

  if (claims.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-[color:var(--surface-1)] p-8">
        <FileText className="mb-4 h-16 w-16 text-muted-foreground" />
        <h3 className="mb-2 text-xl font-semibold">No claims yet</h3>
        <p className="mb-6 text-center text-muted-foreground">
          Demo data should have been seeded. Check diagnostics below.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <Link
            href="/api/debug/whoami"
            target="_blank"
            className="block text-blue-600 hover:underline"
          >
            → Check /api/debug/whoami
          </Link>
          <Link
            href="/api/debug/claims"
            target="_blank"
            className="block text-blue-600 hover:underline"
          >
            → Check /api/debug/claims
          </Link>
          <form action="/api/debug/reseed" method="POST">
            <button
              type="submit"
              className="mt-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Force Reseed Demo Data
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {claims.map((claim) => {
        const linkHref = publicMode ? `/claims/test/overview` : `/claims/${claim.id}/overview`;
        // 🔥 DEBUG: Log each claim Link
        if (
          claim.id &&
          claim.id.includes &&
          (claim.claimNumber?.includes("DEMO") || (claim.insured_name ?? "").includes("Smith"))
        ) {
          // eslint-disable-next-line no-console
          console.log("[ClaimsGrid] Rendering Link for demo claim:", {
            id: claim.id,
            linkHref,
            claimNumber: claim.claimNumber,
          });
        }

        return (
          <Link
            key={claim.id}
            href={linkHref}
            className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-1)] p-6 shadow-sm transition-all hover:border-[color:var(--border-hover)] hover:shadow-md"
            onClick={(e) => {
              // 🔥 DEBUG: Log click event
              // eslint-disable-next-line no-console
              console.log("[ClaimsGrid] Link clicked:", {
                id: claim.id,
                href: linkHref,
                claimNumber: claim.claimNumber,
              });
            }}
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold group-hover:text-[color:var(--primary)]">
                  {claim.claimNumber || "Untitled Claim"}
                </h3>
                {claim.insured_name && (
                  <p className="text-sm text-muted-foreground">{claim.insured_name}</p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>

            {/* Status Badge */}
            {claim.status && (
              <div className="mb-4">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_COLORS[claim.status] || STATUS_COLORS.PENDING
                  }`}
                >
                  {claim.status}
                </span>
              </div>
            )}

            {/* Details Grid */}
            <div className="space-y-3">
              {claim.carrier && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{claim.carrier}</span>
                </div>
              )}

              {claim.propertyAddress && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">{claim.propertyAddress}</span>
                </div>
              )}

              {(claim.estimatedValue || claim.rcvTotal) && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    ${Number(claim.estimatedValue ?? claim.rcvTotal ?? 0).toLocaleString()}
                  </span>
                </div>
              )}

              {(claim.lossDate || claim.dateOfLoss) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(
                      claim.lossDate || claim.dateOfLoss || new Date()
                    ).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 border-t border-[color:var(--border-subtle)] pt-4">
              <p className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(new Date(claim.updatedAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
