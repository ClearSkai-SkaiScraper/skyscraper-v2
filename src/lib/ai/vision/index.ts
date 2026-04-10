/**
 * Vision Analysis Module
 * Provides property image analysis functionality
 */

import { analyzeImage, type DamageReport } from "@/lib/ai/openai-vision";
import type { AiResponse } from "@/lib/api/aiResponse";

export interface VisionAnalysis {
  damageDetected: boolean;
  damageTypes: string[];
  severity: "none" | "minor" | "moderate" | "severe";
  confidence: number;
  details?: string;
  regions?: DamageRegion[];
}

export interface DamageRegion {
  type: string;
  location: string;
  severity: "minor" | "moderate" | "severe";
  description?: string;
}

/**
 * Analyze a property image for damage
 */
export async function analyzePropertyImage(
  imageUrl: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options?: {
    focusAreas?: string[];
    claimId?: string;
    orgId?: string;
  }
): Promise<AiResponse<VisionAnalysis>> {
  try {
    // Use existing OpenAI vision analysis
    const result = (await analyzeImage(imageUrl)) as any;

    if (!result.ok || !result.data) {
      return result as AiResponse<VisionAnalysis>;
    }

    const damageReport = result.data as any;

    // Transform to VisionAnalysis format
    const analysis: VisionAnalysis = {
      damageDetected: damageReport.damageDetected ?? false,
      damageTypes: damageReport.damageTypes ?? [],
      severity: (damageReport.severity ?? "none") as VisionAnalysis["severity"],
      confidence: damageReport.confidence ?? 0,
      details: damageReport.summary,
      regions: damageReport.regions?.map((r: any) => ({
        type: r.type,
        location: r.location,
        severity: r.severity as DamageRegion["severity"],
        description: r.description,
      })),
    };

    return {
      ok: true,
      data: analysis,
    } as any;
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || "Vision analysis failed",
    } as any;
  }
}

export type { DamageReport };
