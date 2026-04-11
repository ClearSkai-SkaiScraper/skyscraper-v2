"use client";
/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */

import Link from "next/link";

import { SendPacketButton } from "./SendPacketButton";

interface SupplementsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claim: any;
}

export function ClaimSupplementsSection({ claim }: SupplementsSectionProps) {
  const items = claim.supplements ?? [];

  if (!items.length) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No supplements yet</p>
        <Link
          href={`/supplements/new?claimId=${claim.id}`}
          className="mt-2 inline-block rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
        >
          Build Supplement
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Supplements</h3>
        <Link
          href={`/supplements/new?claimId=${claim.id}`}
          className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground transition-colors hover:bg-primary/90"
        >
          New Supplement
        </Link>
      </div>
      <div className="divide-y rounded-xl border bg-card">
        {items.map((s: any) => (
          <div key={s.id} className="space-y-2 px-4 py-3">
            {/* Header */}
            <div className="flex justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {s.id ? `Supplement ${s.id.slice(0, 8)}` : "Supplement"}
                </div>
                {s.notes && (
                  <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {s.notes}
                  </div>
                )}
              </div>
              <div className="whitespace-nowrap text-[11px] text-muted-foreground">
                {new Date(s.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Export Links */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Link
                href={`/exports/supplements/${s.id}/packet`}
                className="underline hover:text-primary"
              >
                Adjuster View
              </Link>
              <Link
                href={`/exports/supplements/${s.id}/homeowner`}
                className="underline hover:text-primary"
              >
                Homeowner View
              </Link>
              <Link
                href={`/api/supplements/${s.id}/export/json`}
                className="underline hover:text-primary"
              >
                Adjuster JSON
              </Link>
              <Link
                href={`/api/supplements/${s.id}/export/homeowner-json`}
                className="underline hover:text-primary"
              >
                Homeowner JSON
              </Link>
            </div>

            {/* Send Buttons */}
            <div className="flex flex-wrap gap-2">
              <SendPacketButton
                itemId={s.id}
                itemType="supplement"
                recipientType="adjuster"
                variant="outline"
                size="sm"
                label="📧 Adjuster"
              />
              <SendPacketButton
                itemId={s.id}
                itemType="supplement"
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
