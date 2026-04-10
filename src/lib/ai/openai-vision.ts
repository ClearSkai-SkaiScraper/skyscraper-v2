/**
 * OpenAI Vision Helper for Damage Analysis
 *
 * Uses OpenAI gpt-4o-mini with structured outputs to analyze
 * property photos for damage detection.
 *
 * @see https://platform.openai.com/docs/guides/vision
 * @see https://platform.openai.com/docs/guides/structured-outputs
 */

import { zodResponseFormat } from "openai/helpers/zod";

import { getOpenAI } from "@/lib/ai/client";
import { safeAI } from "@/lib/aiGuard";
import { aiFail, aiOk, type AiResponse, classifyOpenAiError } from "@/lib/api/aiResponse";

import { type DamageReport, DamageReportSchema, validateDamageReport } from "./damage-schema";

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const DAMAGE_ANALYSIS_SYSTEM_PROMPT = `You are an expert property damage inspector specializing in roof and exterior building damage assessment.

Your task is to analyze photos for damage and provide structured findings.

Focus on:
- Hail damage (impact marks, granule loss, exposed mat)
- Wind damage (lifted/missing shingles, debris impact)
- Age-related wear (curling, brittleness, general deterioration)
- Installation defects (improper nailing, poor alignment, inadequate flashing)
- Structural issues (sagging, rot, thermal damage)

For each damage item, provide:
- Specific location on structure
- Component affected (shingle, flashing, etc.)
- Observable indicators
- Severity estimate (none, minor, moderate, severe)
- Confidence score (0-1)

Be conservative with severity ratings. Use "moderate" or "severe" only when clear functional or structural damage is present.

If photo quality prevents accurate assessment, note this in photo_quality_notes.`;

// =============================================================================
// MAIN ANALYSIS FUNCTION
// =============================================================================

export interface AnalyzeImageOptions {
  /** Additional context about the property (address, date of loss, etc.) */
  context?: string;
  /** Maximum tokens for response (default: 2000) */
  maxTokens?: number;
  /** Model to use (default: gpt-4o-mini) */
  model?: "gpt-4o-mini" | "gpt-4o";
}

/**
 * Analyze a single image for property damage
 *
 * @param imageUrl - Public URL to the image (must be accessible to OpenAI)
 * @param options - Analysis options
 * @returns Structured damage report
 * @throws Error if API call fails or response is invalid
 */
export async function analyzeImage(
  imageUrl: string,
  options: AnalyzeImageOptions = {}
): Promise<DamageReport> {
  const { context = "", maxTokens = 2000, model = "gpt-4o-mini" } = options;

  const openai = getOpenAI();

  // Build user message
  let userMessage = "Analyze this property photo for damage. Provide detailed findings.";
  if (context) {
    userMessage += `\n\nContext: ${context}`;
  }

  try {
    const ai = await safeAI("vision-damage-analyze", () =>
      openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: DAMAGE_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userMessage,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "high", // Use high-res analysis
                },
              },
            ],
          },
        ],
        response_format: zodResponseFormat(DamageReportSchema, "damage_report"),
        max_tokens: maxTokens,
        temperature: 0.3, // Lower temperature for more consistent results
      })
    );

    if (!ai.ok) {
      throw new Error(ai.error);
    }

    const response = ai.result;

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    // Parse JSON response
    const parsed = JSON.parse(content);

    // Validate with Zod schema
    const validated = validateDamageReport(parsed);

    return validated;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI Vision analysis failed: ${error.message}`);
    }
    throw error;
  }
}

// =============================================================================
// ENVELOPE VARIANTS (NON-BREAKING ADDITIONS)
// =============================================================================

/**
 * Analyze a single image and return unified envelope response
 */
export async function analyzeImageEnvelope(
  imageUrl: string,
  options: AnalyzeImageOptions = {}
): Promise<AiResponse<DamageReport>> {
  const start = Date.now();
  try {
    const report = await analyzeImage(imageUrl, options);
    // We do not have direct token usage here because safeAI wrapped response already consumed.
    // For minimal metrics, expose model + duration. Token counts will require upstream capture.
    return aiOk(report, {
      model: options.model || "gpt-4o-mini",
      durationMs: Date.now() - start,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    const { message, code } = classifyOpenAiError(err);
    return aiFail(
      message,
      code,
      { imageUrl },
      {
        model: options.model || "gpt-4o-mini",
        durationMs: Date.now() - start,
      }
    );
  }
}

/**
 * Analyze multiple images in batch
 *
 * @param imageUrls - Array of public image URLs
 * @param options - Analysis options
 * @returns Array of damage reports (same order as input)
 */
export async function analyzeImages(
  imageUrls: string[],
  options: AnalyzeImageOptions = {}
): Promise<DamageReport[]> {
  const results: DamageReport[] = [];

  // Sequential processing to avoid rate limits
  for (const url of imageUrls) {
    const report = await analyzeImage(url, options);
    results.push(report);
  }

  return results;
}

/**
 * Batch analyze images with unified envelope per image
 */
export async function analyzeImagesEnvelope(
  imageUrls: string[],
  options: AnalyzeImageOptions = {}
): Promise<AiResponse<DamageReport>[]> {
  const results: AiResponse<DamageReport>[] = [];
  for (const url of imageUrls) {
    results.push(await analyzeImageEnvelope(url, options));
  }
  return results;
}

/**
 * Combine multiple damage reports into a single summary
 *
 * @param reports - Array of individual damage reports
 * @returns Combined damage report
 */
export function combineDamageReports(reports: DamageReport[]): DamageReport {
  if (reports.length === 0) {
    return {
      summary: "No damage reports provided.",
      items: [],
      overall_severity: "none",
      overall_confidence: 1.0,
    };
  }

  if (reports.length === 1) {
    return reports[0];
  }

  // Combine all damage items
  const allItems = reports.flatMap((r) => r.items);

  // Determine overall severity (take highest)
  const severityOrder = { none: 0, minor: 1, moderate: 2, severe: 3 };
  const maxSeverity = reports.reduce(
    (max, r) => {
      return severityOrder[r.overall_severity] > severityOrder[max] ? r.overall_severity : max;
    },
    "none" as DamageReport["overall_severity"]
  );

  // Average confidence across all reports
  const avgConfidence = reports.reduce((sum, r) => sum + r.overall_confidence, 0) / reports.length;

  // Combine summaries
  const combinedSummary = reports.map((r, i) => `Photo ${i + 1}: ${r.summary}`).join(" ");

  // Combine recommendations (deduplicate)
  const allRecommendations = new Set<string>();
  reports.forEach((r) => {
    r.recommendations?.forEach((rec) => allRecommendations.add(rec));
  });

  return {
    summary: combinedSummary,
    items: allItems,
    overall_severity: maxSeverity,
    overall_confidence: Math.round(avgConfidence * 100) / 100,
    recommendations: Array.from(allRecommendations),
  };
}

// =============================================================================
// USAGE COST ESTIMATION
// =============================================================================

/**
 * Estimate OpenAI API cost for image analysis
 *
 * Pricing (as of 2024):
 * - gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
 * - High-res image: ~765 tokens (512x512 tile)
 * - Text tokens: ~500 for system + user prompt
 * - Response: ~500-1500 tokens
 *
 * @param model - Model to use
 * @param imageCount - Number of images to analyze
 * @returns Estimated cost in USD
 */
export function estimateAnalysisCost(model: "gpt-4o-mini" | "gpt-4o", imageCount: number): number {
  const pricing = {
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
    "gpt-4o": { input: 5.0 / 1_000_000, output: 15.0 / 1_000_000 },
  };

  const { input, output } = pricing[model];

  // Rough token estimates per image
  const inputTokensPerImage = 765 + 500; // image + text
  const outputTokensPerImage = 1000; // response

  const inputCost = inputTokensPerImage * imageCount * input;
  const outputCost = outputTokensPerImage * imageCount * output;

  return inputCost + outputCost;
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export type { DamageItem, DamageReport } from "./damage-schema";
