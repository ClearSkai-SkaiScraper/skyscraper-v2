"use client";

import { CalendarIcon, Check, DollarSign, Pencil, TrendingUp, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  field: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdate: (field: string, value: any) => Promise<void>;
  type?: "text" | "number" | "textarea" | "currency";
  icon?: React.ReactNode;
}

function EditableField({ label, value, field, onUpdate, type = "text", icon }: EditableFieldProps) {
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
      if (type === "number") {
        processedValue = editValue ? parseInt(editValue, 10) : null;
      } else if (type === "currency") {
        // Convert dollars to cents for storage
        const dollars = parseFloat(editValue.replace(/[^0-9.]/g, ""));
        processedValue = dollars ? Math.round(dollars * 100) : null;
      }
      await onUpdate(field, processedValue);
      toast.success(`${label} updated`);
      setIsEditing(false);
    } catch {
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
      <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/20">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {type === "textarea" ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[80px] flex-1"
              disabled={saving}
              autoFocus
            />
          ) : (
            <Input
              type={type === "currency" || type === "number" ? "number" : "text"}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1"
              disabled={saving}
              autoFocus
              placeholder={type === "currency" ? "Enter amount in dollars" : undefined}
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
      className="group cursor-pointer rounded-lg bg-slate-50 p-3 transition-colors hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/20"
      onClick={() => setIsEditing(true)}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <Pencil className="h-3 w-3 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {displayValue}
      </div>
    </div>
  );
}

interface Lead {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  value: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}

interface EditableLeadSummaryProps {
  lead: Lead;
}

export function EditableLeadSummary({ lead }: EditableLeadSummaryProps) {
  const [localLead, setLocalLead] = useState(lead);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUpdate = async (field: string, value: any) => {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      throw new Error("Failed to update");
    }

    setLocalLead((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          Lead Summary
          <span className="ml-auto text-xs font-normal text-indigo-600">
            <Pencil className="mr-1 inline h-3 w-3" />
            Click to edit
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <EditableField
          label="Description"
          value={localLead.description}
          field="description"
          onUpdate={handleUpdate}
          type="textarea"
        />
        <Separator />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EditableField
            label="Source"
            value={localLead.source}
            field="source"
            onUpdate={handleUpdate}
          />
          <EditableField
            label="Estimated Value"
            value={localLead.value}
            field="value"
            onUpdate={handleUpdate}
            type="currency"
            icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          />
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Created
            </div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              {new Date(localLead.createdAt).toLocaleDateString()}
            </div>
          </div>
          {localLead.updatedAt && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Last Updated
              </div>
              <div className="mt-1 text-lg font-semibold">
                {new Date(localLead.updatedAt).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default EditableLeadSummary;
