"use client";

// ============================================================================
// TEMPLATES MENU - Phase 3 + SmartTemplateSelector Integration
// ============================================================================
// Preset templates for Roofing, Mitigation, Full Restoration + AI recommendations

import { BookOpen, Check, Sparkles } from "lucide-react";
import { useState } from "react";

import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
import TemplateLibrary from "@/modules/templates/ui/TemplateLibrary";

import type { SectionKey } from "../types";

interface Template {
  id: string;
  name: string;
  description: string;
  sections: SectionKey[];
  icon?: string;
}

const TEMPLATES: Template[] = [
  {
    id: "roofing",
    name: "Roofing",
    description: "Roof damage assessment and repair scope",
    sections: [
      "cover",
      "toc",
      "executive-summary",
      "scope-matrix",
      "code-compliance",
      "pricing-comparison",
      "signature-page",
    ],
    icon: "🏠",
  },
  {
    id: "mitigation",
    name: "Mitigation",
    description: "Emergency mitigation and restoration",
    sections: [
      "cover",
      "toc",
      "executive-summary",
      "adjuster-notes",
      "scope-matrix",
      "pricing-comparison",
      "signature-page",
    ],
    icon: "⚡",
  },
  {
    id: "full-restoration",
    name: "Full Restoration",
    description: "Complete interior & exterior restoration",
    sections: [
      "cover",
      "toc",
      "executive-summary",
      "adjuster-notes",
      "scope-matrix",
      "code-compliance",
      "pricing-comparison",
      "supplements",
      "signature-page",
      "attachments-index",
    ],
    icon: "🔨",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from scratch with no presets",
    sections: ["cover", "toc", "signature-page"],
    icon: "✨",
  },
];

interface TemplatesMenuProps {
  onSelectTemplate: (sections: SectionKey[]) => void;
  onClose: () => void;
  currentSections?: SectionKey[]; // Current builder state for TemplateLibrary
}

export default function TemplatesMenu({
  onSelectTemplate,
  onClose,
  currentSections = [],
}: TemplatesMenuProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.sections);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Choose Template</h3>
              <p className="mt-1 text-sm text-gray-600">
                Select a preset to quickly configure your report sections
              </p>
            </div>
            <button
              onClick={() => setShowAI(!showAI)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                showAI
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              AI Pick
            </button>
          </div>
        </div>

        {/* AI Template Recommendation */}
        {showAI && (
          <div className="border-b border-gray-200 bg-amber-50/50 px-6 py-4">
            <SmartTemplateSelector
              onSelect={(id, slug) => {
                // The SmartTemplateSelector picks full templates, not section presets.
                // Close the AI panel and keep the modal open for the user to select a preset.
                setShowAI(false);
              }}
              defaultStyle="Insurance"
              compact
              label="AI Recommended Templates"
            />
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex flex-col items-start rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-blue-600 hover:bg-blue-50"
            >
              <div className="mb-2 flex items-center gap-3">
                {template.icon && <span className="text-2xl">{template.icon}</span>}
                <h4 className="font-semibold text-gray-900">{template.name}</h4>
              </div>

              <p className="mb-3 text-sm text-gray-600">{template.description}</p>

              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Check className="h-3 w-3" />
                <span>{template.sections.length} sections included</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-gray-200 px-6 py-4">
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <BookOpen className="h-4 w-4" />
            Open Template Library
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Template Library Modal */}
      {showLibrary && (
        <TemplateLibrary
          currentSections={currentSections}
          onClose={() => setShowLibrary(false)}
          onApply={(template) => {
            // Apply saved template sections
            onSelectTemplate(template.sections);
            setShowLibrary(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
