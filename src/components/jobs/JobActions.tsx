"use client";

import { Archive, ArrowRightLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type JobCategory = "claim" | "repair" | "out_of_pocket" | "financed";

interface MoveJobDropdownProps {
  itemId: string;
  itemType: "lead" | "claim";
  currentCategory: JobCategory;
  onMoved?: (newCategory: JobCategory) => void;
}

const CATEGORY_CONFIG: Record<JobCategory, { label: string; color: string }> = {
  claim: { label: "Insurance Claim", color: "text-blue-600" },
  repair: { label: "Repair Job", color: "text-slate-600" },
  out_of_pocket: { label: "Out of Pocket", color: "text-amber-600" },
  financed: { label: "Financed", color: "text-green-600" },
};

export function MoveJobDropdown({
  itemId,
  itemType,
  currentCategory,
  onMoved,
}: MoveJobDropdownProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const availableCategories = (Object.keys(CATEGORY_CONFIG) as JobCategory[]).filter(
    (cat) => cat !== currentCategory
  );

  const handleMove = async (newCategory: JobCategory) => {
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          itemType,
          fromCategory: currentCategory,
          toCategory: newCategory,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to move job");
      }

      toast.success(`Moved to ${CATEGORY_CONFIG[newCategory].label}`);
      onMoved?.(newCategory);
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || "Failed to move job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="mr-2 h-4 w-4" />
          )}
          Move Job
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-xs text-slate-500">Move to workflow:</div>
        <DropdownMenuSeparator />
        {availableCategories.map((category) => (
          <DropdownMenuItem
            key={category}
            onClick={() => handleMove(category)}
            className={CATEGORY_CONFIG[category].color}
          >
            {CATEGORY_CONFIG[category].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ArchiveButtonProps {
  itemId: string;
  itemType: "lead" | "claim" | "project";
  onArchived?: () => void;
}

export function ArchiveButton({ itemId, itemType, onArchived }: ArchiveButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this item? It will be moved to the archive.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to archive");
      }

      toast.success("Item archived successfully");
      onArchived?.();
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || "Failed to archive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleArchive} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Archive className="mr-2 h-4 w-4" />
      )}
      Archive
    </Button>
  );
}
