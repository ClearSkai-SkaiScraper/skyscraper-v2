"use client";
/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */

import Link from "next/link";

import { SendPacketButton } from "./SendPacketButton";

interface ReportsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claim: any;
}

export function ClaimReportsSection({ claim }: ReportsSectionProps) {
  const items = claim.reports ?? [];
  
  if (!items.length) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No reports yet</p>
        <Link
          href={`/reports/new?claimId=${claim.id}`}
          className="mt-2 inline-block rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
        >
          Build Report
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Reports</h3>
        <Link
          href={`/reports/new?claimId=${claim.id}`}
          className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New Report
        </Link>
      </div>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <div className="divide-y rounded-xl border bg-card">
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {items.map((r: any) => (
          <div key={r.id} className="space-y-2 px-4 py-3">
            {/* Header */}
            <div className="flex justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {r.title ?? `Report ${r.id.slice(0, 8)}`}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {r.type ?? "—"}
                </div>
              </div>
              <div className="whitespace-nowrap text-[11px] text-muted-foreground">
                {new Date(r.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Action Links */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Link
                href={`/reports/${r.id}`}
                className="font-medium underline hover:text-primary"
              >
                View Report
              </Link>
              <Link
                href={`/exports/reports/${r.id}/adjuster`}
                className="underline hover:text-primary"
              >
                Adjuster Packet
              </Link>
              <Link
                href={`/exports/reports/${r.id}/homeowner`}
                className="underline hover:text-primary"
              >
                Homeowner Summary
              </Link>
              <Link
                href={`/api/reports/${r.id}/export/adjuster-json`}
                className="underline hover:text-primary"
              >
                JSON Export
              </Link>
            </div>

            {/* Send Buttons */}
            <div className="flex flex-wrap gap-2">
              <SendPacketButton
                itemId={r.id}
                itemType="report"
                recipientType="adjuster"
                variant="outline"
                size="sm"
                label="📧 Adjuster"
              />
              <SendPacketButton
                itemId={r.id}
                itemType="report"
                recipientType="homeowner"
                variant="outline"
                size="sm"
                label="📧 Homeowner"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
