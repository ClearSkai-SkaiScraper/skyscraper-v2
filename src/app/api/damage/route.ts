export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withOrgScope } from "@/lib/auth/tenant";
import { getDelegate } from "@/lib/db/modelAliases";

const CreateDamageAssessmentSchema = z.object({
  claimId: z.string().optional(),
  leadId: z.string().optional(),
  summary: z.object({
    overallAssessment: z.string(),
    primaryPeril: z.string(),
    confidence: z.number(),
  }),
  findings: z.array(
    z.object({
      photoId: z.string().optional(),
      location: z.object({
        facet: z.string().optional(),
        elevation: z.string().optional(),
        notes: z.string().optional(),
      }),
      damageType: z.string(),
      material: z.string().optional(),
      severity: z.string().optional(),
      perilAttribution: z.string().optional(),
      description: z.string().optional(),
      recommendedAction: z.string().optional(),
      suggestedLineItems: z.any().optional(),
      includeInReport: z.boolean().optional(),
    })
  ),
  photos: z
    .array(
      z.object({
        url: z.string(),
        caption: z.string().optional(),
        tag: z.string().optional(),
      })
    )
    .optional(),
  metadata: z
    .object({
      lossType: z.string().optional(),
      dateOfLoss: z.string().optional(),
      address: z.string().optional(),
      carrier: z.string().optional(),
    })
    .optional(),
  globalRecommendations: z.any().optional(),
});

/**
 * POST /api/damage
 * Create a new damage assessment
 */

export const POST = withOrgScope(async (req: Request, { userId, orgId }) => {
  try {
    const body = await req.json();
    const data = CreateDamageAssessmentSchema.parse(body);

    const assessment = await getDelegate("damageAssessment").create({
      data: {
        orgId,
        createdById: userId,
        claimId: data.claimId,
        leadId: data.leadId,
        summary: `${data.summary.overallAssessment} - Primary peril: ${data.summary.primaryPeril}`,
        primaryPeril: data.summary.primaryPeril,
        overallRecommendation: data.summary.overallAssessment,
        confidence: data.summary.confidence,
        lossType: data.metadata?.lossType,
        dateOfLoss: data.metadata?.dateOfLoss ? new Date(data.metadata.dateOfLoss) : null,
        address: data.metadata?.address,
        carrier: data.metadata?.carrier,
        metadata: {
          globalRecommendations: data.globalRecommendations,
        },
        findings: {
          create: data.findings.map((finding) => ({
            photoId: finding.photoId,
            locationFacet: finding.location.facet,
            elevation: finding.location.elevation,
            locationNotes: finding.location.notes,
            damageType: finding.damageType,
            material: finding.material,
            severity: finding.severity,
            perilAttribution: finding.perilAttribution,
            description: finding.description,
            recommendedAction: finding.recommendedAction,
            suggestedLineItems: finding.suggestedLineItems,
            includeInReport: finding.includeInReport !== false,
          })),
        },
        photos: data.photos
          ? {
              create: data.photos.map((photo) => ({
                photoUrl: photo.url,
                caption: photo.caption,
                tag: photo.tag,
              })),
            }
          : undefined,
      },
      include: {
        findings: true,
        photos: true,
      },
    });

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error) {
    logger.error("[API] Save damage assessment error:", error);

    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to save damage assessment" }, { status: 500 });
  }
});

/**
 * GET /api/damage
 * List all damage assessments for the organization
 */
export const GET = withOrgScope(async (req: Request, { userId, orgId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    const assessments = await getDelegate("damageAssessment").findMany({
      where: {
        orgId,
        ...(claimId ? { claimId } : {}),
      },
      include: {
        findings: {
          take: 10,
        },
        photos: {
          take: 5,
        },
        claim: {
          select: {
            id: true,
            claimNumber: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      assessments,
    });
  } catch (error) {
    logger.error("[API] List damage assessments error:", error);
    return NextResponse.json({ error: "Failed to fetch damage assessments" }, { status: 500 });
  }
});
