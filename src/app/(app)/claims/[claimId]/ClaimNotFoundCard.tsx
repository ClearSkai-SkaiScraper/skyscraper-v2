"use client";

import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ClaimNotFoundCardProps {
  claimId: string;
  orgId?: string;
  claimOrgId?: string;
  reason?: "not_found" | "org_mismatch" | "error";
}

export function ClaimNotFoundCard({
  claimId,
  orgId,
  claimOrgId,
  reason = "not_found",
}: ClaimNotFoundCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-red-200 bg-white p-8 shadow-lg dark:border-red-900 dark:bg-slate-900">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Unable to Load Claim
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Claim ID: <span className="font-mono text-xs">{claimId}</span>
          </p>
        </div>

        {/* Reason-specific message */}
        <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
          {reason === "org_mismatch" && orgId && claimOrgId && (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Organization Mismatch
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This claim was created with a different organization context. This can happen if the
                claim was created during a system update or migration.
              </p>
              <div className="mt-3 space-y-1 rounded border border-slate-200 bg-white p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-900">
                <div>
                  <span className="text-slate-500">Your Org ID:</span>{" "}
                  <span className="text-slate-900 dark:text-slate-100">{orgId}</span>
                </div>
                <div>
                  <span className="text-slate-500">Claim Org ID:</span>{" "}
                  <span className="text-slate-900 dark:text-slate-100">{claimOrgId}</span>
                </div>
              </div>
            </>
          )}

          {reason === "not_found" && (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Claim Not Found
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This claim doesn&apos;t exist in the database, or it may have been deleted.
              </p>
            </>
          )}

          {reason === "error" && (
            <>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Database Error
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                There was an error loading this claim from the database. Please try again.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button asChild className="gap-2">
            <Link href="/claims/new">
              <RefreshCw className="h-4 w-4" />
              Create New Claim
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/claims">
              <ArrowLeft className="h-4 w-4" />
              Back to Claims List
            </Link>
          </Button>
        </div>

        {/* Support hint */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          If you believe this is an error, please contact support with the claim ID above.
        </div>
      </div>
    </div>
  );
}
