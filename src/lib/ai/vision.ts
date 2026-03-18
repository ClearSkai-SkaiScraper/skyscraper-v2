/**
 * PHASE 36: COMPUTER VISION ENGINE
 *
 * Automated damage detection using gpt-4o-vision with structured output
 *
 * Features:
 * - Property image analysis
 * - Damage detection with bounding boxes
 * - Severity classification
 * - Confidence scoring
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

import { withConditionalCache } from "./cache";
import { withConditionalDedupe } from "./dedupe";
import { trackPerformance } from "./perf";

const VISION_MODEL = "gpt-4o" as const; // Updated to use gpt-4o instead of preview model

export interface BoundingBox {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1 normalized
  height: number; // 0-1 normalized
}

export interface DamageRegion {
  id: string;
  type: string; // "roof_shingle_damage", "siding_damage", "window_damage", etc.
  severity: "none" | "minor" | "moderate" | "severe";
  boundingBox: BoundingBox;
  confidence: number; // 0-1
  description: string;
  repairPriority: "urgent" | "high" | "medium" | "low";
}

export interface VisionAnalysis {
  overallCondition: "excellent" | "good" | "fair" | "poor" | "critical";
  damages: DamageRegion[];
  summary: string;
  estimatedRepairCost: string; // "low", "medium", "high", "very_high"
  urgentIssues: string[];
  analyzedAt: Date;
}

/**
 * Analyze property image for damage detection
 */
export async function analyzePropertyImage(
  imageUrl: string,
  orgId: string,
  options: {
    focusAreas?: string[]; // e.g., ["roof", "siding", "windows"]
    claimId?: string;
  } = {}
): Promise<VisionAnalysis> {
  const { focusAreas = ["roof", "siding", "windows", "foundation"], claimId } = options;

  // Create cache-friendly hash from image URL
  const imageHash = await hashImageUrl(imageUrl);

  const result = await withConditionalCache(
    "vision-analyze",
    { imageHash, focusAreas: focusAreas.join(",") },
    async () => {
      return withConditionalDedupe(
        "vision-analyze",
        { imageHash },
        async () => {
          return trackPerformance(
            {
              routeName: "vision-analyze",
              orgId,
              claimId,
              model: VISION_MODEL,
              cacheHit: false,
            },
            () => _analyzeImageInternal(imageUrl, focusAreas)
          );
        },
        { orgId }
      );
    },
    { orgId, cacheTTL: 2592000 } // 30 days for images
  );

  return result.data as VisionAnalysis;
}

async function _analyzeImageInternal(
  imageUrl: string,
  focusAreas: string[]
): Promise<VisionAnalysis> {
  const prompt = `You are an expert property damage inspector analyzing this image for insurance claims.

**Focus Areas:** ${focusAreas.join(", ")}

**Analysis Requirements:**
1. Identify ALL visible damage in the image
2. For each damage, provide:
   - Type (e.g., "roof_shingle_damage", "siding_crack", "window_broken")
   - Severity: none, minor, moderate, severe
   - Bounding box coordinates (x, y, width, height as 0-1 normalized values)
   - Confidence score (0-1)
   - Description (1-2 sentences)
   - Repair priority: urgent, high, medium, low

3. Provide overall condition assessment
4. Estimate repair cost level: low (<$5K), medium ($5K-$25K), high ($25K-$100K), very_high (>$100K)
5. List any urgent safety issues

**Return JSON format:**
{
  "overallCondition": "fair",
  "damages": [
    {
      "id": "dmg-1",
      "type": "roof_shingle_damage",
      "severity": "moderate",
      "boundingBox": {"x": 0.2, "y": 0.3, "width": 0.4, "height": 0.3},
      "confidence": 0.92,
      "description": "Multiple missing shingles on north slope exposing underlayment",
      "repairPriority": "high"
    }
  ],
  "summary": "Moderate roof damage with exposed underlayment requiring immediate attention",
  "estimatedRepairCost": "medium",
  "urgentIssues": ["Exposed underlayment may lead to water intrusion"]
}`;

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3, // Lower temp for consistent damage detection
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from vision model");
    }

    // Parse JSON response
    const analysis = JSON.parse(content);

    return {
      ...analysis,
      analyzedAt: new Date(),
    };
  } catch (error) {
    logger.error("[Vision] Analysis error:", error);

    // Return safe fallback
    return {
      overallCondition: "fair",
      damages: [],
      summary: "Analysis failed - manual inspection recommended",
      estimatedRepairCost: "medium",
      urgentIssues: [],
      analyzedAt: new Date(),
    };
  }
}

/**
 * Hash image URL for caching
 */
async function hashImageUrl(url: string): Promise<string> {
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(url).digest("hex").substring(0, 16);
}

/**
 * Calculate severity score (0-100)
 */
export function calculateSeverityScore(damages: DamageRegion[]): number {
  if (damages.length === 0) return 0;

  const weights = {
    severe: 100,
    moderate: 60,
    minor: 30,
    none: 0,
  };

  const totalScore = damages.reduce((sum, dmg) => {
    return sum + weights[dmg.severity] * dmg.confidence;
  }, 0);

  return Math.min(100, Math.round(totalScore / damages.length));
}

/**
 * Filter damages by severity threshold
 */
export function filterBySeverity(
  damages: DamageRegion[],
  minSeverity: "minor" | "moderate" | "severe"
): DamageRegion[] {
  const severityOrder = ["none", "minor", "moderate", "severe"];
  const minIndex = severityOrder.indexOf(minSeverity);

  return damages.filter((dmg) => {
    const dmgIndex = severityOrder.indexOf(dmg.severity);
    return dmgIndex >= minIndex;
  });
}

/**
 * Get estimated cost in USD
 */
export function getEstimatedCostRange(costLevel: string): { min: number; max: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    low: { min: 0, max: 5000 },
    medium: { min: 5000, max: 25000 },
    high: { min: 25000, max: 100000 },
    very_high: { min: 100000, max: 500000 },
  };

  return ranges[costLevel] || ranges.medium;
}
