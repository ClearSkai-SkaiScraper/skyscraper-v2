"use client";

import { CreditCard, DollarSign, Hammer, Home, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type JobCategory = "insurance" | "out_of_pocket" | "financed" | "repair";

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
    value: "out_of_pocket",
    label: "Out of Pocket",
    description: "Homeowner paying cash — direct pay, no insurance or financing",
    icon: <DollarSign className="h-6 w-6" />,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    borderColor: "border-amber-200 dark:border-amber-800 hover:border-amber-400",
  },
  {
    value: "financed",
    label: "Financed",
    description: "Homeowner using a financing plan — third-party lender involved",
    icon: <CreditCard className="h-6 w-6" />,
    color: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
    borderColor: "border-green-200 dark:border-green-800 hover:border-green-400",
  },
  {
    value: "repair",
    label: "Repair / Service",
    description: "Standard repair or maintenance — no full replacement needed",
    icon: <Wrench className="h-6 w-6" />,
    color: "bg-slate-50 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400",
    borderColor: "border-slate-200 dark:border-slate-700 hover:border-slate-400",
  },
];

export default function NewJobPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<JobCategory | null>(null);

  const handleContinue = () => {
    if (!selected) return;

    if (selected === "insurance") {
      // Insurance → Claims intake wizard
      router.push("/claims/new");
    } else {
      // OOP / Financed / Repair → Retail Job 6-step wizard with category pre-selected
      router.push(`/jobs/retail/new?category=${selected}`);
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
