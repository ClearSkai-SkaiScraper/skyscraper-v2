import React from "react";

import { SectionRegistry } from "@/lib/registry/SectionRegistry";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  sectionId: string;
}

export default function SectionCard({ sectionId }: SectionCardProps) {
  const section = SectionRegistry.getSection(sectionId as any);
  if (!section) return null;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg"
      )}
    >
      <div className="flex items-center gap-3 text-2xl font-bold text-[color:var(--text)]">
        {section.emoji && <span className="text-2xl">{section.emoji}</span>}
        <span>{section.title}</span>
      </div>
      {/* Section-specific content/add-ons would go here */}
    </div>
  );
}
