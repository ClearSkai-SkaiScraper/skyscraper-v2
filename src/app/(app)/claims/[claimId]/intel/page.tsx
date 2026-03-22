// src/app/(app)/claims/[claimId]/intel/page.tsx
"use client";

import { Brain, Eye, Network, Search, Shield, Sparkles, Zap } from "lucide-react";
import { useParams } from "next/navigation";

import { CarrierPlaybookPanel } from "@/components/carrier/CarrierPlaybookPanel";
import { AutopilotResolutionPanel } from "@/components/claimiq/AutopilotResolutionPanel";
import { EvidenceGapWidget } from "@/components/intelligence/EvidenceGapWidget";
import { IntelligenceErrorBoundary } from "@/components/intelligence/IntelligenceErrorBoundary";
import { SimilarClaimsPanel } from "@/components/intelligence/SimilarClaimsPanel";
import { SimulationComparison } from "@/components/simulation/SimulationComparison";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function IntelPage() {
  const params = useParams();
  const claimId = (params?.claimId ?? "") as string;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-foreground">
            <Brain className="h-6 w-6 text-violet-500" />
            Claim Intelligence
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-powered insights, evidence analysis, and carrier strategy for this claim.
          </p>
        </div>
        <Badge className="gap-1.5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" />
          AI Powered
        </Badge>
      </div>

      {/* Similar Claims */}
      <Card className="overflow-hidden border-blue-200/50 dark:border-blue-800/50">
        <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3.5 dark:from-blue-950/40 dark:to-indigo-950/40">
          <Search className="h-4.5 w-4.5 text-blue-500" />
          <div>
            <h2 className="font-semibold text-blue-900 dark:text-blue-100">Similar Claims</h2>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
              AI embeddings match claims by damage, carrier, scope, and history
            </p>
          </div>
        </div>
        <div className="p-5">
          <IntelligenceErrorBoundary compact>
            <SimilarClaimsPanel claimId={claimId} />
          </IntelligenceErrorBoundary>
        </div>
      </Card>

      {/* Evidence Gap Analysis */}
      <Card className="overflow-hidden border-amber-200/50 dark:border-amber-800/50">
        <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3.5 dark:from-amber-950/40 dark:to-orange-950/40">
          <Eye className="h-4.5 w-4.5 text-amber-500" />
          <div>
            <h2 className="font-semibold text-amber-900 dark:text-amber-100">
              Evidence Gap Analysis
            </h2>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
              Upload and analyze photos to detect missing evidence
            </p>
          </div>
        </div>
        <div className="p-5">
          <IntelligenceErrorBoundary compact>
            <EvidenceGapWidget claimId={claimId} />
          </IntelligenceErrorBoundary>
        </div>
      </Card>

      {/* Autopilot Resolution Plan */}
      <Card className="overflow-hidden border-emerald-200/50 dark:border-emerald-800/50">
        <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3.5 dark:from-emerald-950/40 dark:to-teal-950/40">
          <Zap className="h-4.5 w-4.5 text-emerald-500" />
          <div>
            <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">
              Autopilot Resolution Plan
            </h2>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
              Autonomous actions and recommended next steps
            </p>
          </div>
        </div>
        <div className="p-5">
          <IntelligenceErrorBoundary compact>
            <AutopilotResolutionPanel claimId={claimId} />
          </IntelligenceErrorBoundary>
        </div>
      </Card>

      {/* Carrier Intelligence */}
      <Card className="overflow-hidden border-purple-200/50 dark:border-purple-800/50">
        <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-purple-50 to-fuchsia-50 px-5 py-3.5 dark:from-purple-950/40 dark:to-fuchsia-950/40">
          <Shield className="h-4.5 w-4.5 text-purple-500" />
          <div>
            <h2 className="font-semibold text-purple-900 dark:text-purple-100">Carrier Playbook</h2>
            <p className="text-xs text-purple-600/70 dark:text-purple-400/70">
              Historical patterns and carrier-specific strategies
            </p>
          </div>
        </div>
        <div className="p-5">
          <IntelligenceErrorBoundary compact>
            <CarrierPlaybookPanel />
          </IntelligenceErrorBoundary>
        </div>
      </Card>

      {/* Simulation Comparisons */}
      <Card className="overflow-hidden border-indigo-200/50 dark:border-indigo-800/50">
        <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3.5 dark:from-indigo-950/40 dark:to-violet-950/40">
          <Network className="h-4.5 w-4.5 text-indigo-500" />
          <div>
            <h2 className="font-semibold text-indigo-900 dark:text-indigo-100">
              Simulation Comparisons
            </h2>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
              AI-generated scenario analysis and outcome predictions
            </p>
          </div>
        </div>
        <div className="p-5">
          <IntelligenceErrorBoundary compact>
            <SimulationComparison claimId={claimId} />
          </IntelligenceErrorBoundary>
        </div>
      </Card>
    </div>
  );
}
