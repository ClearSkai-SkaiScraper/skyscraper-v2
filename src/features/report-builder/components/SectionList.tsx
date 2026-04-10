"use client";

import { Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent,CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import type { ReportSection } from "../types";

interface SectionListProps {
  reportId: string;
  sections: ReportSection[];
  onReorder: (sections: ReportSection[]) => void;
  onToggleVisibility: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
}

export function SectionList({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  reportId,
  sections,
  onReorder,
  onToggleVisibility,
  onDelete,
}: SectionListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSections = [...sections];
    const draggedSection = newSections[draggedIndex];
    newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedSection);

    // Update sort order
    const reorderedSections = newSections.map((section, idx) => ({
      ...section,
      sortOrder: idx,
    }));

    onReorder(reorderedSections);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Sections</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sections
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-md border p-3 transition-all ${
                  draggedIndex === index ? "opacity-50" : ""
                } hover:bg-gray-50`}
              >
                {/* Drag Handle */}
                <GripVertical className="h-5 w-5 cursor-grab text-gray-400" />

                {/* Visibility Toggle */}
                <Checkbox
                  checked={section.isVisible}
                  onCheckedChange={() => onToggleVisibility(section.id)}
                />

                {/* Section Title */}
                <div className="flex-1">
                  <p className="font-medium">{section.title}</p>
                  <p className="text-sm text-gray-500">{section.type}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onToggleVisibility(section.id)}>
                    {section.isVisible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(section.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
        </div>

        {sections.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No sections yet. Click &quot;Generate Report&quot; to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
