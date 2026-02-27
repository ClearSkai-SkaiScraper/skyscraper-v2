"use client";

import { Package } from "lucide-react";
import Link from "next/link";

interface CarrierExportButtonProps {
  claimId: string;
  carrier?: string | null;
  className?: string;
}

/**
 * Carrier Export Button — appears in claim overview Actions section.
 *
 * Links to the full Carrier Export Builder with the claim pre-selected.
 * When a carrier is already set on the claim, it's passed as a query param
 * so the export page can auto-select it.
 *
 * Flow:
 *  1. User clicks "Generate Carrier Export" on claim overview
 *  2. Navigates to /ai/exports?claimId=xxx&carrier=yyy
 *  3. Export page auto-selects the claim + carrier
 *  4. User picks format → generates export
 *  5. Export is saved to history & associated with the claim
 *  6. AI report tools (Claims-Ready Folder, etc.) detect saved exports
 *     and use carrier-specific formatting for all future outputs
 */
export function CarrierExportButton({ claimId, carrier, className }: CarrierExportButtonProps) {
  const params = new URLSearchParams({ claimId });
  if (carrier) params.set("carrier", carrier);

  return (
    <Link
      href={`/ai/exports?${params.toString()}`}
      className={
        className ||
        "inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-teal-700 dark:hover:bg-teal-800"
      }
    >
      <Package className="h-4 w-4" />
      Carrier Export
    </Link>
  );
}
