import { logger } from "@/lib/logger";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { analyzeImage } from "@/lib/ai/openai-vision";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Rate limit AI photo analysis (expensive operation)
    const identifier = getRateLimitIdentifier(user.id, request);
    const allowed = await rateLimiters.ai.check(5, identifier);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const context = (formData.get("context") as string) || "";

    // Validation — validateAIRequest removed, inline if needed
    // const validation = validateAIRequest(analyzePhotoFormDataSchema, { context });
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
      caption: damageReport.summary || "No damage detected in this photo.",
      codeNotes: (damageReport.recommendations || [])
        .filter((note: string) => note && note.length > 0)
        .slice(0, 5),
      damageType:
        damageReport.items.length > 0
          ? damageReport.items[0].type || "Unknown Damage"
          : "No Damage",
      severity: determineSeverity(damageReport),
    };

    return NextResponse.json({
      success: true,
      analysis: photoAnalysis,
      rawReport: damageReport, // Include raw report for debugging
    });
  } catch (error) {
    logger.error("[AI Analyze Photo] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze photo",
        message: "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Determine overall severity from damage report
 * Uses the schema's overall_severity field first, then falls back to per-item check.
 */
function determineSeverity(report: any): "low" | "medium" | "high" {
  // Prefer the AI's own overall_severity rating
  if (report.overall_severity) {
    if (report.overall_severity === "severe") return "high";
    if (report.overall_severity === "moderate") return "medium";
    if (report.overall_severity === "minor" || report.overall_severity === "none") return "low";
  }

  // Fallback: check individual items (field is "items", severity is "estimated_severity")
  if (!report.items || report.items.length === 0) return "low";

  const hasSevere = report.items.some((f: any) => f.estimated_severity === "severe");
  if (hasSevere) return "high";

  const hasModerate = report.items.some((f: any) => f.estimated_severity === "moderate");
  if (hasModerate) return "medium";

  return "low";
}
