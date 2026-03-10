/**
 * AI Photo Annotation API
 *
 * Combines damage detection with IRC code mapping and bounding box generation.
 * Returns annotations ready for the PhotoAnnotator component.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";

// Lazy singleton for OpenAI
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const RequestSchema = z.object({
  imageUrl: z.string().url(),
  photoId: z.string().optional(),
  includeSlopes: z.boolean().default(false),
  roofType: z
    .enum(["asphalt_shingle", "metal", "tile", "flat", "slate", "wood_shake", "unknown"])
    .default("asphalt_shingle"),
});

// IRC Building Codes for roofing damage - matches PhotoAnnotator
const IRC_CODE_MAP: Record<string, string> = {
  hail_impact: "shingle_damage",
  wind_damage: "shingle_damage",
  missing_shingles: "shingle_damage",
  granule_loss: "shingle_damage",
  lifted_curled: "shingle_damage",
  cracked_broken: "shingle_damage",
  flashing_damage: "flashing",
  underlayment_exposed: "underlayment",
  drip_edge_damage: "drip_edge",
  ventilation_damage: "ventilation",
  ice_dam: "ice_barrier",
  nail_pops: "nail_pattern",
  water_damage: "ice_barrier",
  structural: "shingle_damage",
};

interface DamageDetection {
  type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  description: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  ircCodeKey?: string;
}

interface AnnotationResponse {
  id: string;
  type: "ai_detection";
  x: number;
  y: number;
  width: number;
  height: number;
  damageType: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  ircCode?: string;
  caption: string;
  confidence: number;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;

  try {
    const body = await request.json();
    const validated = RequestSchema.parse(body);

    logger.info("[PHOTO_ANNOTATE]", { orgId, userId, photoId: validated.photoId });

    const openai = getOpenAI();

    // Fetch and encode image
    const imageResponse = await fetch(validated.imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    // Determine content type
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    // Build prompt for damage detection with bounding boxes
    const prompt = buildAnnotationPrompt(validated.roofType, validated.includeSlopes);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert roofing damage assessor for insurance claims. 
You analyze roof photos to identify damage and provide precise bounding box locations.
You understand IRC building codes and can map damage types to applicable code sections.
Always be thorough but conservative - only identify damage you can clearly see.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || "{}";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[PHOTO_ANNOTATE] No JSON in response", { content: content.substring(0, 200) });
      return NextResponse.json({
        success: true,
        annotations: [],
        slopeData: null,
        overallCaption: "No damage detected",
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const detections = parsed.detections || [];
    const slopeData = parsed.slopeAnalysis || null;

    // Convert detections to annotations format
    const annotations: AnnotationResponse[] = (detections as DamageDetection[]).map(
      (detection, index) => {
        const damageTypeKey = detection.type.toLowerCase().replace(/[^a-z_]/g, "_");
        const ircCodeKey = IRC_CODE_MAP[damageTypeKey] || IRC_CODE_MAP["hail_impact"];

        return {
          id: `ai-${validated.photoId || "photo"}-${Date.now()}-${index}`,
          type: "ai_detection" as const,
          x: detection.boundingBox.x,
          y: detection.boundingBox.y,
          width: detection.boundingBox.width,
          height: detection.boundingBox.height,
          damageType: formatDamageType(detection.type),
          severity: detection.severity,
          ircCode: ircCodeKey,
          caption: buildCaption(detection, ircCodeKey),
          confidence: detection.confidence,
        };
      }
    );

    // Generate overall caption
    const overallCaption = generateOverallCaption(annotations);

    return NextResponse.json({
      success: true,
      annotations,
      slopeData,
      overallAssessment: parsed.overallAssessment || null,
      overallCaption,
      photoId: validated.photoId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request", { errors: error.errors });
    }
    logger.error("[PHOTO_ANNOTATE] Error", { error });
    return apiError(500, "ANALYSIS_ERROR", "Failed to analyze photo");
  }
}

function buildAnnotationPrompt(roofType: string, includeSlopes: boolean): string {
  let prompt = `Analyze this roofing photo for damage. For each damage area found:

1. Identify the damage type (hail impact, wind damage, missing shingles, granule loss, lifted/curled shingles, cracked/broken, flashing damage, etc.)
2. Assess severity: Low, Medium, High, or Critical
3. Provide a bounding box as percentage coordinates (0-100 for x, y, width, height relative to image dimensions)
4. Estimate your confidence (0.0-1.0)
5. Write a brief description

Roof type: ${roofType.replace(/_/g, " ")}

Return JSON in this exact format:
{
  "detections": [
    {
      "type": "string - damage type",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "description": "string - brief description of the damage",
      "boundingBox": {
        "x": number (0-100, percentage from left),
        "y": number (0-100, percentage from top),
        "width": number (0-100, percentage width),
        "height": number (0-100, percentage height)
      },
      "confidence": number (0.0-1.0)
    }
  ],
  "overallAssessment": {
    "totalDamageAreas": number,
    "highestSeverity": "Low" | "Medium" | "High" | "Critical",
    "primaryDamageType": "string",
    "recommendedAction": "string - e.g., 'Full replacement recommended' or 'Repairs needed'"
  }`;

  if (includeSlopes) {
    prompt += `,
  "slopeAnalysis": {
    "estimatedPitch": "string - e.g., '6:12' or '8:12'",
    "confidence": number,
    "roofPlanes": number,
    "complexity": "simple" | "moderate" | "complex"
  }`;
  }

  prompt += `
}

Be precise with bounding boxes. Only identify damage you can clearly see. If no damage is visible, return an empty detections array.`;

  return prompt;
}

function formatDamageType(type: string): string {
  // Convert snake_case or other formats to Title Case
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildCaption(detection: DamageDetection, ircCodeKey: string): string {
  const IRC_CODES: Record<string, { code: string; title: string }> = {
    shingle_damage: { code: "IRC R905.2.7", title: "Asphalt Shingle Application" },
    underlayment: { code: "IRC R905.1.1", title: "Underlayment Requirements" },
    flashing: { code: "IRC R905.2.8", title: "Flashing Requirements" },
    drip_edge: { code: "IRC R905.2.8.5", title: "Drip Edge" },
    ventilation: { code: "IRC R806.1", title: "Ventilation Required" },
    ice_barrier: { code: "IRC R905.2.7.1", title: "Ice Barrier" },
    nail_pattern: { code: "IRC R905.2.6", title: "Fastener Requirements" },
  };

  const ircInfo = IRC_CODES[ircCodeKey];
  let caption = `${formatDamageType(detection.type)} - ${detection.severity} severity. ${detection.description}`;

  if (ircInfo) {
    caption += ` Ref: ${ircInfo.code} (${ircInfo.title})`;
  }

  return caption;
}

function generateOverallCaption(annotations: AnnotationResponse[]): string {
  if (annotations.length === 0) {
    return "No visible damage detected in this photo.";
  }

  const damageTypes = [...new Set(annotations.map((a) => a.damageType))];
  const severities = annotations.map((a) => a.severity);
  const highestSeverity = severities.includes("Critical")
    ? "Critical"
    : severities.includes("High")
      ? "High"
      : severities.includes("Medium")
        ? "Medium"
        : "Low";

  const ircCodes = [...new Set(annotations.map((a) => a.ircCode).filter(Boolean))];

  let caption = `AI detected ${annotations.length} damage area${annotations.length > 1 ? "s" : ""}.`;
  caption += ` Primary damage: ${damageTypes.slice(0, 3).join(", ")}.`;
  caption += ` Highest severity: ${highestSeverity}.`;

  if (ircCodes.length > 0) {
    const codeRefs = ircCodes
      .slice(0, 3)
      .map((key) => {
        const codes: Record<string, string> = {
          shingle_damage: "IRC R905.2.7",
          underlayment: "IRC R905.1.1",
          flashing: "IRC R905.2.8",
          drip_edge: "IRC R905.2.8.5",
          ventilation: "IRC R806.1",
          ice_barrier: "IRC R905.2.7.1",
          nail_pattern: "IRC R905.2.6",
        };
        return codes[key!];
      })
      .filter(Boolean);
    if (codeRefs.length > 0) {
      caption += ` Applicable codes: ${codeRefs.join(", ")}.`;
    }
  }

  return caption;
}
