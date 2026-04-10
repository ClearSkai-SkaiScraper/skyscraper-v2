/**
 * AI Core Router
 *
 * Central routing system for all AI operations.
 * Routes requests to appropriate AI handlers based on capability type.
 *
 * Supported capabilities:
 * - classification.damage-type: Classify hail vs wind damage
 * - segmentation.roof-areas: Segment roof damage zones
 * - vision.keypoints: Detect roof measurements and keypoints
 * - prompting.image-caption: Generate image captions
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

export interface RouterExecuteOptions {
  imageUrl?: string;
  prompt?: string;
  claimId: string;
  orgId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RouterExecuteResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
}

export class AICoreRouter {
  /**
   * Execute an AI capability
   */
  async execute(capability: string, options: RouterExecuteOptions): Promise<RouterExecuteResult> {
    try {
      switch (capability) {
        case "classification.damage-type":
          return await this.classifyDamageType(options);

        case "segmentation.roof-areas":
          return await this.segmentRoofAreas(options);

        case "vision.keypoints":
          return await this.detectKeypoints(options);

        case "prompting.image-caption":
          return await this.generateCaption(options);

        default:
          return {
            success: false,
            error: `Unknown capability: ${capability}`,
          };
      }
    } catch (error) {
      logger.error(`[AICoreRouter] Error executing ${capability}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Classify damage type (hail vs wind)
   */
  private async classifyDamageType(options: RouterExecuteOptions): Promise<RouterExecuteResult> {
    if (!options.imageUrl) {
      return { success: false, error: "Missing imageUrl" };
    }

    const openai = getOpenAI();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert roofing inspector specializing in storm damage classification.
Analyze the image and classify the primary damage type as either "hail" or "wind".

Hail damage indicators:
- Circular impact points on shingles
- Bruising or denting on metal surfaces
- Loss of granules in circular patterns
- Uniformly distributed damage points

Wind damage indicators:
- Lifted or missing shingles
- Torn or creased shingles
- Damage concentrated on edges or ridges
- Directional damage patterns

Respond with JSON:
{
  "damageType": "hail" | "wind",
  "confidence": 0.0-1.0,
  "severity": "minor" | "moderate" | "severe" | "catastrophic",
  "indicators": ["list", "of", "specific", "indicators"],
  "reasoning": "brief explanation"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Classify the damage type in this roof image:",
              },
              {
                type: "image_url",
                image_url: {
                  url: options.imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      return {
        success: true,
        data: parsed,
      };
    } catch (error) {
      logger.error("[AICoreRouter] Classification error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Classification failed",
      };
    }
  }

  /**
   * Segment roof areas and damage zones
   */
  private async segmentRoofAreas(options: RouterExecuteOptions): Promise<RouterExecuteResult> {
    if (!options.imageUrl) {
      return { success: false, error: "Missing imageUrl" };
    }

    const openai = getOpenAI();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at segmenting roof images and identifying damage zones.
Analyze the image and identify:
- Different roof areas (field, ridge, valleys, edges, flashing)
- Damage zones and their extent
- Materials visible in each area

Respond with JSON:
{
  "areas": [
    {
      "name": "area name",
      "type": "field|ridge|valley|edge|flashing",
      "damageDetected": true|false,
      "damageExtent": "percentage or description",
      "material": "material type"
    }
  ],
  "totalCoverage": "percentage of roof visible"
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Segment this roof image:",
              },
              {
                type: "image_url",
                image_url: {
                  url: options.imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      return {
        success: true,
        data: parsed,
      };
    } catch (error) {
      logger.error("[AICoreRouter] Segmentation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Segmentation failed",
      };
    }
  }

  /**
   * Detect keypoints and measurements
   */
  private async detectKeypoints(options: RouterExecuteOptions): Promise<RouterExecuteResult> {
    if (!options.imageUrl) {
      return { success: false, error: "Missing imageUrl" };
    }

    const openai = getOpenAI();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing roof measurements and structural features.
Analyze the image and estimate:
- Roof pitch (degrees)
- Number of slopes/planes
- Estimated total area (square feet)
- Material type
- Estimated age
- Visible structural features

Respond with JSON:
{
  "pitch": number (degrees),
  "slopes": number,
  "estimatedArea": number (square feet),
  "material": "material type",
  "estimatedAge": "age range",
  "features": ["list", "of", "features"],
  "confidence": 0.0-1.0
}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze the roof measurements in this image:",
              },
              {
                type: "image_url",
                image_url: {
                  url: options.imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      return {
        success: true,
        data: parsed,
      };
    } catch (error) {
      logger.error("[AICoreRouter] Keypoint detection error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Keypoint detection failed",
      };
    }
  }

  /**
   * Generate image caption
   */
  private async generateCaption(options: RouterExecuteOptions): Promise<RouterExecuteResult> {
    if (!options.imageUrl) {
      return { success: false, error: "Missing imageUrl" };
    }

    const openai = getOpenAI();
    const prompt = options.prompt || "Describe this roof damage image in detail.";

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert roofing inspector writing captions for damage documentation.
Be specific, factual, and detailed. Focus on:
- Type of damage visible
- Location on the roof
- Severity and extent
- Materials affected
- Immediate concerns

Keep captions concise but informative (2-3 sentences).`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: options.imageUrl,
                  detail: "high",
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.5,
      });

      const caption = response.choices[0]?.message?.content || "Unable to generate caption.";

      return {
        success: true,
        data: {
          caption,
          model: "gpt-4o",
        },
      };
    } catch (error) {
      logger.error("[AICoreRouter] Caption generation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Caption generation failed",
      };
    }
  }
}
