"use client";

import { useDraggable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface OrgChartDraggableProps {
  id: string;
  children: ReactNode;
}

export function OrgChartDraggable({ id, children }: OrgChartDraggableProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`transition-opacity ${isDragging ? "opacity-30" : ""}`}
      style={{ touchAction: "none" }}
    >
      {children}
    </div>
  );
}
