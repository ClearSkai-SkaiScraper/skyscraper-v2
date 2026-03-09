"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface OrgChartDropZoneProps {
  id: string;
  children: ReactNode;
}

export function OrgChartDropZone({ id, children }: OrgChartDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl transition-all duration-200 ${
        isOver
          ? "scale-[1.01] ring-2 ring-purple-400 ring-offset-2 dark:ring-purple-600 dark:ring-offset-slate-900"
          : ""
      }`}
    >
      {children}
    </div>
  );
}
