"use client";

import { ArrowRight, Building2, CloudLightning, Hammer, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const contractorTypes = [
  {
    id: "storm_restoration",
    label: "Storm / Insurance Restoration",
    description: "Hail, wind, hurricane — insurance claims, supplements, and carrier negotiations",
    icon: CloudLightning,
    recommended: true,
  },
  {
    id: "retail_roofing",
    label: "Retail Roofing",
    description: "Re-roofs, new construction, and homeowner-funded projects",
    icon: Hammer,
    recommended: false,
  },
  {
    id: "general_contractor",
    label: "General Contractor / Multi-Trade",
    description: "Siding, gutters, windows, interior — multiple trade lines",
    icon: Wrench,
    recommended: false,
  },
] as const;

type ContractorType = (typeof contractorTypes)[number]["id"];

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [contractorType, setContractorType] = useState<ContractorType>("storm_restoration");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Call the centralized bootstrap endpoint
      const res = await fetch("/api/org/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: orgName.trim() || undefined,
          contractorType,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        // Show more descriptive error message if available
        const errorMsg = data.error || "Failed to create organization";
        const suggestion = data.suggestedAction || "";
        throw new Error(suggestion ? `${errorMsg}. ${suggestion}` : errorMsg);
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Welcome to SkaiScraper</CardTitle>
          <CardDescription>
            The operating system for storm restoration. Let's set up your company.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="orgName">Company Name</Label>
              <Input
                id="orgName"
                placeholder="Acme Restoration, Inc."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Contractor Type Selection */}
            <div className="space-y-3">
              <Label>What type of work do you do?</Label>
              <div className="grid gap-3">
                {contractorTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = contractorType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setContractorType(type.id)}
                      className={cn(
                        "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50/80 shadow-sm dark:border-blue-400 dark:bg-blue-900/20"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {type.label}
                          </span>
                          {type.recommended && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Most Popular
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                "Creating your workspace..."
              ) : (
                <>
                  Launch My Workspace <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-slate-500">
              You can change your contractor type and settings anytime
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
