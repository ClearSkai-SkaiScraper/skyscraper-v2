"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { REPORT_SECTION_REGISTRY } from "@/lib/reports/sectionRegistry";

interface TemplateEditorProps {
  orgId: string;
  userId: string;
  existingTemplate?: any;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TemplateEditor({ orgId, userId, existingTemplate }: TemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(existingTemplate?.name || "");
  const [description, setDescription] = useState(existingTemplate?.description || "");
  const [selectedSections, setSelectedSections] = useState<string[]>(
    existingTemplate?.sections?.map((s: any) => s.sectionKey) || []
  );
  const [saving, setSaving] = useState(false);

  const toggleSection = (sectionKey: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionKey) ? prev.filter((k) => k !== sectionKey) : [...prev, sectionKey]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (selectedSections.length === 0) {
      toast.error("Please select at least one section");
      return;
    }

    setSaving(true);
    try {
      if (existingTemplate?.id) {
        // Update existing template
        const res = await fetch(`/api/templates/${existingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            sectionOrder: JSON.stringify(selectedSections),
          }),
        });

        if (!res.ok) throw new Error("Failed to update template");
        toast.success("Template updated successfully");
      } else {
        // Create new template
        const res = await fetch("/api/templates/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            sections: selectedSections,
          }),
        });

        if (!res.ok) throw new Error("Failed to create template");

        const template = await res.json();
        toast.success("Template created successfully");
        router.push(`/reports/templates/${template.id}`);
      }
    } catch (error) {
      logger.error("Failed to save template:", error);
      toast.error(existingTemplate ? "Failed to update template" : "Failed to create template");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold">
          {existingTemplate ? "Edit Template" : "Create Template"}
        </h1>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
              placeholder="e.g., Standard Roof Proposal"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2"
              rows={3}
              placeholder="What is this template used for?"
            />
          </div>

          <div>
            <label className="mb-4 block text-sm font-medium">Select Sections</label>
            <div className="space-y-2">
              {Object.values(REPORT_SECTION_REGISTRY).map((section) => (
                <label
                  key={section.key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.includes(section.key)}
                    onChange={() => toggleSection(section.key)}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium">{section.label}</div>
                    <div className="text-sm text-slate-500">{section.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {existingTemplate ? "Update Template" : "Save Template"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
