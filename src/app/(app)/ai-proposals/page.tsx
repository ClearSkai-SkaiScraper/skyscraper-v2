"use client";

/**
 * AI Proposals - Quick Start Wizard
 * Smart entry point for generating AI-powered proposals and reports
 */

import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  Building,
  CheckCircle,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Hammer,
  Loader2,
  PenTool,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

type ProposalType = "insurance-claim" | "retail-proposal" | "quick-estimate";

interface SourceOption {
  id: string;
  label: string;
  subtext?: string;
  type: "claim" | "lead" | "job";
}

export default function AIProposalsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { orgId } = useAuth();

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [proposalType, setProposalType] = useState<ProposalType | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("");

  // Data state
  const [claims, setClaims] = useState<SourceOption[]>([]);
  const [leads, setLeads] = useState<SourceOption[]>([]);
  const [jobs, setJobs] = useState<SourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in?redirect_url=/ai-proposals");
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch data on mount
  useEffect(() => {
    if (!isSignedIn || !orgId) return;

    async function fetchData() {
      try {
        // Fetch claims
        const claimsRes = await fetch("/api/claims/list-lite");
        if (claimsRes.ok) {
          const data = await claimsRes.json();
          setClaims(
            (data.claims || []).map((c: any) => ({
              id: c.id,
              label: c.claimNumber || c.title || "Untitled Claim",
              subtext: c.address || c.propertyAddress,
              type: "claim" as const,
            }))
          );
        }

        // Fetch leads
        const leadsRes = await fetch(`/api/leads?orgId=${orgId}&limit=50`);
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(
            (data.leads || []).map((l: any) => ({
              id: l.id,
              label: l.name || l.email || "Unnamed Lead",
              subtext: l.address || l.phone,
              type: "lead" as const,
            }))
          );
        }

        // Fetch jobs
        const jobsRes = await fetch(`/api/jobs?orgId=${orgId}&limit=50`);
        if (jobsRes.ok) {
          const data = await jobsRes.json();
          setJobs(
            (data.jobs || []).map((j: any) => ({
              id: j.id,
              label: j.title || j.propertyAddress || "Untitled Job",
              subtext: j.propertyType || j.status,
              type: "job" as const,
            }))
          );
        }
      } catch (err) {
        logger.error("[AI Proposals] Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isSignedIn, orgId]);

  // Get source options based on proposal type
  const getSourceOptions = (): SourceOption[] => {
    switch (proposalType) {
      case "insurance-claim":
        return claims;
      case "retail-proposal":
        return [...leads, ...jobs];
      case "quick-estimate":
        return [...leads, ...jobs, ...claims];
      default:
        return [];
    }
  };

  // Handle proposal generation
  const handleGenerate = () => {
    if (!proposalType || !selectedSource) return;

    setGenerating(true);

    // Route to the appropriate builder
    switch (proposalType) {
      case "insurance-claim":
        // Route to Claims-Ready Folder with the selected claim
        router.push(`/claims-ready-folder/${selectedSource}`);
        break;
      case "retail-proposal":
        // Route to Contractor Packet builder
        router.push(`/reports/contractor-packet?source=${selectedSource}`);
        break;
      case "quick-estimate":
        // Route to the quick proposal wizard
        router.push(`/dashboard/proposals/new?source=${selectedSource}`);
        break;
    }
  };

  // Handle skipping source selection (start fresh)
  const handleStartFresh = () => {
    switch (proposalType) {
      case "insurance-claim":
        router.push("/claims-ready-folder");
        break;
      case "retail-proposal":
        router.push("/reports/contractor-packet");
        break;
      case "quick-estimate":
        router.push("/dashboard/proposals/new");
        break;
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <PageContainer>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </PageContainer>
    );
  }

  const sourceOptions = getSourceOptions();

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        section="reports"
        title="AI Proposal Generator"
        subtitle="Create professional proposals in minutes — powered by your data, branding, and AI intelligence"
        icon={<Sparkles className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="bg-white/10 text-white hover:bg-white/20">
            <Link href="/reports/hub">
              <FolderOpen className="mr-2 h-4 w-4" />
              All Reports
            </Link>
          </Button>
          <Button asChild variant="outline" className="bg-white/10 text-white hover:bg-white/20">
            <Link href="/reports/history">
              <FileText className="mr-2 h-4 w-4" />
              History
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step >= s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-500 dark:bg-slate-700"
              }`}
            >
              {step > s ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`mx-2 h-1 w-12 rounded ${
                  step > s ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Proposal Type */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              What type of proposal do you need?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the proposal type to get started with AI-powered generation
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Insurance Claim Packet */}
            <Card
              className={`cursor-pointer border-2 transition-all hover:shadow-lg ${
                proposalType === "insurance-claim"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "hover:border-blue-300"
              }`}
              onClick={() => setProposalType("insurance-claim")}
            >
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <ClipboardCheck className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  Insurance Claim
                  <Badge variant="secondary" className="text-xs">
                    Full Builder
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Generate carrier-compliant claim packets with weather reports, damage
                  documentation, code citations, and adjuster-ready formatting.
                </CardDescription>
                <ul className="mt-3 space-y-1 text-xs text-slate-500">
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Weather verification
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Photo evidence grids
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Code compliance docs
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Retail Proposal */}
            <Card
              className={`cursor-pointer border-2 transition-all hover:shadow-lg ${
                proposalType === "retail-proposal"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : "hover:border-emerald-300"
              }`}
              onClick={() => setProposalType("retail-proposal")}
            >
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
                  <PenTool className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  Retail Proposal
                  <Badge variant="secondary" className="text-xs">
                    Full Builder
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Create polished homeowner-facing proposals with your company branding, pricing,
                  project timelines, and professional layouts.
                </CardDescription>
                <ul className="mt-3 space-y-1 text-xs text-slate-500">
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Company branding
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Material specs
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Digital signatures
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Quick Estimate */}
            <Card
              className={`cursor-pointer border-2 transition-all hover:shadow-lg ${
                proposalType === "quick-estimate"
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                  : "hover:border-purple-300"
              }`}
              onClick={() => setProposalType("quick-estimate")}
            >
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  Quick Estimate
                  <Badge variant="secondary" className="text-xs">
                    AI Draft
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Generate a fast AI-powered estimate or proposal with minimal inputs — perfect for
                  on-site quotes and quick turnarounds.
                </CardDescription>
                <ul className="mt-3 space-y-1 text-xs text-slate-500">
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> AI-generated content
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Live preview
                  </li>
                  <li className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" /> Instant PDF export
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => proposalType && setStep(2)}
              disabled={!proposalType}
              className="min-w-[200px]"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Source */}
      {step === 2 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Select your data source
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose an existing{" "}
              {proposalType === "insurance-claim"
                ? "claim"
                : proposalType === "retail-proposal"
                  ? "lead or job"
                  : "record"}{" "}
              to populate your proposal, or start fresh
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <span className="ml-2 text-slate-500">Loading your data...</span>
                </div>
              ) : sourceOptions.length === 0 ? (
                <div className="py-8 text-center">
                  <FolderOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-slate-500">
                    No{" "}
                    {proposalType === "insurance-claim"
                      ? "claims"
                      : proposalType === "retail-proposal"
                        ? "leads or jobs"
                        : "records"}{" "}
                    found.
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    You can start with a blank proposal.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Select value={selectedSource} onValueChange={setSelectedSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a source..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          <div className="flex items-center gap-2">
                            {option.type === "claim" ? (
                              <ClipboardCheck className="h-4 w-4 text-blue-500" />
                            ) : option.type === "lead" ? (
                              <User className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Hammer className="h-4 w-4 text-emerald-500" />
                            )}
                            <span>{option.label}</span>
                            {option.subtext && (
                              <span className="text-xs text-slate-400">— {option.subtext}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="text-center">
                    <button
                      onClick={handleStartFresh}
                      className="text-sm text-slate-500 underline hover:text-slate-700"
                    >
                      Or start with a blank proposal
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              size="lg"
              onClick={() => setStep(3)}
              disabled={!selectedSource && sourceOptions.length > 0}
              className="min-w-[200px]"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Generate */}
      {step === 3 && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ready to generate</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review your selections and start the AI proposal builder
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span className="font-semibold">Proposal Summary</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Type:</span>
                      <span className="font-medium">
                        {proposalType === "insurance-claim"
                          ? "Insurance Claim Packet"
                          : proposalType === "retail-proposal"
                            ? "Retail Proposal"
                            : "Quick Estimate"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Source:</span>
                      <span className="font-medium">
                        {selectedSource
                          ? sourceOptions.find((o) => o.id === selectedSource)?.label ||
                            "Selected record"
                          : "Starting fresh"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Builder:</span>
                      <span className="font-medium">
                        {proposalType === "insurance-claim"
                          ? "Claims-Ready Folder"
                          : proposalType === "retail-proposal"
                            ? "Contractor Packet Builder"
                            : "Quick Proposal Wizard"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* What happens next */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>What happens next:</strong> You&apos;ll be taken to the full proposal
                    builder where you can customize sections, add photos, and generate professional
                    PDF exports with your company branding.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={generating}
              className="min-w-[200px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening Builder...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Proposal
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Quick Links Section */}
      <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Zap className="h-4 w-4 text-amber-500" />
          Quick Access
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/claims-ready-folder"
            className="flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-700"
          >
            <ClipboardCheck className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Claims Builder</span>
            <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
          <Link
            href="/reports/contractor-packet"
            className="flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-700"
          >
            <PenTool className="h-5 w-5 text-emerald-500" />
            <span className="text-sm font-medium">Retail Proposals</span>
            <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
          <Link
            href="/reports/templates"
            className="flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-700"
          >
            <FileText className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium">Templates</span>
            <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
          <Link
            href="/settings/branding"
            className="flex items-center gap-2 rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:bg-slate-700"
          >
            <Building className="h-5 w-5 text-slate-500" />
            <span className="text-sm font-medium">Branding</span>
            <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Token Info */}
      <div className="mt-6 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
        <p className="text-sm text-purple-800 dark:text-purple-200">
          <strong>💎 Token Usage:</strong> AI-powered proposals consume tokens based on complexity.
          Insurance claims use ~2 tokens, retail proposals ~1 token, and quick estimates ~1 token.
          Manage your balance in{" "}
          <Link href="/settings/billing" className="underline">
            Settings → Billing
          </Link>
          .
        </p>
      </div>
    </PageContainer>
  );
}
