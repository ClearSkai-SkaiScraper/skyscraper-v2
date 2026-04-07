"use client";

import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
  category: "documentation" | "financial" | "completion";
}

const CHECKLIST_FIELDS: Omit<ChecklistItem, "checked">[] = [
  // Documentation
  { key: "allPhotosPresent", label: "All photos uploaded", category: "documentation" },
  { key: "allFormsUploaded", label: "All forms uploaded", category: "documentation" },
  { key: "signedCompletionForm", label: "Signed completion form", category: "documentation" },
  // Financial
  { key: "finalInvoiceAttached", label: "Final invoice attached", category: "financial" },
  { key: "subcontractorsPaid", label: "Subcontractors paid", category: "financial" },
  { key: "materialsReconciled", label: "Materials reconciled", category: "financial" },
  { key: "depreciationRequested", label: "Depreciation requested", category: "financial" },
  { key: "depreciationReceived", label: "Depreciation received", category: "financial" },
  { key: "finalPaymentReceived", label: "Final payment received", category: "financial" },
  // Completion
  { key: "warrantyRegistered", label: "Warranty registered", category: "completion" },
  { key: "dumpsterAccounted", label: "Dumpster accounted for", category: "completion" },
  { key: "buildDaysLogged", label: "Build days logged", category: "completion" },
];

interface CloseoutChecklistProps {
  entityId: string;
  entityType: "claim" | "lead";
}

export function CloseoutChecklist({ entityId, entityType }: CloseoutChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>(
    CHECKLIST_FIELDS.map((f) => ({ ...f, checked: false }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void fetchChecklist();
  }, [entityId]);

  async function fetchChecklist() {
    try {
      const res = await fetch(
        `/api/closeout/checklist?entityId=${entityId}&entityType=${entityType}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.checklist) {
          setItems((prev) =>
            prev.map((item) => ({
              ...item,
              checked: data.checklist[item.key] === true,
            }))
          );
        }
      }
    } catch (err) {
      logger.error("[CloseoutChecklist] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleItem(key: string, checked: boolean) {
    setSaving(key);
    // Optimistic update
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, checked } : item)));

    try {
      const res = await fetch("/api/closeout/checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, entityType, field: key, value: checked }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      // Revert on failure
      setItems((prev) =>
        prev.map((item) => (item.key === key ? { ...item, checked: !checked } : item))
      );
      toast.error("Failed to save checklist item");
    } finally {
      setSaving(null);
    }
  }

  const completedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const categories = [
    { key: "documentation", label: "Documentation", emoji: "📄" },
    { key: "financial", label: "Financial", emoji: "💰" },
    { key: "completion", label: "Completion", emoji: "✅" },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Closeout Progress</span>
          <span className="text-muted-foreground">
            {completedCount}/{totalCount} ({progressPct}%)
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct === 100
                ? "bg-emerald-500"
                : progressPct > 60
                  ? "bg-blue-500"
                  : "bg-amber-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist by Category */}
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.key);
        const catDone = catItems.filter((i) => i.checked).length;
        return (
          <Card key={cat.key} className="overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2">
              <span className="text-sm font-semibold">
                {cat.emoji} {cat.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {catDone}/{catItems.length}
              </span>
            </div>
            <div className="divide-y">
              {catItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleItem(item.key, !item.checked)}
                  disabled={saving === item.key}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
                >
                  {saving === item.key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : item.checked ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                  )}
                  <span
                    className={`text-sm ${
                      item.checked ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        );
      })}

      {progressPct === 100 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            ✅ All checklist items complete — ready for closeout!
          </p>
        </div>
      )}
    </div>
  );
}
