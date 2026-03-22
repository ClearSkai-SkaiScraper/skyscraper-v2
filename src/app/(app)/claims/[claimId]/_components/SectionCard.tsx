// src/app/(app)/claims/[claimId]/_components/SectionCard.tsx
import { Pencil } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  editable?: boolean;
}

export default function SectionCard({
  title,
  action,
  children,
  className = "",
  editable = false,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition-all dark:border-slate-800/60 dark:bg-slate-900/60",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {editable && (
            <span className="flex items-center gap-1 rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Pencil className="h-3 w-3" />
              Editable
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
