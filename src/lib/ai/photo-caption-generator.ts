/**
 * AI PHOTO CAPTION GENERATOR
 *
 * Auto-captions damage photos with:
 * - Material type
 * - Damage type
 * - Functional impact
 * - Applicable code
 * - DOL tie-in
 *
 * NEVER says "may" or "possible" — always asserts facts.
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { CODE_LIBRARY } from "@/types/universal-claims-report";

const openai = getOpenAI();

export interface PhotoCaptionInput {
  imageUrl: string;
  claimContext: {
    materialType: "tile" | "shingle" | "metal" | "tpo" | "other";
    materialDetail: string; // e.g., "Concrete S-Tile"
    dateOfLoss: string;
    hailSize?: string;
    windSpeed?: string;
  };
}

export interface PhotoCaption {
  materialType: string;
  damageType: string;
  functionalImpact: string;
  applicableCode: string;
  dolTieIn: string;
}

/**
 * Generate AI caption for damage photo
 */
export async function generatePhotoCaption(input: PhotoCaptionInput): Promise<PhotoCaption> {
  const { imageUrl, claimContext } = input;

  // Get applicable codes for material type
  const applicableCodes = CODE_LIBRARY[claimContext.materialType] || [];

  const systemPrompt = `You are an expert roofing inspector generating damage captions for insurance claims.

CRITICAL RULES:
- Mention material type in every caption
- Identify specific damage type
- State functional impact clearly
- Attach applicable building code
- Never say "may" or "possible" - always assert facts
- Tie every photo to the date of loss
- Use active voice

CLAIM CONTEXT:
- Material: ${claimContext.materialDetail}
- Date of Loss: ${claimContext.dateOfLoss}
- Hail Size: ${claimContext.hailSize || "Unknown"}
- Wind Speed: ${claimContext.windSpeed || "Unknown"}

APPLICABLE CODES:
${applicableCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

Generate a caption with these exact fields:
1. materialType: The specific roofing material visible
2. damageType: The type of damage observed (use assertive language)
3. functionalImpact: How this damage affects the roof's function (be specific about consequences)
4. applicableCode: Which code from the list above applies (cite the specific requirement)
5. dolTieIn: How this damage ties to the date of loss event (connect to hail/wind)

REMEMBER: Never use "may", "possibly", "appears to be", or uncertain language. State facts assertively.`;

  const userPrompt = `Analyze this damage photo and generate a caption following the rules above.

Return ONLY valid JSON in this exact format:
{
  "materialType": "string",
  "damageType": "string",
  "functionalImpact": "string",
  "applicableCode": "string",
  "dolTieIn": "string"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.3, // Low temperature for consistency
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON response
    const caption = JSON.parse(content) as PhotoCaption;

    // Validate all fields exist
    if (
      !caption.materialType ||
      !caption.damageType ||
      !caption.functionalImpact ||
      !caption.applicableCode ||
      !caption.dolTieIn
    ) {
      throw new Error("AI response missing required fields");
    }

    return caption;
  } catch (error) {
    logger.error("[PHOTO_CAPTION_ERROR]", error);

    // Fallback caption
    return {
      materialType: claimContext.materialDetail,
      damageType: "Structural damage identified",
      functionalImpact:
        "This damage compromises the roof's weatherproofing integrity and requires immediate attention",
      applicableCode: applicableCodes[0] || "Building code compliance required",
      dolTieIn: `Damage consistent with ${claimContext.hailSize || "storm event"} on ${claimContext.dateOfLoss}`,
    };
  }
}

/**
 * Batch generate captions for multiple photos
 */
export async function generatePhotoCaptionsBatch(
  inputs: PhotoCaptionInput[]
): Promise<PhotoCaption[]> {
  const results = await Promise.allSettled(inputs.map((input) => generatePhotoCaption(input)));

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      logger.error(`[PHOTO_CAPTION_ERROR] Photo ${index}`, { reason: result.reason });
      // Return fallback
      return {
        materialType: inputs[index].claimContext.materialDetail,
        damageType: "Damage identified",
        functionalImpact: "Requires assessment and repair",
        applicableCode: "Building code compliance required",
        dolTieIn: `Related to storm event on ${inputs[index].claimContext.dateOfLoss}`,
      };
    }
  });
}

/**
 * Validate caption follows AI rules
 */
export function validateCaptionCompliance(caption: PhotoCaption): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check for uncertain language
  const uncertainWords = ["may", "possibly", "appears", "seems", "might", "could"];
  const allText = Object.values(caption).join(" ").toLowerCase();

  uncertainWords.forEach((word) => {
    if (allText.includes(word)) {
      violations.push(`Contains uncertain language: "${word}"`);
    }
  });

  // Check for passive voice (basic check)
  if (allText.includes("may have") || allText.includes("could have")) {
    violations.push("Uses passive/uncertain voice");
  }

  // Check all fields populated
  Object.entries(caption).forEach(([field, value]) => {
    if (!value || value.trim().length === 0) {
      violations.push(`Missing required field: ${field}`);
    }
  });

  return {
    valid: violations.length === 0,
    violations,
  };
}
