"use client";

import { ArrowRight, CreditCard, DollarSign, FileText, Wrench } from "lucide-react";
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
import { logger } from "@/lib/logger";

interface LeadRoutingDropdownProps {
  leadId: string;
  currentCategory?: string;
}

const ROUTE_OPTIONS = [
  {
    id: "claim",
    label: "Route to Claims",
    description: "Convert to insurance claim",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  {
    id: "out_of_pocket",
    label: "Route to Out of Pocket",
    description: "Customer pays directly",
    icon: DollarSign,
    color: "text-amber-600",
    bgColor: "bg-amber-50 hover:bg-amber-100",
  },
  {
    id: "financed",
    label: "Route to Financed",
    description: "Financing through partners",
    icon: CreditCard,
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  {
    id: "repair",
    label: "Route to Repair",
    description: "Standard repair job",
    icon: Wrench,
    color: "text-slate-600",
    bgColor: "bg-slate-50 hover:bg-slate-100",
  },
];

export function LeadRoutingDropdown({ leadId, currentCategory }: LeadRoutingDropdownProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleRoute(category: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobCategory: category }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to route lead");
      }

      const data = await res.json();
      toast.success(`Lead routed to ${category.replace("_", " ")}`);

      // Redirect based on category
      if (category === "claim") {
        router.push(`/claims/${data.claimId || leadId}`);
      } else {
        router.push(`/jobs/retail/${leadId}`);
      }
    } catch (error) {
      logger.error("Route error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to route lead");
    } finally {
      setIsLoading(false);
    }
  }

  // Don't show dropdown if already categorized (not a lead)
  if (currentCategory && currentCategory !== "lead") {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          disabled={isLoading}
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Route
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Route Lead To</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROUTE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => handleRoute(option.id)}
              className={`cursor-pointer ${option.bgColor}`}
            >
              <Icon className={`mr-2 h-4 w-4 ${option.color}`} />
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
