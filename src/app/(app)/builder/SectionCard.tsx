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
    <div className={cn("flex flex-col gap-2 rounded-lg bg-white p-4 shadow")}>
      <div className="flex items-center gap-2 text-lg font-semibold">{section.title}</div>
      {/* Section-specific content/add-ons would go here */}
    </div>
  );
}
