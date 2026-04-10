import { logger } from "@/lib/logger";

/**
 * Damage Builder - AI-powered damage analysis
 * Stub file for legacy imports
 */

export interface ImageAnalysisResult {
  damages: Array<{
    type: string;
    severity: string;
    location: string;
    confidence: number;
  }>;
  summary: string;
}

/**
 * Analyze images for damage
 * @deprecated Use runDamageBuilder from '@/lib/ai/damage' instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function analyzeImages(images: string[]): Promise<ImageAnalysisResult> {
  logger.warn('analyzeImages is deprecated - use runDamageBuilder from @/lib/ai/damage instead');
  
  return {
    damages: [],
    summary: 'Image analysis not available - please use the modern damage builder'
  };
}
