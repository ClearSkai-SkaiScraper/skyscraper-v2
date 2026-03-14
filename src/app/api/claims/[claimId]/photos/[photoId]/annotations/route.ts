/**
 * ANNOTATION CRUD API
 *
 * Save, update, and retrieve photo annotations.
 * Annotations are stored in file_assets.metadata.annotations[] JSON.
 *
 * POST — Save/replace annotations for a photo
 * GET  — Retrieve current annotations for a photo
 * PATCH — Update a single annotation by index
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { recordAnnotationEdit } from "@/lib/inspection/annotation-feedback";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const AnnotationSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
  label: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  severity: z.string().optional(),
  source: z.enum(["ai", "manual", "adjusted"]).optional().default("ai"),
  damageType: z.string().optional(),
  component: z.string().optional(),
  ircCodeKey: z.string().optional(),
  suppressed: z.boolean().optional().default(false),
});

const SaveAnnotationsSchema = z.object({
  annotations: z.array(AnnotationSchema),
  replaceAll: z.boolean().default(true),
});

const PatchAnnotationSchema = z.object({
  index: z.number().int().min(0),
  annotation: AnnotationSchema.partial(),
  editReason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ claimId: string; photoId: string }>;
}

// ============================================================================
//  GET — Retrieve annotations for a photo
// ============================================================================
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;
  const { claimId, photoId } = await params;

  try {
    const photo = await prisma.file_assets.findFirst({
      where: { id: photoId, orgId, claimId },
      select: { id: true, metadata: true, filename: true },
    });

    if (!photo) {
      return apiError(404, "NOT_FOUND", "Photo not found");
    }

    const metadata = (photo.metadata || {}) as Record<string, unknown>;
    const annotations = (metadata.annotations || []) as unknown[];

    return NextResponse.json({
      success: true,
      photoId,
      annotations,
      count: annotations.length,
    });
  } catch (error) {
    logger.error("[ANNOTATIONS_GET] Error", { error, claimId, photoId });
    return apiError(500, "INTERNAL_ERROR", "Failed to retrieve annotations");
  }
}

// ============================================================================
//  POST — Save/replace annotations for a photo
// ============================================================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;
  const { claimId, photoId } = await params;

  try {
    const body = await request.json();
    const { annotations, replaceAll } = SaveAnnotationsSchema.parse(body);

    const photo = await prisma.file_assets.findFirst({
      where: { id: photoId, orgId, claimId },
      select: { id: true, metadata: true },
    });

    if (!photo) {
      return apiError(404, "NOT_FOUND", "Photo not found");
    }

    const currentMetadata = (photo.metadata || {}) as Record<string, unknown>;
    const existingAnnotations = (currentMetadata.annotations || []) as unknown[];

    const updatedAnnotations = replaceAll ? annotations : [...existingAnnotations, ...annotations];

    await prisma.file_assets.update({
      where: { id: photoId },
      data: {
        metadata: {
          ...currentMetadata,
          annotations: updatedAnnotations,
          annotationsLastUpdated: new Date().toISOString(),
          annotationsUpdatedBy: userId,
        },
        updatedAt: new Date(),
      },
    });

    logger.info("[ANNOTATIONS_SAVE] Saved annotations", {
      claimId,
      photoId,
      count: updatedAnnotations.length,
      replaceAll,
      userId,
    });

    return NextResponse.json({
      success: true,
      photoId,
      count: updatedAnnotations.length,
      replaced: replaceAll,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid annotation data", {
        errors: error.errors,
      });
    }
    logger.error("[ANNOTATIONS_SAVE] Error", { error, claimId, photoId });
    return apiError(500, "INTERNAL_ERROR", "Failed to save annotations");
  }
}

// ============================================================================
//  PATCH — Update a single annotation by index
// ============================================================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId, userId } = auth;
  const { claimId, photoId } = await params;

  try {
    const body = await request.json();
    const { index, annotation, editReason } = PatchAnnotationSchema.parse(body);

    const photo = await prisma.file_assets.findFirst({
      where: { id: photoId, orgId, claimId },
      select: { id: true, metadata: true },
    });

    if (!photo) {
      return apiError(404, "NOT_FOUND", "Photo not found");
    }

    const currentMetadata = (photo.metadata || {}) as Record<string, unknown>;
    const annotations = [...((currentMetadata.annotations || []) as Record<string, unknown>[])];

    if (index >= annotations.length) {
      return apiError(
        400,
        "INDEX_OUT_OF_RANGE",
        `Annotation index ${index} out of range (max ${annotations.length - 1})`
      );
    }

    // Record the edit for training data
    const originalAnnotation = annotations[index];
    annotations[index] = { ...annotations[index], ...annotation, source: "adjusted" };

    await prisma.file_assets.update({
      where: { id: photoId },
      data: {
        metadata: {
          ...currentMetadata,
          annotations,
          annotationsLastUpdated: new Date().toISOString(),
          annotationsUpdatedBy: userId,
        },
        updatedAt: new Date(),
      },
    });

    // Track annotation edit for model improvement
    try {
      await recordAnnotationEdit({
        photoId,
        orgId,
        userId,
        annotationIndex: index,
        editType: "adjust",
        original: originalAnnotation as Record<string, unknown>,
        updated: annotations[index],
        reason: editReason,
      });
    } catch (feedbackErr) {
      logger.warn("[ANNOTATIONS_PATCH] Feedback recording failed (non-fatal)", { feedbackErr });
    }

    logger.info("[ANNOTATIONS_PATCH] Updated annotation", {
      claimId,
      photoId,
      index,
      userId,
    });

    return NextResponse.json({
      success: true,
      photoId,
      index,
      annotation: annotations[index],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid patch data", {
        errors: error.errors,
      });
    }
    logger.error("[ANNOTATIONS_PATCH] Error", { error, claimId, photoId });
    return apiError(500, "INTERNAL_ERROR", "Failed to update annotation");
  }
}
