"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface ClientShareToggleProps {
  itemId: string;
  itemType: "photo" | "timeline";
  claimId: string;
  isShared: boolean;
  onToggle?: (itemId: string, newState: boolean) => void;
  showLabel?: boolean;
}

export function ClientShareToggle({
  itemId,
  itemType,
  claimId,
  isShared: initialShared,
  onToggle,
  showLabel = true,
}: ClientShareToggleProps) {
  const [isShared, setIsShared] = useState(initialShared);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    const newState = !isShared;

    try {
      const response = await fetch(`/api/claims/${claimId}/toggle-visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: itemType,
          itemIds: [itemId],
          visible: newState,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle visibility");

      setIsShared(newState);
      onToggle?.(itemId, newState);
    } catch (error) {
      logger.error("Toggle error:", error);
      // Revert on error
      setIsShared(isShared);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isShared}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        className={cn(
          "data-[state=checked]:bg-green-600",
          "data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700"
        )}
      />
      {showLabel && (
        <>
          {isShared ? (
            <Badge
              variant="outline"
              className="border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400"
            >
              <Eye className="mr-1 h-3 w-3" />
              Live in Client Portal
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            >
              <EyeOff className="mr-1 h-3 w-3" />
              Hidden from Client
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

interface BulkShareActionsProps {
  claimId: string;
  selectedItems: Array<{ id: string; type: "photo" | "timeline" }>;
  onBulkUpdate?: () => void;
}

export function BulkShareActions({ claimId, selectedItems, onBulkUpdate }: BulkShareActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleBulkToggle = async (visible: boolean) => {
    if (selectedItems.length === 0) return;

    setIsLoading(true);

    try {
      // Group by type
      const photoIds = selectedItems.filter((item) => item.type === "photo").map((item) => item.id);
      const timelineIds = selectedItems
        .filter((item) => item.type === "timeline")
        .map((item) => item.id);

      const requests: Promise<Response>[] = [];

      if (photoIds.length > 0) {
        requests.push(
          fetch(`/api/claims/${claimId}/toggle-visibility`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "photo",
              itemIds: photoIds,
              visible,
            }),
          })
        );
      }

      if (timelineIds.length > 0) {
        requests.push(
          fetch(`/api/claims/${claimId}/toggle-visibility`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "timeline",
              itemIds: timelineIds,
              visible,
            }),
          })
        );
      }

      await Promise.all(requests);
      onBulkUpdate?.();
    } catch (error) {
      logger.error("Bulk toggle error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedItems.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => handleBulkToggle(true)}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Check className="mr-1 h-4 w-4" />
            Share All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkToggle(false)}
            disabled={isLoading}
          >
            <EyeOff className="mr-1 h-4 w-4" />
            Hide All
          </Button>
        </div>
      </div>
    </div>
  );
}
