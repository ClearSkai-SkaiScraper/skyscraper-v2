// src/app/(app)/claims/[claimId]/_components/MetricPill.tsx

import { cn } from "@/lib/utils";

interface MetricPillProps {
  label: string;
  value: number | string;
  className?: string;
}

export default function MetricPill({ label, value, className = "" }: MetricPillProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/50",
        className
      )}
    >
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
