// src/components/jobs/TransferJobDropdown.tsx
"use client";

import { logger } from "@/lib/logger";
import { Archive, ArrowRight, Briefcase, DollarSign, FileText, Shield, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransferJobDropdownProps {
  jobId: string;
  currentCategory: string;
  onTransfer?: (newCategory: string) => void;
}

const CATEGORIES = [
  { value: "lead", label: "Lead", icon: Briefcase, description: "General lead" },
  { value: "claim", label: "Insurance Claim", icon: Shield, description: "Insurance-backed job" },
  { value: "financed", label: "Financed Job", icon: FileText, description: "Customer financing" },
  {
    value: "out_of_pocket",
    label: "Out of Pocket",
    icon: DollarSign,
    description: "Cash/retail job",
  },
  { value: "repair", label: "Repair Job", icon: Wrench, description: "Repair/maintenance" },
];

export function TransferJobDropdown({
  jobId,
  currentCategory,
  onTransfer,
}: TransferJobDropdownProps) {
  const router = useRouter();
  const [transferring, setTransferring] = useState(false);

  const handleTransfer = async (newCategory: string) => {
    if (newCategory === currentCategory) return;

    setTransferring(true);
    try {
      const res = await fetch("/api/jobs/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: jobId,
          itemType: "lead",
          fromCategory: currentCategory,
          toCategory: newCategory,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to transfer job");
      }

      const data = await res.json();
      onTransfer?.(newCategory);

      const targetLabel = CATEGORIES.find((c) => c.value === newCategory)?.label || newCategory;
      toast.success(`Job transferred to ${targetLabel}`, {
        description: data.message,
      });

      // If transferred to claim and a claimId was returned, navigate to it
      if (newCategory === "claim" && data.claimId) {
        router.push(`/claims/${data.claimId}`);
        return;
      }

      router.refresh();
    } catch (error) {
      logger.error("Failed to transfer job:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to transfer job. Please try again."
      );
    } finally {
      setTransferring(false);
    }
  };

  const handleArchive = async () => {
    setTransferring(true);
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: jobId, itemType: "lead" }),
      });

      if (!res.ok) throw new Error("Failed to archive job");

      toast.success("Job archived successfully");
      router.push("/archive");
    } catch (error) {
      logger.error("Failed to archive job:", error);
      toast.error("Failed to archive job. Please try again.");
    } finally {
      setTransferring(false);
    }
  };

  const currentCategoryData = CATEGORIES.find((c) => c.value === currentCategory) || CATEGORIES[0];
  const CurrentIcon = currentCategoryData.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={transferring} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          Transfer
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <CurrentIcon className="h-4 w-4" />
          Currently: {currentCategoryData.label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Transfer to...
        </DropdownMenuLabel>
        {CATEGORIES.filter((c) => c.value !== currentCategory).map((category) => {
          const Icon = category.icon;
          return (
            <DropdownMenuItem
              key={category.value}
              onClick={() => handleTransfer(category.value)}
              className="flex cursor-pointer items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-medium">{category.label}</p>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleArchive}
          className="flex cursor-pointer items-center gap-2 text-amber-600 dark:text-amber-400"
        >
          <Archive className="h-4 w-4" />
          <div className="flex-1">
            <p className="font-medium">Archive</p>
            <p className="text-xs text-muted-foreground">Move to archive</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
