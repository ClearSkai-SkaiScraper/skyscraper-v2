"use client";

/**
 * BulkClaimActions (P5 Enhancement)
 *
 * Provides bulk operations for selected claims.
 * Appears as a floating toolbar when claims are selected.
 *
 * Features:
 * - Multi-select claims via checkboxes
 * - Bulk status change
 * - Bulk assignment
 * - Bulk export
 * - Bulk delete (with confirmation)
 */

import { Archive, CheckCircle2, Download, Loader2, RefreshCw, Trash2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BulkClaimActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete?: () => void;
  className?: string;
}

const CLAIM_STATUSES = [
  { value: "NEW", label: "New" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING_DOCS", label: "Pending Documents" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "DENIED", label: "Denied" },
  { value: "CLOSED", label: "Closed" },
];

export function BulkClaimActions({
  selectedIds,
  onClearSelection,
  onActionComplete,
  className,
}: BulkClaimActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const count = selectedIds.length;

  const handleBulkStatusChange = useCallback(
    async (status: string) => {
      if (selectedIds.length === 0) return;

      setIsProcessing(true);
      setProcessingAction(`status-${status}`);

      try {
        const response = await fetch("/api/claims/bulk-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            claimIds: selectedIds,
            updates: { status },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update claims");
        }

        const data = await response.json();
        toast.success(`Updated ${data.updated || selectedIds.length} claims to ${status}`);
        onClearSelection();
        onActionComplete?.();
      } catch (error) {
        console.error("Bulk status update failed:", error);
        toast.error("Failed to update claims. Please try again.");
      } finally {
        setIsProcessing(false);
        setProcessingAction(null);
      }
    },
    [selectedIds, onClearSelection, onActionComplete]
  );

  const handleBulkExport = useCallback(async () => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);
    setProcessingAction("export");

    try {
      const response = await fetch("/api/claims/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimIds: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to export claims");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claims-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedIds.length} claims`);
    } catch (error) {
      console.error("Bulk export failed:", error);
      toast.error("Failed to export claims. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedIds]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.length === 0) return;

    setIsProcessing(true);
    setProcessingAction("archive");

    try {
      const response = await fetch("/api/claims/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimIds: selectedIds,
          updates: { archived: true },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to archive claims");
      }

      const data = await response.json();
      toast.success(`Archived ${data.updated || selectedIds.length} claims`);
      onClearSelection();
      onActionComplete?.();
    } catch (error) {
      console.error("Bulk archive failed:", error);
      toast.error("Failed to archive claims. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedIds, onClearSelection, onActionComplete]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;

    // Confirm deletion
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} claim(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setProcessingAction("delete");

    try {
      const response = await fetch("/api/claims/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimIds: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete claims");
      }

      const data = await response.json();
      toast.success(`Deleted ${data.deleted || selectedIds.length} claims`);
      onClearSelection();
      onActionComplete?.();
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete claims. Please try again.");
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  }, [selectedIds, onClearSelection, onActionComplete]);

  if (count === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800",
        "duration-300 animate-in fade-in slide-in-from-bottom-4",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">
            {count} claim{count > 1 ? "s" : ""} selected
          </span>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Change Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isProcessing} className="gap-1.5">
                {processingAction?.startsWith("status") ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {CLAIM_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => handleBulkStatusChange(status.value)}
                >
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={handleBulkExport}
            className="gap-1.5"
          >
            {processingAction === "export" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>

          {/* Archive */}
          <Button
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={handleBulkArchive}
            className="gap-1.5"
          >
            {processingAction === "archive" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Archive
          </Button>

          {/* Delete */}
          <Button
            variant="outline"
            size="sm"
            disabled={isProcessing}
            onClick={handleBulkDelete}
            className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {processingAction === "delete" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="gap-1.5 text-muted-foreground"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}

export default BulkClaimActions;
