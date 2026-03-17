// components/ai/BrandingTemplateSelector.tsx
"use client";

import { FileCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface OrgTemplate {
  id: string;
  name: string;
  templateId: string;
  category?: string;
  template?: {
    id: string;
    name: string;
    category?: string;
  };
}

interface BrandingTemplateSelectorProps {
  onApplyTemplate?: (templateId: string) => void;
}

export function BrandingTemplateSelector({ onApplyTemplate }: BrandingTemplateSelectorProps) {
  const [templates, setTemplates] = useState<OrgTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/templates/company");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.templates?.length > 0) {
            setTemplates(data.templates);
            // Auto-select first template
            setSelectedTemplate(data.templates[0].id);
            onApplyTemplate?.(data.templates[0].id);
          }
        }
      } catch (error) {
        logger.error("Failed to fetch templates:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    onApplyTemplate?.(templateId);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/80">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading templates...</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex items-center gap-2 text-white/70">
        <FileCheck className="h-4 w-4" />
        <span className="text-sm">No templates available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm text-white">
        <FileCheck className="h-4 w-4" />
        <span className="hidden sm:inline">Template:</span>
      </span>
      <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
        <SelectTrigger className="w-[200px] border-white/20 bg-white/10 text-white">
          <SelectValue placeholder="Select template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template, index) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                <span>{template.name}</span>
                {index === 0 && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                    Default
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
