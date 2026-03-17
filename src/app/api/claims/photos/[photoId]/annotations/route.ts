/**
 * Photo Annotations API
 *
 * Save and retrieve annotations for claim photos stored in file_assets
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createId } from "@paralleldrive/cuid2";
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
  note: z.string().optional(),
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
    const { annotations, note } = PutSchema.parse(body);

    // Find the file_asset and verify org access
    const file = await prisma.file_assets.findFirst({
      where: {
        id: photoId,
        orgId,
      },
      select: {
        id: true,
        metadata: true,
        claimId: true,
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
        // Save note if provided
        ...(note !== undefined && { note }),
      },
    });

    // ── Populate claim_detections table ──
    // Downstream features (Evidence Gaps, Storm Graph, Folder Assembly,
    // Simulation Engine, Supplements) all read from claim_detections.
    // Write AI detection annotations as claim_detection rows so those
    // features have actual data to work with.
    if (file.claimId) {
      const aiDetections = annotations.filter((a) => a.type === "ai_detection");
      if (aiDetections.length > 0) {
        try {
          // Remove existing detections for this photo to avoid duplicates
          await prisma.claim_detections.deleteMany({
            where: { photoId, orgId },
          });

          const detectionRows = aiDetections.map((det) => ({
            id: createId(),
            claimId: file.claimId!,
            orgId,
            photoId,
            modelId: "gpt-4o-vision",
            modelGroup: mapDamageTypeToModelGroup(det.damageType),
            className: det.damageType || "unknown_damage",
            confidence: det.confidence ?? 0.85,
            bboxX: det.x ?? null,
            bboxY: det.y ?? null,
            bboxWidth: det.width ?? null,
            bboxHeight: det.height ?? null,
            severity: mapSeverityToDetectionLevel(det.severity),
            perilType: inferPerilType(det.damageType),
            componentType: inferComponentType(det.damageType),
            isCollateral: isCollateralDamage(det.damageType),
            isCodeViolation: false,
            isReplacement: det.severity === "Critical" || det.severity === "High",
            isSoftMetal: isSoftMetalDamage(det.damageType),
          }));

          await prisma.claim_detections.createMany({ data: detectionRows });

          logger.info("[PHOTO_ANNOTATIONS_PUT] Wrote claim_detections", {
            photoId,
            claimId: file.claimId,
            count: detectionRows.length,
          });
        } catch (detErr) {
          // Non-fatal — log but don't fail the annotation save
          logger.error("[PHOTO_ANNOTATIONS_PUT] claim_detections write failed", {
            error: detErr,
            photoId,
          });
        }
      }
    }

    logger.info("[PHOTO_ANNOTATIONS_PUT]", {
      photoId,
      orgId,
      annotationCount: annotations.length,
      hasNote: !!note,
    });

    return NextResponse.json({
      success: true,
      photoId,
      annotationCount: annotations.length,
      caption,
      severity,
      note,
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

// ─── claim_detections Mapping Helpers ─────────────────────────────────────

/** Map damage type to a model group for claim_detections */
function mapDamageTypeToModelGroup(damageType?: string): string {
  if (!damageType) return "general";
  const dt = damageType.toLowerCase();
  if (dt.includes("hail")) return "hail";
  if (dt.includes("wind")) return "wind";
  if (dt.includes("water") || dt.includes("leak") || dt.includes("moisture")) return "water";
  if (
    dt.includes("shingle") ||
    dt.includes("roof") ||
    dt.includes("ridge") ||
    dt.includes("flashing")
  )
    return "roof";
  if (dt.includes("gutter") || dt.includes("downspout")) return "collateral";
  if (dt.includes("siding") || dt.includes("fence") || dt.includes("screen")) return "collateral";
  if (dt.includes("ac") || dt.includes("hvac") || dt.includes("soft_metal") || dt.includes("vent"))
    return "soft_metals";
  return "storm";
}

/** Map annotation severity to detection-level severity string */
function mapSeverityToDetectionLevel(severity?: string): string | null {
  if (!severity) return null;
  switch (severity) {
    case "Low":
      return "low";
    case "Medium":
      return "moderate";
    case "High":
      return "severe";
    case "Critical":
      return "critical";
    default:
      return severity.toLowerCase();
  }
}

/** Infer peril type from damage type */
function inferPerilType(damageType?: string): string | null {
  if (!damageType) return null;
  const dt = damageType.toLowerCase();
  if (dt.includes("hail") || dt.includes("impact") || dt.includes("dent")) return "hail";
  if (
    dt.includes("wind") ||
    dt.includes("crease") ||
    dt.includes("lifted") ||
    dt.includes("missing")
  )
    return "wind";
  if (
    dt.includes("water") ||
    dt.includes("leak") ||
    dt.includes("stain") ||
    dt.includes("moisture")
  )
    return "water";
  if (dt.includes("tree") || dt.includes("branch") || dt.includes("debris")) return "impact";
  return "storm";
}

/** Infer component type from damage type */
function inferComponentType(damageType?: string): string | null {
  if (!damageType) return null;
  const dt = damageType.toLowerCase();
  if (dt.includes("shingle")) return "shingle";
  if (dt.includes("ridge")) return "ridge_vent";
  if (dt.includes("gutter")) return "gutter";
  if (dt.includes("flashing")) return "flashing";
  if (dt.includes("soffit")) return "soffit";
  if (dt.includes("fascia")) return "fascia";
  if (dt.includes("siding")) return "siding";
  if (dt.includes("vent") || dt.includes("hvac") || dt.includes("ac")) return "AC_fin";
  if (dt.includes("window") || dt.includes("screen")) return "window_screen";
  if (dt.includes("fence")) return "fence";
  return null;
}

/** Check if damage is collateral (non-roof) evidence */
function isCollateralDamage(damageType?: string): boolean {
  if (!damageType) return false;
  const dt = damageType.toLowerCase();
  return (
    dt.includes("gutter") ||
    dt.includes("siding") ||
    dt.includes("fence") ||
    dt.includes("screen") ||
    dt.includes("ac") ||
    dt.includes("vent") ||
    dt.includes("mailbox") ||
    dt.includes("soft_metal") ||
    dt.includes("downspout")
  );
}

/** Check if damage indicates soft metal denting (strong hail evidence) */
function isSoftMetalDamage(damageType?: string): boolean {
  if (!damageType) return false;
  const dt = damageType.toLowerCase();
  return (
    dt.includes("soft_metal") ||
    dt.includes("ac_fin") ||
    dt.includes("vent_dent") ||
    dt.includes("mailbox_dent") ||
    dt.includes("gutter_dent") ||
    dt.includes("downspout_dent")
  );
}
