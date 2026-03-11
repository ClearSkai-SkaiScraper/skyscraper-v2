"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  field: string;
  jobId: string;
  onUpdate: (field: string, value: any) => Promise<void>;
  type?: "text" | "number" | "textarea" | "currency";
}

export function EditableField({
  label,
  value,
  field,
  jobId,
  onUpdate,
  type = "text",
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [saving, setSaving] = useState(false);

  const displayValue =
    type === "currency" && value
      ? `$${(Number(value) / 100).toLocaleString()}`
      : value || "Not set";

  const handleSave = async () => {
    setSaving(true);
    try {
      let processedValue: any = editValue;
      if (type === "number" || type === "currency") {
        processedValue = editValue ? parseInt(editValue.replace(/[^0-9]/g, ""), 10) : null;
      }
      await onUpdate(field, processedValue);
      toast.success(`${label} updated successfully`);
      setIsEditing(false);
    } catch (error) {
      toast.error(`Failed to update ${label}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
        <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-300">{label}</p>
        <div className="flex items-center gap-2">
          {type === "textarea" ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[80px] flex-1"
              disabled={saving}
            />
          ) : (
            <Input
              type={type === "currency" || type === "number" ? "number" : "text"}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1"
              disabled={saving}
            />
          )}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer rounded-lg bg-slate-50 p-3 transition-colors hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-900/20"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <Pencil className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {displayValue}
      </p>
    </div>
  );
}

interface RetailJobClientProps {
  jobId: string;
  initialJob: {
    title: string;
    description: string | null;
    value: number | null;
    budget: number | null;
    stage: string;
    workType: string | null;
  };
}

export function RetailJobClient({ jobId, initialJob }: RetailJobClientProps) {
  const [job, setJob] = useState(initialJob);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(initialJob.description || "");
  const [savingDescription, setSavingDescription] = useState(false);

  const handleUpdate = async (field: string, value: any) => {
    const res = await fetch(`/api/leads/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      throw new Error("Failed to update");
    }

    const data = await res.json();
    if (data.lead) {
      setJob((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveDescription = async () => {
    setSavingDescription(true);
    try {
      await handleUpdate("description", descriptionValue);
      toast.success("Description updated");
      setIsEditingDescription(false);
    } catch {
      toast.error("Failed to update description");
    } finally {
      setSavingDescription(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <EditableField
          label="Estimated Value"
          value={job.value}
          field="value"
          jobId={jobId}
          onUpdate={handleUpdate}
          type="currency"
        />
        <EditableField
          label="Budget"
          value={job.budget}
          field="budget"
          jobId={jobId}
          onUpdate={handleUpdate}
          type="currency"
        />
        <EditableField
          label="Work Type"
          value={job.workType}
          field="workType"
          jobId={jobId}
          onUpdate={handleUpdate}
        />
        <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Stage</p>
          <Badge className="mt-1">{job.stage}</Badge>
        </div>
      </div>

      {job.description !== undefined &&
        (isEditingDescription ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-900/10">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Edit Description
              </p>
            </div>
            <Textarea
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              className="mb-2 min-h-[100px]"
              placeholder="Add a description..."
              disabled={savingDescription}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDescriptionValue(job.description || "");
                  setIsEditingDescription(false);
                }}
                disabled={savingDescription}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
                <Check className="mr-1 h-4 w-4" />
                {savingDescription ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="group cursor-pointer rounded-lg border border-slate-200 p-4 transition-colors hover:border-amber-300 hover:bg-amber-50/50 dark:border-slate-700 dark:hover:border-amber-700 dark:hover:bg-amber-900/10"
            onClick={() => setIsEditingDescription(true)}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</p>
              <Pencil className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {job.description || "Click to add description..."}
            </p>
          </div>
        ))}
    </div>
  );
}

export default RetailJobClient;
