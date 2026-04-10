"use client";

import { GeometryAnalyzerPanel } from "@/components/geometry/GeometryAnalyzerPanel";
import { VisionAnalyzerPanel } from "@/components/vision/VisionAnalyzerPanel";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ClaimVisionSection({ claim }: { claim: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-r-lg border-l-4 border-purple-500 bg-purple-50 p-4 dark:bg-purple-900/20">
        <h3 className="mb-2 font-semibold text-purple-900 dark:text-purple-100">
          🧠 AI Vision Analysis (Phase 36)
        </h3>
        <p className="text-sm text-purple-700 dark:text-purple-300">
          Upload property images for automated damage detection with AI-powered heatmap overlays.
          Uses gpt-4o-vision for carrier-grade analysis.
        </p>
      </div>
      <VisionAnalyzerPanel 
        claimId={claim.id}
        onAnalysisComplete={(analysis) => {
          logger.debug("Vision analysis complete:", analysis);
        }}
      />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ClaimGeometrySection({ claim }: { claim: any }) {
  // Get existing damage assessments to pass to geometry analyzer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingDamages = claim.damage_assessments?.flatMap((assessment: any) => 
    assessment.damages || []
  ) || [];

  return (
    <div className="space-y-6">
      <div className="rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-900/20">
        <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
          📐 Roof Geometry Analysis (Phase 37)
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Detect roof slopes and planes with automated material estimation and labor multipliers.
          Generates per-plane repair scorecards for carrier reporting.
        </p>
      </div>
      <GeometryAnalyzerPanel 
        claimId={claim.id}
        existingDamages={existingDamages}
        onAnalysisComplete={(slopeAnalysis, scorecards) => {
          logger.debug("Geometry analysis complete:", { slopeAnalysis, scorecards });
        }}
      />
    </div>
  );
}
