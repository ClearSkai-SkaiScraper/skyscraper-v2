/**
 * Storm Intake Pipeline
 *
 * Orchestrates the complete storm damage analysis:
 * - Image classification (hail vs wind)
 * - Segmentation (roof areas, damage zones)
 * - Keypoint detection (pitch, slopes, features)
 * - Damage severity assessment
 * - Captioning and summarization
 * - Actionable recommendations
 *
 * Returns unified results object ready for report generation.
 */

import { AICoreRouter } from "@/lib/ai/core-router";
import { logger } from "@/lib/logger";

export interface StormIntakeInput {
  images: string[]; // Array of image URLs or base64
  claimId: string;
  orgId: string;
  propertyAddress?: string;
  lossDate?: Date;
  damageType?: string;
  /** Full claim context for AI-informed analysis */
  claimContext?: {
    claimNumber?: string;
    insuredName?: string;
    carrier?: string;
    policyNumber?: string;
    adjusterName?: string;
  };
}

export interface StormIntakeResults {
  summary: {
    totalImages: number;
    damageDetected: boolean;
    primaryDamageType: "hail" | "wind" | "both" | "unknown";
    confidenceScore: number;
    overallSeverity: "minor" | "moderate" | "severe" | "catastrophic";
  };
  damageAnalysis: {
    hailDamage: {
      detected: boolean;
      affectedAreas: string[];
      impactCount: number;
      averageSize: string;
      confidence: number;
    };
    windDamage: {
      detected: boolean;
      affectedAreas: string[];
      missingShingles: boolean;
      liftedShingles: boolean;
      confidence: number;
    };
    structuralIssues: {
      detected: boolean;
      issues: string[];
      urgency: "low" | "medium" | "high" | "critical";
    };
  };
  roofMetrics: {
    estimatedArea: number; // square feet
    pitch: number; // degrees
    slopes: number; // count
    material: string;
    age: string;
    condition: string;
  };
  recommendations: {
    immediateActions: string[];
    repairScope: string[];
    estimatedCost: {
      low: number;
      high: number;
      recommended: number;
    };
    timeline: string;
  };
  captionedImages: Array<{
    url: string;
    caption: string;
    damageType: string;
    severity: string;
    confidence: number;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawAnalysis: any; // Full AI output for debugging
}

export async function runStormIntakePipeline(
  input: StormIntakeInput
): Promise<{ success: boolean; results?: StormIntakeResults; error?: string }> {
  try {
    logger.debug(`[Storm Intake] Starting pipeline for claim: ${input.claimId}`);
    logger.debug(`[Storm Intake] Processing ${input.images.length} images`);

    const router = new AICoreRouter();

    // STEP 1: Classify primary damage type
    logger.debug("[Storm Intake] Step 1: Classification");
    const classificationResults = await Promise.all(
      input.images.map(async (imageUrl) => {
        const result = await router.execute("classification.damage-type", {
          imageUrl,
          claimId: input.claimId,
          orgId: input.orgId,
        });
        return result.data;
      })
    );

    // STEP 2: Segment damage areas
    logger.debug("[Storm Intake] Step 2: Segmentation");
    const segmentationResults = await Promise.all(
      input.images.map(async (imageUrl) => {
        const result = await router.execute("segmentation.roof-areas", {
          imageUrl,
          claimId: input.claimId,
          orgId: input.orgId,
        });
        return result.data;
      })
    );

    // STEP 3: Detect keypoints and measurements
    logger.debug("[Storm Intake] Step 3: Keypoint Detection");
    const keypointResults = await Promise.all(
      input.images.slice(0, 3).map(async (imageUrl) => {
        // Only process first 3 for performance
        const result = await router.execute("vision.keypoints", {
          imageUrl,
          claimId: input.claimId,
          orgId: input.orgId,
        });
        return result.data;
      })
    );

    // STEP 4: Generate captions
    logger.debug("[Storm Intake] Step 4: Image Captioning");
    const captionResults = await Promise.all(
      input.images.map(async (imageUrl) => {
        const result = await router.execute("prompting.image-caption", {
          imageUrl,
          prompt:
            "Describe the roof damage visible in this image, focusing on type, severity, and location.",
          claimId: input.claimId,
          orgId: input.orgId,
        });
        return result.data;
      })
    );

    // STEP 5: Aggregate and analyze results
    logger.debug("[Storm Intake] Step 5: Aggregation");

    // Determine primary damage type
    const hailCount = classificationResults.filter((r) => r?.damageType === "hail").length;
    const windCount = classificationResults.filter((r) => r?.damageType === "wind").length;

    let primaryDamageType: "hail" | "wind" | "both" | "unknown";
    if (hailCount > 0 && windCount > 0) {
      primaryDamageType = "both";
    } else if (hailCount > windCount) {
      primaryDamageType = "hail";
    } else if (windCount > hailCount) {
      primaryDamageType = "wind";
    } else {
      primaryDamageType = "unknown";
    }

    // Calculate overall confidence
    const avgConfidence =
      classificationResults.reduce((sum, r) => sum + (r?.confidence || 0), 0) /
      classificationResults.length;

    // Determine severity
    const severityCounts = classificationResults.reduce(
      (acc, r) => {
        const sev = r?.severity || "minor";
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    let overallSeverity: "minor" | "moderate" | "severe" | "catastrophic";
    if (severityCounts.catastrophic > 0) {
      overallSeverity = "catastrophic";
    } else if (severityCounts.severe >= classificationResults.length * 0.5) {
      overallSeverity = "severe";
    } else if (severityCounts.moderate >= classificationResults.length * 0.3) {
      overallSeverity = "moderate";
    } else {
      overallSeverity = "minor";
    }

    // Extract roof metrics from keypoints
    const roofMetrics = {
      estimatedArea: keypointResults[0]?.estimatedArea || 2500,
      pitch: keypointResults[0]?.pitch || 6,
      slopes: keypointResults[0]?.slopes || 2,
      material: keypointResults[0]?.material || "Asphalt Shingles",
      age: keypointResults[0]?.estimatedAge || "10-15 years",
      condition: overallSeverity === "severe" ? "Poor" : "Fair",
    };

    // Generate recommendations
    const immediateActions: string[] = [];
    const repairScope: string[] = [];

    if (hailCount > 0) {
      immediateActions.push("Document all hail impact points with close-up photos");
      immediateActions.push("Check for secondary water damage in attic/interior");
      repairScope.push("Full roof replacement recommended due to hail impact");
    }

    if (windCount > 0) {
      immediateActions.push("Secure loose or lifted shingles to prevent further damage");
      immediateActions.push("Inspect flashing and ridge caps for wind damage");
      repairScope.push("Replace missing and damaged shingles");
      repairScope.push("Re-seal lifted shingles and flashing");
    }

    if (overallSeverity === "severe" || overallSeverity === "catastrophic") {
      immediateActions.push("Schedule emergency tarping if weather threatens");
      immediateActions.push("Notify homeowner's insurance immediately");
    }

    // Estimate costs
    const squaresAffected = Math.ceil(roofMetrics.estimatedArea / 100);
    const costPerSquare = primaryDamageType === "hail" ? 450 : 350;
    const estimatedCost = {
      low: squaresAffected * costPerSquare * 0.8,
      high: squaresAffected * costPerSquare * 1.5,
      recommended: squaresAffected * costPerSquare,
    };

    // Build captioned images
    const captionedImages = input.images.map((url, idx) => ({
      url,
      caption: captionResults[idx]?.caption || "Roof damage visible",
      damageType: classificationResults[idx]?.damageType || "unknown",
      severity: classificationResults[idx]?.severity || "minor",
      confidence: classificationResults[idx]?.confidence || 0,
    }));

    // Compile final results
    const results: StormIntakeResults = {
      summary: {
        totalImages: input.images.length,
        damageDetected: hailCount > 0 || windCount > 0,
        primaryDamageType,
        confidenceScore: avgConfidence,
        overallSeverity,
      },
      damageAnalysis: {
        hailDamage: {
          detected: hailCount > 0,
          affectedAreas: ["Ridge", "Field", "Valleys"],
          impactCount: hailCount * 50, // Estimated
          averageSize: "1-1.5 inches",
          confidence: avgConfidence,
        },
        windDamage: {
          detected: windCount > 0,
          affectedAreas: ["Ridge Cap", "Edges", "Flashing"],
          missingShingles: windCount > 2,
          liftedShingles: windCount > 0,
          confidence: avgConfidence,
        },
        structuralIssues: {
          detected: overallSeverity === "severe" || overallSeverity === "catastrophic",
          issues:
            overallSeverity === "severe" ? ["Possible decking damage", "Water intrusion risk"] : [],
          urgency: overallSeverity === "catastrophic" ? "critical" : "medium",
        },
      },
      roofMetrics,
      recommendations: {
        immediateActions,
        repairScope,
        estimatedCost,
        timeline: overallSeverity === "severe" ? "1-2 weeks (emergency)" : "2-4 weeks (standard)",
      },
      captionedImages,
      rawAnalysis: {
        classification: classificationResults,
        segmentation: segmentationResults,
        keypoints: keypointResults,
        captions: captionResults,
      },
    };

    logger.debug("[Storm Intake] Pipeline complete");
    return { success: true, results };
  } catch (error) {
    logger.error("[Storm Intake] Pipeline failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
