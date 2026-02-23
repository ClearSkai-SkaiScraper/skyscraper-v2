import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

/**
 * AI Photo Annotation Engine
 *
 * Processes damage photos with GPT-4o Vision.
 * Generates bounding box regions, damage markers, severity labels.
 * Creates descriptive captions for each damaged area.
 */

export interface BoundingBox {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  width: number; // percentage
  height: number; // percentage
  confidence: number; // 0-1
}

export interface DamageAnnotation {
  id: string;
  type: "hail" | "wind" | "structural" | "missing" | "wear" | "debris";
  boundingBox: BoundingBox;
  severity: "minor" | "moderate" | "severe" | "catastrophic";
  confidence: number;
  description: string;
  measurements?: {
    diameter?: number; // inches (for hail)
    length?: number; // inches
    area?: number; // square feet
  };
  location: {
    roof: "north" | "south" | "east" | "west" | "ridge" | "valley" | "eave";
    feature?: "shingle" | "flashing" | "vent" | "chimney" | "skylight" | "gutter";
  };
  urgency: "immediate" | "high" | "medium" | "low";
}

export interface AnnotatedPhoto {
  photoId: string;
  photoUrl: string;
  originalUrl: string;
  annotations: DamageAnnotation[];
  overallSeverity: "minor" | "moderate" | "severe" | "catastrophic";
  caption: string;
  timestamp: Date;
  metadata: {
    width: number;
    height: number;
    totalAnnotations: number;
    criticalDamage: number;
  };
}

const VISION_SYSTEM_PROMPT = `You are a professional roofing damage assessment AI. Analyze the provided photo for property damage.

Return a JSON object with this exact structure:
{
  "annotations": [
    {
      "type": "hail" | "wind" | "structural" | "missing" | "wear" | "debris",
      "region": { "x": <% from left 0-100>, "y": <% from top 0-100>, "width": <% 0-100>, "height": <% 0-100> },
      "severity": "minor" | "moderate" | "severe" | "catastrophic",
      "confidence": <0.0-1.0>,
      "description": "<concise damage description with measurements if visible>",
      "measurements": { "diameter": <inches|null>, "length": <inches|null>, "area": <sqft|null> },
      "location": { "roof": "north"|"south"|"east"|"west"|"ridge"|"valley"|"eave", "feature": "shingle"|"flashing"|"vent"|"chimney"|"skylight"|"gutter"|null },
      "urgency": "immediate" | "high" | "medium" | "low"
    }
  ],
  "overallSeverity": "minor" | "moderate" | "severe" | "catastrophic",
  "caption": "<one-line summary of all damage found>"
}

Rules:
- Be precise and conservative with confidence scores
- Only report damage you can actually see in the image
- If no damage is visible, return an empty annotations array
- Measurements should only be included when you can reasonably estimate them from visual cues
- Return ONLY valid JSON, no markdown fences`;

/**
 * Annotate photos with AI-detected damage using GPT-4o Vision
 */
export async function annotatePhotos(
  photos: Array<{ id: string; url: string }>
): Promise<{ success: boolean; data?: AnnotatedPhoto[]; error?: string }> {
  try {
    const openai = getOpenAI();
    const annotatedPhotos: AnnotatedPhoto[] = [];

    for (const photo of photos) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: VISION_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this property photo for damage. Return JSON only." },
                { type: "image_url", image_url: { url: photo.url, detail: "high" } },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });

        const raw = response.choices[0]?.message?.content?.trim();
        if (!raw) {
          logger.warn(`[Photo Annotator] Empty response for photo ${photo.id}`);
          annotatedPhotos.push(createEmptyAnnotation(photo));
          continue;
        }

        const parsed = JSON.parse(raw);
        const annotations: DamageAnnotation[] = (parsed.annotations || []).map(
          (ann: any, idx: number) => ({
            id: `ann-${photo.id}-${idx}`,
            type: ann.type || "wear",
            boundingBox: {
              x: ann.region?.x ?? 0,
              y: ann.region?.y ?? 0,
              width: ann.region?.width ?? 10,
              height: ann.region?.height ?? 10,
              confidence: ann.confidence ?? 0.5,
            },
            severity: ann.severity || "minor",
            confidence: ann.confidence ?? 0.5,
            description: ann.description || "Damage detected",
            measurements: ann.measurements || undefined,
            location: {
              roof: ann.location?.roof || "north",
              feature: ann.location?.feature || undefined,
            },
            urgency: ann.urgency || "medium",
          })
        );

        const criticalCount = annotations.filter((a) => a.urgency === "immediate").length;

        annotatedPhotos.push({
          photoId: photo.id,
          photoUrl: photo.url,
          originalUrl: photo.url,
          annotations,
          overallSeverity: parsed.overallSeverity || computeSeverity(annotations),
          caption:
            parsed.caption || generatePhotoCaption(annotations, parsed.overallSeverity || "minor"),
          timestamp: new Date(),
          metadata: {
            width: 1920,
            height: 1080,
            totalAnnotations: annotations.length,
            criticalDamage: criticalCount,
          },
        });
      } catch (photoErr) {
        logger.error(`[Photo Annotator] Failed on photo ${photo.id}:`, photoErr);
        annotatedPhotos.push(createEmptyAnnotation(photo));
      }
    }

    return { success: true, data: annotatedPhotos };
  } catch (error) {
    logger.error("[Photo Annotator] Failed to annotate photos:", error);
    return {
      success: false,
      error: "Photo annotation failed",
    };
  }
}

function createEmptyAnnotation(photo: { id: string; url: string }): AnnotatedPhoto {
  return {
    photoId: photo.id,
    photoUrl: photo.url,
    originalUrl: photo.url,
    annotations: [],
    overallSeverity: "minor",
    caption: "No significant damage detected",
    timestamp: new Date(),
    metadata: { width: 1920, height: 1080, totalAnnotations: 0, criticalDamage: 0 },
  };
}

function computeSeverity(annotations: DamageAnnotation[]): AnnotatedPhoto["overallSeverity"] {
  if (annotations.length === 0) return "minor";
  const scores = { minor: 1, moderate: 2, severe: 3, catastrophic: 4 };
  const avg = annotations.reduce((s, a) => s + (scores[a.severity] || 1), 0) / annotations.length;
  if (avg >= 3.5) return "catastrophic";
  if (avg >= 2.5) return "severe";
  if (avg >= 1.5) return "moderate";
  return "minor";
}

/**
 * Generate descriptive caption for photo
 */
function generatePhotoCaption(annotations: DamageAnnotation[], overallSeverity: string): string {
  if (annotations.length === 0) {
    return "No significant damage detected";
  }

  const damageTypes = [...new Set(annotations.map((a) => a.type))];
  const criticalCount = annotations.filter((a) => a.urgency === "immediate").length;

  const parts: string[] = [];

  // Overall severity
  parts.push(`${overallSeverity.toUpperCase()} damage detected`);

  // Damage types
  if (damageTypes.length === 1) {
    parts.push(`${damageTypes[0]} damage`);
  } else {
    parts.push(`${damageTypes.join(", ")} damage`);
  }

  // Critical items
  if (criticalCount > 0) {
    parts.push(`${criticalCount} immediate repair${criticalCount > 1 ? "s" : ""} needed`);
  }

  // Count
  parts.push(`${annotations.length} damage point${annotations.length > 1 ? "s" : ""} identified`);

  return parts.join(" • ");
}

/**
 * Format annotations for PDF report
 */
export function formatAnnotationsForPDF(photo: AnnotatedPhoto): any {
  return {
    photoId: photo.photoId,
    caption: photo.caption,
    severity: photo.overallSeverity,
    totalDamage: photo.annotations.length,
    criticalDamage: photo.metadata.criticalDamage,
    annotations: photo.annotations.map((ann) => ({
      type: ann.type.toUpperCase(),
      location: `${ann.location.roof} ${ann.location.feature || ""}`.trim(),
      severity: ann.severity.toUpperCase(),
      description: ann.description,
      urgency: ann.urgency.toUpperCase(),
      confidence: `${(ann.confidence * 100).toFixed(0)}%`,
    })),
  };
}

/**
 * Generate annotations summary
 */
export function generateAnnotationsSummary(photos: AnnotatedPhoto[]): string {
  const lines: string[] = [];

  lines.push("AI PHOTO ANALYSIS SUMMARY");
  lines.push("═".repeat(60));
  lines.push("");

  const totalAnnotations = photos.reduce((sum, p) => sum + p.annotations.length, 0);
  const totalCritical = photos.reduce((sum, p) => sum + p.metadata.criticalDamage, 0);

  lines.push(`Total Photos Analyzed: ${photos.length}`);
  lines.push(`Total Damage Points: ${totalAnnotations}`);
  lines.push(`Critical Damage Points: ${totalCritical}`);
  lines.push("");

  lines.push("DAMAGE BREAKDOWN:");
  const damageTypes = new Map<string, number>();
  photos.forEach((photo) => {
    photo.annotations.forEach((ann) => {
      damageTypes.set(ann.type, (damageTypes.get(ann.type) || 0) + 1);
    });
  });

  damageTypes.forEach((count, type) => {
    lines.push(`  ${type.toUpperCase()}: ${count} instances`);
  });

  lines.push("");
  lines.push("PHOTO-BY-PHOTO ANALYSIS:");
  photos.forEach((photo, idx) => {
    lines.push(`  Photo ${idx + 1}:`);
    lines.push(`    ${photo.caption}`);
    lines.push(`    Overall Severity: ${photo.overallSeverity.toUpperCase()}`);
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Export annotations to JSON
 */
export function exportAnnotationsJSON(photos: AnnotatedPhoto[]): string {
  return JSON.stringify(photos, null, 2);
}
