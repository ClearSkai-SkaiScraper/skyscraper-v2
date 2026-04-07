"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { ClaimJobSelect, type ClaimJobSelection } from "@/components/selectors/ClaimJobSelect";
import { Label } from "@/components/ui/label";
import { QuickDOLFinder } from "@/components/weather/QuickDOLFinder";

type ClaimLite = {
  id: string;
  claimNumber: string | null;
  propertyAddress: string | null;
  dateOfLoss: string | null;
};

export default function QuickDOLPage() {
  const [selection, setSelection] = useState<ClaimJobSelection>({});
  const [claimAddress, setClaimAddress] = useState("");
  const [claimLiteMap, setClaimLiteMap] = useState<Record<string, ClaimLite>>({});

  // Load claims for address lookup
  useEffect(() => {
    let cancelled = false;

    async function loadClaimsLite() {
      try {
        const res = await fetch("/api/claims/list-lite", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const claims: ClaimLite[] = Array.isArray(data?.claims) ? data.claims : [];
        const map: Record<string, ClaimLite> = {};
        for (const c of claims) {
          if (c && typeof c.id === "string") map[c.id] = c;
        }
        if (!cancelled) setClaimLiteMap(map);
      } catch {
        // ignore
      }
    }

    void loadClaimsLite();
    return () => {
      cancelled = true;
    };
  }, []);

  // When selection changes, update address
  useEffect(() => {
    const claimId = selection.resolvedClaimId || selection.claimId;
    if (claimId && claimLiteMap[claimId]) {
      setClaimAddress(claimLiteMap[claimId].propertyAddress || "");
    }
  }, [selection, claimLiteMap]);

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Quick Date of Loss (DOL)"
        subtitle="Instant weather-backed date-of-loss pulls with confidence scoring."
      />

      {/* Job/Claim Selector */}
      <PageSectionCard>
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
              Select Context (Optional)
            </h3>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Choose a claim or job to auto-fill the property address.
            </p>
          </div>
          <div className="max-w-md space-y-2">
            <Label htmlFor="claim-select">Claim / Job</Label>
            <ClaimJobSelect
              value={selection}
              onValueChange={setSelection}
              placeholder="Select to auto-fill address..."
            />
            {selection.resolvedClaimId && claimAddress && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Will use address: {claimAddress}
              </p>
            )}
          </div>
        </div>
      </PageSectionCard>

      <PageSectionCard>
        <QuickDOLFinder
          claimId={selection.resolvedClaimId || selection.claimId}
          initialAddress={claimAddress}
          onSelectDate={(date, candidate) => {
            const formatted = format(parseISO(date), "MMMM d, yyyy");
            // Copy to clipboard
            navigator.clipboard.writeText(date).catch(() => {});
            toast.success(`DOL Selected: ${formatted}`, {
              description: `${candidate.peril || "Weather event"} — Score: ${candidate.score}%. Date copied to clipboard.`,
              duration: 5000,
            });
          }}
        />
      </PageSectionCard>
    </PageContainer>
  );
}
