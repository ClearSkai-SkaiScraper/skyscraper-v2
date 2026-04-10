// components/reports/TemplateSelector.tsx
"use client";

import { useState } from "react";

import { getTemplatesByType, ReportTemplate } from "@/lib/reports/templates";
import { ReportSectionId,ReportType } from "@/lib/reports/types";

interface TemplateSelectorProps {
  reportType: ReportType;
  currentSections: ReportSectionId[];
  onApplyTemplate: (sections: ReportSectionId[]) => void;
}

export function TemplateSelector({
  reportType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentSections,
  onApplyTemplate,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const templates = getTemplatesByType(reportType);

  const applyTemplate = (template: ReportTemplate) => {
    onApplyTemplate(template.sections);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Load Template
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border bg-white p-2 shadow-lg">
            <div className="mb-1 px-2 py-1 text-xs font-semibold text-slate-500">
              Report Templates
            </div>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="flex w-full flex-col gap-1 rounded px-3 py-2 text-left hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{template.name}</span>
                  {template.isDefault && (
                    <span className="rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{template.description}</p>
                <div className="text-xs text-slate-500">
                  {template.sections.length} sections
                </div>
              </button>
            ))}

            <div className="mt-2 border-t px-2 pt-2">
              <p className="text-xs text-muted-foreground">
                Custom templates coming soon - save your own configurations
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
