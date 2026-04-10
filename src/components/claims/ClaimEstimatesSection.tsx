"use client";
/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */

import Link from "next/link";

import { SendPacketButton } from "./SendPacketButton";

interface EstimatesSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claim: any;
}

export function ClaimEstimatesSection({ claim }: EstimatesSectionProps) {
  const items = claim.estimates ?? [];
  
  if (!items.length) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No estimates yet</p>
        <Link
          href={`/estimates/new?claimId=${claim.id}`}
          className="mt-2 inline-block rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
        >
          Build Estimate
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Estimates</h3>
        <Link
          href={`/estimates/new?claimId=${claim.id}`}
          className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New Estimate
        </Link>
      </div>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <div className="divide-y rounded-xl border bg-card">
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {items.map((e: any) => (
          <div key={e.id} className="space-y-2 px-4 py-3">
            {/* Header */}
            <div className="flex justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {e.title ?? `Estimate ${e.id.slice(0, 8)}`}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {e.mode ?? "—"}
                </div>
              </div>
              <div className="whitespace-nowrap text-[11px] text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Link
                href={`/exports/estimates/${e.id}/adjuster`}
                className="underline hover:text-primary"
              >
                Packet View
              </Link>
              <Link
                href={`/api/estimates/${e.id}/export/json`}
                className="underline hover:text-primary"
              >
                JSON
              </Link>
              <SendPacketButton
                itemId={e.id}
                itemType="estimate"
                recipientType="adjuster"
                variant="link"
                size="sm"
                className="h-auto p-0 text-[11px] underline"
                label="📧 Send"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
