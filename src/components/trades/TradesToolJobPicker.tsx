"use client";

/**
 * TradesToolJobPicker
 * Client-side job/claim selector bar used at the top of trades tool pages.
 * Stores selection in URL search params so server components can read it.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { JobClaimSelector } from "@/components/trades/JobClaimSelector";

interface TradesToolJobPickerProps {
  /** Show only claims (for claims-specific tools) */
  claimsOnly?: boolean;
  /** Label shown before the selector */
  label?: string;
}

export function TradesToolJobPicker({
  claimsOnly = false,
  label = "Select a job or claim for context:",
}: TradesToolJobPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentValue = searchParams?.get("jobContext") || "";
  const [selected, setSelected] = useState(currentValue);

  const handleChange = (val: string) => {
    setSelected(val);
    // Update URL with the selected context
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("jobContext", val);
    // Also parse out the raw ID for API compatibility
    const rawId = val.includes(":") ? val.split(":")[1] : val;
    const category = val.includes(":") ? val.split(":")[0] : "claim";
    params.set("contextId", rawId);
    params.set("contextType", category);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border-2 border-[#117CFF]/20 bg-white p-3 shadow-sm dark:border-[#117CFF]/30 dark:bg-slate-900 sm:flex-row sm:items-center sm:gap-3">
      <span className="whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <JobClaimSelector
        value={selected}
        onValueChange={handleChange}
        claimsOnly={claimsOnly}
        className="w-full sm:w-[360px]"
        placeholder={claimsOnly ? "Select a claim…" : "Select a job or claim…"}
      />
    </div>
  );
}
