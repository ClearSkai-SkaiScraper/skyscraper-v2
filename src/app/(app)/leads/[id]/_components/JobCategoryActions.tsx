// src/app/(app)/leads/[id]/_components/JobCategoryActions.tsx
"use client";

import { ArrowRight, Briefcase, DollarSign, FileText, Shield, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface JobCategoryActionsProps {
  leadId: string;
  currentCategory: string;
  contactId?: string;
  contactName?: string;
}

const CATEGORIES = [
  {
    value: "lead",
    label: "Lead",
    icon: Briefcase,
    color: "bg-blue-100 text-blue-800",
    description: "General lead - not yet categorized",
  },
  {
    value: "claim",
    label: "Insurance Claim",
    icon: Shield,
    color: "bg-purple-100 text-purple-800",
    description: "Insurance-backed job",
  },
  {
    value: "financed",
    label: "Financed",
    icon: FileText,
    color: "bg-green-100 text-green-800",
    description: "Customer financing",
  },
  {
    value: "out_of_pocket",
    label: "Out of Pocket",
    icon: DollarSign,
    color: "bg-amber-100 text-amber-800",
    description: "Cash/retail job",
  },
  {
    value: "repair",
    label: "Repair",
    icon: Wrench,
    color: "bg-slate-100 text-slate-800",
    description: "Repair/maintenance work",
  },
];

export function JobCategoryActions({
  leadId,
  currentCategory,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contactId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  contactName,
}: JobCategoryActionsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);

  const currentCategoryData = CATEGORIES.find((c) => c.value === currentCategory) || CATEGORIES[0];
  const CurrentIcon = currentCategoryData.icon;

  const handleCategoryChange = async (newCategory: string) => {
    if (newCategory === selectedCategory) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobCategory: newCategory }),
      });

      if (!res.ok) throw new Error("Failed to update category");

      setSelectedCategory(newCategory);

      // If routing to claim, redirect to claims conversion
      if (newCategory === "claim") {
        router.push(`/claims/new?leadId=${leadId}`);
        return;
      }

      router.refresh();
    } catch (error) {
      logger.error("Failed to update category:", error);
      alert("Failed to update job category");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CurrentIcon className="h-5 w-5" />
            Job Category
          </span>
          <Badge className={currentCategoryData.color}>{currentCategoryData.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{currentCategoryData.description}</p>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Route to Different Category
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.filter((c) => c.value !== selectedCategory).map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.value}
                  variant="outline"
                  size="sm"
                  disabled={updating}
                  onClick={() => handleCategoryChange(category.value)}
                  className="justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                  <ArrowRight className="ml-auto h-3 w-3" />
                </Button>
              );
            })}
          </div>
        </div>

        {selectedCategory === "lead" && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> Categorize this lead to route it to the appropriate workflow.
              Insurance claims will be sent to the Claims workspace with full documentation tools.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
