"use client";

import { Briefcase, DollarSign, Hammer, Home, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type JobCategory = "insurance" | "retail" | "out_of_pocket" | "financed";

const JOB_CATEGORIES: {
  value: JobCategory;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
}[] = [
  {
    value: "insurance",
    label: "Insurance Claim",
    description: "Storm restoration work filed through homeowner's insurance carrier",
    icon: <Home className="h-6 w-6" />,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800 hover:border-blue-400",
  },
  {
    value: "retail",
    label: "Retail Job",
    description: "Direct pay from homeowner — no insurance involved",
    icon: <DollarSign className="h-6 w-6" />,
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800 hover:border-emerald-400",
  },
  {
    value: "out_of_pocket",
    label: "Out of Pocket",
    description: "Homeowner paying cash for repairs not covered by insurance",
    icon: <Landmark className="h-6 w-6" />,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800 hover:border-amber-400",
  },
  {
    value: "financed",
    label: "Financing",
    description: "Homeowner using a financing plan — third-party lender involved",
    icon: <Briefcase className="h-6 w-6" />,
    color: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
    borderColor: "border-purple-200 dark:border-purple-800 hover:border-purple-400",
  },
];

export default function NewJobPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<JobCategory | null>(null);

  const handleContinue = () => {
    if (!selected) return;

    if (selected === "insurance") {
      // Route to claims/new for insurance work
      router.push("/claims/new");
    } else {
      // Route to leads/new with the job category pre-selected
      router.push(`/leads/new?jobCategory=${selected}`);
    }
  };

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="jobs"
        title="New Job"
        subtitle="Select the type of job to get started with the right workflow"
        icon={<Hammer className="h-5 w-5" />}
      />

      <div className="mx-auto max-w-2xl">
        <p className="mb-6 text-center text-sm text-muted-foreground">
          How is this job being paid for? This determines the workflow, required documents, and
          billing structure.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {JOB_CATEGORIES.map((cat) => (
            <Card
              key={cat.value}
              onClick={() => setSelected(cat.value)}
              className={cn(
                "cursor-pointer transition-all",
                cat.borderColor,
                selected === cat.value
                  ? "ring-2 ring-[#117CFF] ring-offset-2 dark:ring-offset-slate-950"
                  : "hover:shadow-md"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-xl p-2.5", cat.color)}>{cat.icon}</div>
                  <div>
                    <CardTitle className="text-base">{cat.label}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">{cat.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button size="lg" disabled={!selected} onClick={handleContinue} className="min-w-[200px]">
            Continue
            {selected && (
              <span className="ml-2 text-xs opacity-75">
                → {JOB_CATEGORIES.find((c) => c.value === selected)?.label}
              </span>
            )}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
