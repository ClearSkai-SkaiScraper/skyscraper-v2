/**
 * @deprecated Use POST /api/ai/damage/analyze or POST /api/ai/vision/pipeline instead.
 * This route wraps analyzeImage() but the canonical pipeline provides richer analysis.
 */

import { NextResponse } from "next/server";

import { analyzeImage } from "@/lib/ai/openai-vision";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (request, { userId, orgId }) => {
  try {
    // Rate limit — AI preset (5/min via Upstash)
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const context = (formData.get("context") as string) || "";

    // Validation — validateAIRequest removed, inline if needed
    // const validation = validateAIRequest(analyzePhotoFormDataSchema, { context });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const validatedContext = context || undefined;

    if (!imageFile) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 });
    }

    // Convert File to base64 data URL for OpenAI Vision
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = imageFile.type;
    const imageDataUrl = `data:${mimeType};base64,${base64}`;

    // Call OpenAI Vision API
    const damageReport = await analyzeImage(imageDataUrl, { context });

    // Transform to PhotoAnalysis format for frontend
    const photoAnalysis = {
      photoUrl: imageDataUrl,
      caption: damageReport.summary || "AI found no damage in this photo.",
      codeNotes: (damageReport.recommendations || [])
        .filter((note: string) => note && note.length > 0)
        .slice(0, 5),
      damageType:
        damageReport.items.length > 0
          ? damageReport.items[0].type || "Unknown Damage"
          : "AI: No Damage",
      severity: determineSeverity(damageReport),
    };

    return NextResponse.json({
      success: true,
      analysis: photoAnalysis,
      rawReport: damageReport, // Include raw report for debugging
    });
  } catch (error: unknown) {
    logger.error("[AI Analyze Photo] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze photo",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
});

/**
 * Determine overall severity from damage report
 * Uses the schema's overall_severity field first, then falls back to per-item check.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function determineSeverity(report: any): "low" | "medium" | "high" {
  // Prefer the AI's own overall_severity rating
  if (report.overall_severity) {
    if (report.overall_severity === "severe") return "high";
    if (report.overall_severity === "moderate") return "medium";
    if (report.overall_severity === "minor" || report.overall_severity === "none") return "low";
  }

  // Fallback: check individual items (field is "items", severity is "estimated_severity")
  if (!report.items || report.items.length === 0) return "low";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasSevere = report.items.some((f: any) => f.estimated_severity === "severe");
  if (hasSevere) return "high";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasModerate = report.items.some((f: any) => f.estimated_severity === "moderate");
  if (hasModerate) return "medium";

  return "low";
}
