// src/app/(app)/intelligence/[id]/page.tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SmartTemplateSelector } from "@/components/reports/SmartTemplateSelector";
import { logger } from "@/lib/logger";

type ReportType = "QUICK" | "CLAIMS_READY" | "RETAIL" | "FORENSIC";

type FeatureToggles = {
  // Core features
  supplementSummary: boolean;
  weatherAnalysis: boolean;
  codeCitations: boolean;
  materialOptions: boolean;
  retailPricingTable: boolean;

  // Documentation features
  photoAnnotations: boolean;
  damageDocumentation: boolean;
  beforeAfterComparisons: boolean;
  aerialImagery: boolean;

  // Technical features
  manufacturerRequirements: boolean;
  safetyNotes: boolean;
  moistureAnalysis: boolean;
  structuralConcerns: boolean;

  // Client-facing features
  homeownerSummary: boolean;
  colorBoards: boolean;
  materialComparison: boolean;
  financingProposal: boolean;
  workTimeline: boolean;
  warrantyInformation: boolean;
  faqSection: boolean;

  // Legal/compliance
  legalDocumentation: boolean;
  carrierEscalation: boolean;
  depreciationBreakdown: boolean;
  acvRcvLogic: boolean;

  // Advanced
  competitorComparison: boolean;
  industryBenchmarks: boolean;
  claimTrends: boolean;
};

const REPORT_TYPE_PRESETS: Record<ReportType, Partial<FeatureToggles>> = {
  QUICK: {
    supplementSummary: true,
    damageDocumentation: true,
    photoAnnotations: false,
  },
  CLAIMS_READY: {
    supplementSummary: true,
    weatherAnalysis: true,
    codeCitations: true,
    photoAnnotations: true,
    damageDocumentation: true,
    manufacturerRequirements: true,
    safetyNotes: true,
    depreciationBreakdown: true,
    acvRcvLogic: true,
  },
  RETAIL: {
    homeownerSummary: true,
    colorBoards: true,
    materialComparison: true,
    financingProposal: true,
    workTimeline: true,
    warrantyInformation: true,
    faqSection: true,
  },
  FORENSIC: {
    // Everything enabled
    supplementSummary: true,
    weatherAnalysis: true,
    codeCitations: true,
    materialOptions: true,
    retailPricingTable: true,
    photoAnnotations: true,
    damageDocumentation: true,
    beforeAfterComparisons: true,
    aerialImagery: true,
    manufacturerRequirements: true,
    safetyNotes: true,
    moistureAnalysis: true,
    structuralConcerns: true,
    homeownerSummary: false,
    colorBoards: false,
    materialComparison: false,
    financingProposal: false,
    workTimeline: true,
    warrantyInformation: false,
    faqSection: false,
    legalDocumentation: true,
    carrierEscalation: true,
    depreciationBreakdown: true,
    acvRcvLogic: true,
    competitorComparison: true,
    industryBenchmarks: true,
    claimTrends: true,
  },
};

type PageProps = {
  params: { id: string };
};

export default function IntelligenceWizardPage({ params }: PageProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const claimId = params.id;

  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType>("CLAIMS_READY");
  const [features, setFeatures] = useState<FeatureToggles>({
    ...REPORT_TYPE_PRESETS.CLAIMS_READY,
  } as FeatureToggles);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<{
    property_address?: string;
    loss_type?: string;
  } | null>(null);

  // Fetch claim data for report generation
  useEffect(() => {
    async function fetchClaim() {
      try {
        const res = await fetch(`/api/claims/${claimId}`);
        if (res.ok) {
          const data = await res.json();
          setClaimData(data);
        }
      } catch (e) {
        logger.warn("Could not fetch claim data for intelligence page", e);
      }
    }
    if (claimId) void fetchClaim();
  }, [claimId]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  function handleReportTypeChange(type: ReportType) {
    setReportType(type);
    setFeatures({ ...REPORT_TYPE_PRESETS[type] } as FeatureToggles);
  }

  function toggleFeature(key: keyof FeatureToggles) {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleAutoSelectAll() {
    const allEnabled = Object.keys(features).reduce((acc, key) => {
      acc[key as keyof FeatureToggles] = true;
      return acc;
    }, {} as FeatureToggles);
    setFeatures(allEnabled);
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError(null);

      // Determine audience based on report type
      const audienceMap: Record<ReportType, string> = {
        QUICK: "INTERNAL",
        CLAIMS_READY: "ADJUSTER",
        RETAIL: "RETAIL",
        FORENSIC: "ADJUSTER",
      };

      const res = await fetch("/api/reports/build-smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId,
          reportType,
          audience: audienceMap[reportType],
          addonPayload: features,
          address: claimData?.property_address || "Property Address",
          roofType: undefined,
          lossType: claimData?.loss_type || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate report");
      }

      const data = await res.json();

      // Redirect to report view
      router.push(`/claims/${claimId}?tab=reports`);
    } catch (err) {
      logger.error(err);
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">SkaiScraper Intelligence Core</h1>
        <p className="text-sm text-muted-foreground">
          Generate autonomous, AI-powered claim reports using 4-stream intelligence engine
        </p>
      </header>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Report Type */}
      {step === 1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Step 1: Choose Template & Scope</h2>

          {/* AI Template Selection — PRIMARY */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <SmartTemplateSelector
              onSelect={(templateId) => setSelectedTemplateId(templateId)}
              selectedId={selectedTemplateId ?? undefined}
              context={{
                claimId,
                intent:
                  reportType === "CLAIMS_READY" || reportType === "FORENSIC"
                    ? "claim_support"
                    : reportType === "RETAIL"
                      ? "homeowner_estimate"
                      : "inspection_summary",
              }}
              defaultStyle={reportType === "RETAIL" ? "Retail" : "Insurance"}
              showRecommendation={true}
              compact={false}
              label="AI-Recommended Template"
            />
          </div>

          {/* Report Scope Presets — SECONDARY */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Report Scope Preset
            </p>
            <div className="grid gap-2 md:grid-cols-4">
              {(["QUICK", "CLAIMS_READY", "RETAIL", "FORENSIC"] as ReportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleReportTypeChange(type)}
                  className={`rounded-lg border p-3 text-left text-xs transition-colors ${
                    reportType === type
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="mb-0.5 text-sm font-semibold">
                    {type === "QUICK" && "⚡ Quick"}
                    {type === "CLAIMS_READY" && "📋 Claims-Ready"}
                    {type === "RETAIL" && "🏠 Retail"}
                    {type === "FORENSIC" && "🔬 Forensic"}
                  </div>
                  <div className="text-muted-foreground">
                    {type === "QUICK" && "Fast summary"}
                    {type === "CLAIMS_READY" && "Full adjuster packet"}
                    {type === "RETAIL" && "Client proposal"}
                    {type === "FORENSIC" && "Deep analysis"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Next: Configure Features →
          </button>
        </section>
      )}

      {/* Step 2: Feature Toggles */}
      {step === 2 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Step 2: Select Features</h2>
            <button
              onClick={handleAutoSelectAll}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              🏆 Auto-Select All
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Core Features */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Core Features
              </h3>
              {[
                { key: "supplementSummary", label: "Supplement Summary" },
                { key: "weatherAnalysis", label: "Weather Verification" },
                { key: "codeCitations", label: "Code Citations" },
                { key: "materialOptions", label: "Material Options" },
                { key: "retailPricingTable", label: "Retail Pricing" },
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={features[key as keyof FeatureToggles] || false}
                    onChange={() => toggleFeature(key as keyof FeatureToggles)}
                    className="rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {/* Documentation Features */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Documentation
              </h3>
              {[
                { key: "photoAnnotations", label: "Photo Annotations" },
                { key: "damageDocumentation", label: "Damage Documentation" },
                { key: "beforeAfterComparisons", label: "Before/After Comparisons" },
                { key: "aerialImagery", label: "Aerial Imagery" },
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={features[key as keyof FeatureToggles] || false}
                    onChange={() => toggleFeature(key as keyof FeatureToggles)}
                    className="rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {/* Technical Features */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">Technical</h3>
              {[
                { key: "manufacturerRequirements", label: "Manufacturer Requirements" },
                { key: "safetyNotes", label: "Safety Notes" },
                { key: "moistureAnalysis", label: "Moisture Analysis" },
                { key: "structuralConcerns", label: "Structural Concerns" },
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={features[key as keyof FeatureToggles] || false}
                    onChange={() => toggleFeature(key as keyof FeatureToggles)}
                    className="rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            {/* Client-Facing Features */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">
                Client-Facing
              </h3>
              {[
                { key: "homeownerSummary", label: "Homeowner Summary" },
                { key: "colorBoards", label: "Color Boards" },
                { key: "materialComparison", label: "Material Comparison" },
                { key: "financingProposal", label: "Financing Options" },
                { key: "workTimeline", label: "Work Timeline" },
                { key: "warrantyInformation", label: "Warranty Info" },
                { key: "faqSection", label: "FAQ Section" },
              ].map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={features[key as keyof FeatureToggles] || false}
                    onChange={() => toggleFeature(key as keyof FeatureToggles)}
                    className="rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border px-4 py-2 transition-colors hover:bg-muted"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Review & Generate →
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Review & Generate */}
      {step === 3 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Step 3: Review & Generate</h2>

          <div className="space-y-3 rounded-xl border bg-card p-4">
            <div>
              <span className="text-xs text-muted-foreground">Report Type:</span>
              <div className="font-semibold">
                {reportType === "QUICK" && "⚡ Quick Report"}
                {reportType === "CLAIMS_READY" && "📋 Claims-Ready Adjuster Packet"}
                {reportType === "RETAIL" && "🏠 Retail Proposal"}
                {reportType === "FORENSIC" && "🔬 Forensic Report"}
              </div>
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Features Enabled:</span>
              <div className="mt-1 flex flex-wrap gap-1 text-xs">
                {Object.entries(features)
                  .filter(([_, enabled]) => enabled)
                  .map(([key]) => (
                    <span key={key} className="rounded-full bg-primary/10 px-2 py-0.5">
                      {key}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="rounded-lg border px-4 py-2 transition-colors hover:bg-muted"
              disabled={generating}
            >
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {generating ? "🤖 Generating Intelligence Report..." : "🔥 Generate Report"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
