"use client";

// ============================================================================
// TEMPLATE LIBRARY - Phase 5 Feature 5: Template Save/Apply/Delete
// ============================================================================

import { useState } from "react";
import useSWR from "swr";

interface TemplateLibraryProps {
  reportId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentSections?: any[]; // Current builder state
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onApply?: (template: any) => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TemplateLibrary({
  reportId,
  currentSections,
  onClose,
  onApply,
}: TemplateLibraryProps) {
  const { data, mutate } = useSWR("/api/templates/list", fetcher);
  const templates = data?.templates || [];

  const [savingAs, setSavingAs] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [error, setError] = useState("");

  const handleSaveCurrentAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      setError("Please enter a template name");
      return;
    }

    setSavingAs(true);
    setError("");

    try {
      const res = await fetch("/api/templates/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplateName,
          sectionConfig: currentSections || [],
          isDefault: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save template");
      }

      setNewTemplateName("");
      void mutate();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to save template");
    } finally {
      setSavingAs(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleApplyTemplate = async (template: any) => {
    try {
      const res = await fetch("/api/templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          reportId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to apply template");
      }

      if (onApply) {
        onApply(template);
      }
      onClose();
    } catch (err) {
      console.error("[TemplateLibrary] Apply failed:", err);
      alert("Failed to apply template");
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await fetch("/api/templates/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          isDefault: true,
        }),
      });

      void mutate();
    } catch (err) {
      console.error("[TemplateLibrary] Set default failed:", err);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      void mutate();
    } catch (err) {
      console.error("[TemplateLibrary] Delete failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Template Library</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Save Current as Template */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-blue-900">
              📋 Save Current Layout as Template
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Storm Damage Standard"
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleSaveCurrentAsTemplate}
                disabled={savingAs || !newTemplateName.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingAs ? "Saving..." : "Save Template"}
              </button>
            </div>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>

          {/* Templates List */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Saved Templates ({templates.length})
            </h3>

            {templates.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center text-gray-500">
                No templates saved yet. Save your current layout to get started.
              </div>
            ) : (
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              <div className="space-y-2">
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {templates.map((template: any) => (
                  <div
                    key={template.id}
                    className="rounded-lg border border-gray-200 p-4 transition hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          {template.isDefault && (
                            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {template.sectionConfig?.length || 0} sections • Created{" "}
                          {new Date(template.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApplyTemplate(template)}
                          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                        >
                          Apply
                        </button>
                        {!template.isDefault && (
                          <button
                            onClick={() => handleSetDefault(template.id)}
                            className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Section Preview */}
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <div className="text-xs text-gray-600">
                        <strong>Sections:</strong>{" "}
                        {template.sectionConfig
                          ?.slice(0, 5)
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          .map((s: any) => s.title || s.type)
                          .join(", ")}
                        {template.sectionConfig?.length > 5 &&
                          ` +${template.sectionConfig.length - 5} more`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
