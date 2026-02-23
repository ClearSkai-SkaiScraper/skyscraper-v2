import { logger } from "@/lib/logger";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { analyzeImage } from "@/lib/ai/openai-vision";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      codeNotes: damageReport.items
        .flatMap((f: any) => f.compliance_notes || [])
        .filter((note: string) => note && note.length > 0)
        .slice(0, 5), // Top 5 compliance notes
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
 */
function determineSeverity(report: any): "low" | "medium" | "high" {
  if (!report.findings || report.findings.length === 0) return "low";

  // Check for high severity indicators
  const hasSevere = report.findings.some(
    (f: any) => f.severity === "severe" || f.severity === "critical"
  );
  if (hasSevere) return "high";

  // Check for moderate severity
  const hasModerate = report.findings.some((f: any) => f.severity === "moderate");
  if (hasModerate) return "medium";

  return "low";
}
