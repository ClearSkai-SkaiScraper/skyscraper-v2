/**
 * Photo Annotations API
 *
 * Save and retrieve annotations for claim photos stored in file_assets
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const AnnotationSchema = z.object({
  id: z.string(),
  type: z.enum(["circle", "rectangle", "freehand", "text", "ai_detection"]),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  radius: z.number().optional(),
  points: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  text: z.string().optional(),
  color: z.string(),
  damageType: z.string().optional(),
  severity: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  ircCode: z.string().optional(),
  caption: z.string().optional(),
  confidence: z.number().optional(),
});

const PutSchema = z.object({
  annotations: z.array(AnnotationSchema),
});

interface RouteParams {
  params: Promise<{ photoId: string }>;
}

// GET - Retrieve annotations for a photo
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const { photoId } = await params;

  try {
    // Find the file_asset and verify org access
    const file = await prisma.file_assets.findFirst({
      where: {
        id: photoId,
        orgId,
      },
      select: {
        id: true,
        metadata: true,
        ai_caption: true,
        ai_severity: true,
        ai_confidence: true,
        analyzed_at: true,
      },
    });

    if (!file) {
      return apiError(404, "NOT_FOUND", "Photo not found");
    }

    const metadata = (file.metadata as Record<string, unknown>) || {};
    const annotations = metadata.annotations || [];

    return NextResponse.json({
      success: true,
      photoId,
      annotations,
      aiCaption: file.ai_caption,
      severity: file.ai_severity,
      confidence: file.ai_confidence ? Number(file.ai_confidence) : null,
      analyzedAt: file.analyzed_at,
    });
  } catch (error) {
    logger.error("[PHOTO_ANNOTATIONS_GET] Error", { error, photoId });
    return apiError(500, "INTERNAL_ERROR", "Failed to retrieve annotations");
  }
}

// PUT - Save annotations for a photo
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;

  const { photoId } = await params;

  try {
    const body = await request.json();
    const { annotations } = PutSchema.parse(body);

    // Find the file_asset and verify org access
    const file = await prisma.file_assets.findFirst({
      where: {
        id: photoId,
        orgId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!file) {
      return apiError(404, "NOT_FOUND", "Photo not found");
    }

    const existingMetadata = (file.metadata as Record<string, unknown>) || {};

    // Generate caption from annotations
    const caption = generateCaptionFromAnnotations(annotations);
    const severity = determineSeverity(annotations);

    // Update metadata with annotations
    const updatedMetadata = {
      ...existingMetadata,
      annotations,
      annotationCount: annotations.length,
      lastAnnotatedAt: new Date().toISOString(),
      lastAnnotatedBy: userId,
      generatedCaption: caption,
    };

    await prisma.file_assets.update({
      where: { id: photoId },
      data: {
        metadata: updatedMetadata,
        ai_caption: caption,
        ai_severity: severity,
        analyzed_at: new Date(),
        analyzed_by: userId,
        analysis_status: "complete",
        updatedAt: new Date(),
      },
    });

    logger.info("[PHOTO_ANNOTATIONS_PUT]", {
      photoId,
      orgId,
      annotationCount: annotations.length,
    });

    return NextResponse.json({
      success: true,
      photoId,
      annotationCount: annotations.length,
      caption,
      severity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid annotations format", {
        errors: error.errors,
      });
    }
    logger.error("[PHOTO_ANNOTATIONS_PUT] Error", { error, photoId });
    return apiError(500, "INTERNAL_ERROR", "Failed to save annotations");
  }
}

// DELETE - Remove all annotations from a photo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;

  const { photoId } = await params;

  try {
    const file = await prisma.file_assets.findFirst({
      where: {
        id: photoId,
        orgId,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!file) {
      return apiError(404, "NOT_FOUND", "Photo not found");
    }

    const existingMetadata = (file.metadata as Record<string, unknown>) || {};

    // Remove annotations from metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { annotations: _, ...cleanMetadata } = existingMetadata;
    const updatedMetadata = {
      ...cleanMetadata,
      annotationCount: 0,
      lastAnnotatedAt: null,
      generatedCaption: null,
    };

    await prisma.file_assets.update({
      where: { id: photoId },
      data: {
        metadata: updatedMetadata,
        ai_caption: null,
        ai_severity: null,
        ai_confidence: null,
        analyzed_at: null,
        analyzed_by: null,
        analysis_status: null,
        updatedAt: new Date(),
      },
    });

    logger.info("[PHOTO_ANNOTATIONS_DELETE]", { photoId, orgId });

    return NextResponse.json({ success: true, photoId });
  } catch (error) {
    logger.error("[PHOTO_ANNOTATIONS_DELETE] Error", { error, photoId });
    return apiError(500, "INTERNAL_ERROR", "Failed to delete annotations");
  }
}

function determineSeverity(annotations: z.infer<typeof AnnotationSchema>[]): string {
  if (annotations.length === 0) return "none";

  const severities = annotations.map((a) => a.severity).filter(Boolean);
  if (severities.includes("Critical")) return "severe";
  if (severities.includes("High")) return "severe";
  if (severities.includes("Medium")) return "moderate";
  if (severities.includes("Low")) return "minor";
  return "none";
}

function generateCaptionFromAnnotations(annotations: z.infer<typeof AnnotationSchema>[]): string {
  if (annotations.length === 0) return "No damage documented.";

  const damageTypes = [...new Set(annotations.map((a) => a.damageType).filter(Boolean))];
  const severities = annotations.map((a) => a.severity).filter(Boolean);
  const ircCodes = [...new Set(annotations.map((a) => a.ircCode).filter(Boolean))];

  // Determine highest severity
  const severityOrder = ["Low", "Medium", "High", "Critical"];
  const highestSeverity = severities.reduce((highest, current) => {
    if (!current) return highest;
    const currentIndex = severityOrder.indexOf(current);
    const highestIndex = severityOrder.indexOf(highest || "Low");
    return currentIndex > highestIndex ? current : highest;
  }, "Low");

  let caption = `Documented ${annotations.length} damage area${annotations.length > 1 ? "s" : ""}.`;

  if (damageTypes.length > 0) {
    caption += ` Types: ${damageTypes.slice(0, 3).join(", ")}${damageTypes.length > 3 ? ` (+${damageTypes.length - 3} more)` : ""}.`;
  }

  if (highestSeverity) {
    caption += ` Highest severity: ${highestSeverity}.`;
  }

  if (ircCodes.length > 0) {
    const IRC_CODE_REFS: Record<string, string> = {
      shingle_damage: "IRC R905.2.7",
      underlayment: "IRC R905.1.1",
      flashing: "IRC R905.2.8",
      drip_edge: "IRC R905.2.8.5",
      ventilation: "IRC R806.1",
      ice_barrier: "IRC R905.2.7.1",
      nail_pattern: "IRC R905.2.6",
    };
    const codeRefs = ircCodes
      .slice(0, 3)
      .map((key) => IRC_CODE_REFS[key!] || key)
      .filter(Boolean);
    if (codeRefs.length > 0) {
      caption += ` Applicable codes: ${codeRefs.join(", ")}.`;
    }
  }

  return caption;
}
