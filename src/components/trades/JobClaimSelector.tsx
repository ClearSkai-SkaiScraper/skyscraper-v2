"use client";

/**
 * Unified Job / Claim / Lead Selector
 * Used across trades tools to pick context — claims, retail, financed, repair, or leads.
 * Groups items by category for easy browsing.
 */

import { Briefcase, FileText, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface JobClaimItem {
  id: string;
  label: string;
  category: "claim" | "retail" | "financed" | "repair" | "lead";
  address?: string | null;
  dateOfLoss?: string | null;
}

interface JobClaimSelectorProps {
  value: string;
  onValueChange: (value: string, item?: JobClaimItem) => void;
  placeholder?: string;
  className?: string;
  /** Only show claims (for claims-specific tools) */
  claimsOnly?: boolean;
}

const categoryLabels: Record<string, string> = {
  claim: "Insurance Claims",
  retail: "Retail Jobs",
  financed: "Financed Jobs",
  repair: "Repair Jobs",
  lead: "Leads",
};

const categoryIcons: Record<string, React.ReactNode> = {
  claim: <FileText className="mr-1.5 inline h-3.5 w-3.5 text-blue-500" />,
  retail: <Briefcase className="mr-1.5 inline h-3.5 w-3.5 text-green-500" />,
  financed: <Briefcase className="mr-1.5 inline h-3.5 w-3.5 text-violet-500" />,
  repair: <Briefcase className="mr-1.5 inline h-3.5 w-3.5 text-amber-500" />,
  lead: <Users className="mr-1.5 inline h-3.5 w-3.5 text-sky-500" />,
};

export function JobClaimSelector({
  value,
  onValueChange,
  placeholder = "Select a job or claim…",
  className,
  claimsOnly = false,
}: JobClaimSelectorProps) {
  const [items, setItems] = useState<JobClaimItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      const allItems: JobClaimItem[] = [];

      // Always fetch claims
      try {
        const res = await fetch("/api/claims/list-lite");
        if (res.ok) {
          const data = await res.json();
          for (const c of data.claims || []) {
            allItems.push({
              id: `claim:${c.id}`,
              label: `${c.claimNumber || c.id.slice(0, 8)} — ${c.propertyAddress || c.insured_name || "No address"}`,
              category: "claim",
              address: c.propertyAddress,
              dateOfLoss: c.dateOfLoss,
            });
          }
        }
      } catch (e) {
        logger.error("Failed to fetch claims:", e);
      }

      // Fetch leads/jobs (retail, financed, repair, leads) unless claimsOnly
      if (!claimsOnly) {
        try {
          const res = await fetch("/api/leads?limit=100");
          if (res.ok) {
            const data = await res.json();
            const leads = data.leads || data || [];
            for (const l of Array.isArray(leads) ? leads : []) {
              const cat = mapJobCategory(l.jobCategory || l.job_category);
              allItems.push({
                id: `${cat}:${l.id}`,
                label: `${l.name || l.insured_name || l.id.slice(0, 8)} — ${l.address || l.propertyAddress || "No address"}`,
                category: cat,
                address: l.address || l.propertyAddress,
              });
            }
          }
        } catch (e) {
          logger.error("Failed to fetch leads:", e);
        }
      }

      setItems(allItems);
      setLoading(false);
    }

    fetchAll();
  }, [claimsOnly]);

  function mapJobCategory(cat?: string): "retail" | "financed" | "repair" | "lead" {
    if (!cat) return "lead";
    const lower = cat.toLowerCase();
    if (lower.includes("retail") || lower === "out_of_pocket") return "retail";
    if (lower.includes("finance")) return "financed";
    if (lower.includes("repair")) return "repair";
    return "lead";
  }

  // Group items by category
  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, JobClaimItem[]>
  );

  const categoryOrder = claimsOnly ? ["claim"] : ["claim", "retail", "financed", "repair", "lead"];

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue
            placeholder={
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </span>
            }
          />
        </SelectTrigger>
      </Select>
    );
  }

  if (items.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No jobs or claims found" />
        </SelectTrigger>
      </Select>
    );
  }

  const safeValue = value && value.trim().length > 0 ? value : undefined;

  return (
    <Select
      value={safeValue}
      onValueChange={(val) => {
        const found = items.find((i) => i.id === val);
        onValueChange(val, found);
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {categoryOrder.map((cat) => {
          const group = grouped[cat];
          if (!group || group.length === 0) return null;
          return (
            <SelectGroup key={cat}>
              <SelectLabel className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {categoryIcons[cat]}
                {categoryLabels[cat]} ({group.length})
              </SelectLabel>
              {group.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <span className="flex items-center gap-1.5">
                    {categoryIcons[item.category]}
                    <span className="truncate">{item.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}
