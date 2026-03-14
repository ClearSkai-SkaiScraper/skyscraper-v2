/**
 * DAMAGE REPORT PREVIEW API
 *
 * Returns a JSON preview of what the damage report will contain,
 * without actually generating the PDF. Used by the Report Review UI
 * to show findings, captions, codes, and annotations before generation.
 *
 * GET — Returns structured preview data for the report review screen
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { apiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getAZCode, isArizonaJurisdiction } from "@/lib/constants/irc-codes-az";
import { generateCaption, type CaptionStyle } from "@/lib/inspection/caption-generator";
import {
  collectUniqueCodes,
  groupEvidence,
  type EvidenceCluster,
  type RawAnnotation,
} from "@/lib/inspection/evidence-grouping";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ claimId: string }>;
}

interface PhotoWithMetadata {
  id: string;
  filename: string;
  publicUrl: string;
  ai_caption: string | null;
  ai_severity: string | null;
  ai_confidence: number | null;
  metadata: {
    annotations?: RawAnnotation[];
    generatedCaption?: string;
  } | null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { orgId } = auth;
  const { claimId } = await params;

  try {
    // Fetch claim
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: {
        id: true,
        claimNumber: true,
        damageType: true,
        status: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!claim) {
      return apiError(404, "NOT_FOUND", "Claim not found");
    }

    // Fetch analyzed photos
    const photos = (await prisma.file_assets.findMany({
      where: {
        orgId,
        claimId,
        category: "photo",
        analyzed_at: { not: null },
      },
      select: {
        id: true,
        filename: true,
        publicUrl: true,
        ai_caption: true,
        ai_severity: true,
        ai_confidence: true,
        metadata: true,
      },
      orderBy: { createdAt: "asc" },
    })) as PhotoWithMetadata[];

    // Build preview data
    const eventType = claim.damageType?.replace(/_/g, " ") || "storm";
    const captionStyle: CaptionStyle = "full";
    const propertyState = claim.properties?.state || null;
    const isAZ = isArizonaJurisdiction(propertyState);

    const photoFindings = photos.map((photo) => {
      const rawAnnotations = (photo.metadata?.annotations || []) as RawAnnotation[];
      const clusters = groupEvidence(rawAnnotations, 5, 0.15);

      const findings = clusters.map((cluster, idx) => {
        const caption =
          cluster.caption && cluster.caption.length > 30
            ? cluster.caption
            : generateCaption(cluster, {
                eventType,
                variationIndex: idx,
                captionStyle,
                includeRepairability: true,
              });

        // Resolve IRC code with AZ overlay
        let ircDisplay = cluster.ircCode;
        if (ircDisplay && isAZ) {
          const azCode = getAZCode(cluster.label.toLowerCase().replace(/\s+/g, "_"), propertyState);
          if (azCode) {
            ircDisplay = azCode;
          }
        }

        return {
          index: idx,
          label: cluster.label,
          severity: cluster.severity,
          confidence: cluster.confidence,
          memberCount: cluster.memberCount,
          score: cluster.score,
          caption,
          ircCode: ircDisplay,
          shapeType: cluster.shapeType || "rectangle",
          damageCategory: cluster.damageCategory || "cosmetic",
          component: cluster.component || "general",
          color: cluster.color,
          bbox: cluster.bbox,
        };
      });

      return {
        photoId: photo.id,
        filename: photo.filename,
        publicUrl: photo.publicUrl,
        severity: photo.ai_severity,
        confidence: photo.ai_confidence,
        aiCaption: photo.ai_caption,
        annotationCount: rawAnnotations.length,
        findings,
      };
    });

    // Collect unique codes — build a Map grouped by photo
    const clusterMap = new Map<string, EvidenceCluster[]>();
    for (const pf of photoFindings) {
      const pfClusters: EvidenceCluster[] = [];
      for (const f of pf.findings) {
        pfClusters.push(f as unknown as EvidenceCluster);
      }
      if (pfClusters.length > 0) {
        clusterMap.set(pf.photoId, pfClusters);
      }
    }
    const uniqueCodes = collectUniqueCodes(clusterMap);
    const buildingCodes = Array.from(uniqueCodes.entries()).map(([key, code]) => {
      const displayCode = isAZ ? getAZCode(key, propertyState) || code : code;
      return {
        key,
        code: displayCode.code,
        title: displayCode.title,
        text: displayCode.text,
        isAZOverride: isAZ && displayCode !== code,
      };
    });

    // Severity summary
    const severityCounts = { severe: 0, moderate: 0, minor: 0 };
    for (const photo of photos) {
      const sev = photo.ai_severity?.toLowerCase() || "minor";
      if (sev in severityCounts) {
        severityCounts[sev as keyof typeof severityCounts]++;
      }
    }

    const totalFindings = photoFindings.reduce((sum, pf) => sum + pf.findings.length, 0);

    return NextResponse.json({
      success: true,
      preview: {
        claim: {
          id: claim.id,
          claimNumber: claim.claimNumber,
          damageType: claim.damageType,
          status: claim.status,
          address: claim.properties
            ? `${claim.properties.street || ""}, ${claim.properties.city || ""}, ${claim.properties.state || ""} ${claim.properties.zipCode || ""}`.trim()
            : null,
          isArizona: isAZ,
        },
        summary: {
          totalPhotos: photos.length,
          totalFindings,
          severityCounts,
          buildingCodesCount: buildingCodes.length,
        },
        photos: photoFindings,
        buildingCodes,
      },
    });
  } catch (error) {
    logger.error("[DAMAGE_REPORT_PREVIEW] Error", { error, claimId });
    return apiError(500, "INTERNAL_ERROR", "Failed to generate report preview");
  }
}
