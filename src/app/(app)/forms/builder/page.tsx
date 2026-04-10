"use client";

import { Edit, Eye, FileText,Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface FormField {
  id: string;
  type: "text" | "email" | "number" | "textarea" | "select" | "checkbox" | "file" | "signature";
  label: string;
  required: boolean;
  options?: string[];
}

export default function FormBuilderPage() {
  const [fields, setFields] = useState<FormField[]>([
    { id: "1", type: "text", label: "Customer Name", required: true },
    { id: "2", type: "email", label: "Email Address", required: true },
    { id: "3", type: "textarea", label: "Project Description", required: false },
  ]);

  const [showPreview, setShowPreview] = useState(false);

  const addField = (type: FormField["type"]) => {
    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: `New ${type} field`,
      required: false,
    };
    setFields([...fields, newField]);
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Custom Forms Builder</h1>
          <p className="text-gray-600">Create dynamic forms with conditional logic</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowPreview(!showPreview)} variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            {showPreview ? "Edit" : "Preview"}
          </Button>
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Save Form
          </Button>
        </div>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-4 gap-6">
          {/* Field Types Palette */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 font-bold">Add Fields</h2>
            <div className="space-y-2">
              {[
                { type: "text" as const, label: "Text Input" },
                { type: "email" as const, label: "Email" },
                { type: "number" as const, label: "Number" },
                { type: "textarea" as const, label: "Text Area" },
                { type: "select" as const, label: "Dropdown" },
                { type: "checkbox" as const, label: "Checkbox" },
                { type: "file" as const, label: "File Upload" },
                { type: "signature" as const, label: "E-Signature" },
              ].map((fieldType) => (
                <button
                  key={fieldType.type}
                  onClick={() => addField(fieldType.type)}
                  className="w-full rounded-lg border px-4 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  {fieldType.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Builder Canvas */}
          <div className="col-span-3 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 font-bold">Form Fields</h2>
            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div key={field.id} className="rounded-lg border p-4 hover:border-blue-300">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const newFields = [...fields];
                          newFields[idx].label = e.target.value;
                          setFields(newFields);
                        }}
                        placeholder="Enter field label"
                        className="border-b border-transparent px-2 py-1 font-medium outline-none hover:border-gray-300 focus:border-blue-500"
                      />
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                        <span className="rounded bg-gray-100 px-2 py-1">{field.type}</span>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => {
                              const newFields = [...fields];
                              newFields[idx].required = e.target.checked;
                              setFields(newFields);
                            }}
                          />
                          Required
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded p-2 hover:bg-gray-100" title="Edit field">
                        <Edit className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setFields(fields.filter((f) => f.id !== field.id))}
                        className="rounded p-2 hover:bg-gray-100"
                        aria-label="Delete field"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Field Preview */}
                  <div className="mt-3">
                    {field.type === "textarea" ? (
                      <textarea
                        className="w-full rounded border px-3 py-2"
                        rows={3}
                        disabled
                        aria-label="Preview textarea"
                      />
                    ) : field.type === "select" ? (
                      <select
                        className="w-full rounded border px-3 py-2"
                        disabled
                        aria-label="Preview select"
                      >
                        <option>Option 1</option>
                      </select>
                    ) : field.type === "checkbox" ? (
                      <input type="checkbox" disabled aria-label="Preview checkbox" />
                    ) : field.type === "file" ? (
                      <input
                        type="file"
                        className="w-full"
                        disabled
                        aria-label="Preview file upload"
                      />
                    ) : field.type === "signature" ? (
                      <div className="flex h-24 w-full items-center justify-center rounded border-2 border-dashed text-gray-400">
                        Signature Pad
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        className="w-full rounded border px-3 py-2"
                        disabled
                        placeholder="Preview"
                      />
                    )}
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <Plus className="mx-auto mb-2 h-12 w-12" />
                  <p>Add fields from the left panel to start building your form</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Form Preview */
        <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
          <h2 className="mb-6 text-2xl font-bold">Form Preview</h2>
          <form className="space-y-6">
            {fields.map((field) => (
              <div key={field.id}>
                <label className="mb-2 block font-medium">
                  {field.label}
                  {field.required && <span className="ml-1 text-red-600">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    className="w-full rounded-lg border px-4 py-2"
                    rows={4}
                    placeholder="Enter text..."
                    aria-label={field.label}
                  />
                ) : field.type === "select" ? (
                  <select className="w-full rounded-lg border px-4 py-2" aria-label={field.label}>
                    <option>Select an option...</option>
                  </select>
                ) : field.type === "checkbox" ? (
                  <input type="checkbox" className="h-4 w-4" aria-label={field.label} />
                ) : field.type === "file" ? (
                  <input type="file" className="w-full" aria-label={field.label} />
                ) : field.type === "signature" ? (
                  <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed text-gray-400">
                    Click to sign
                  </div>
                ) : (
                  <input
                    type={field.type}
                    className="w-full rounded-lg border px-4 py-2"
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    aria-label={field.label}
                  />
                )}
              </div>
            ))}
            <Button type="submit" className="w-full">
              Submit Form
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
