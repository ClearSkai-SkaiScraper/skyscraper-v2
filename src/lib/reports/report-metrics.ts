/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */ /**
 * ═══════════════════════════════════════════════════════════════════════════════
 * REPORT GENERATION METRICS & ANALYTICS
 *
 * Sprint Item 9.3 — Tracks report generation performance, quality,
 * and usage metrics for operational monitoring.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReportGenerationMetrics {
  /** Time to generate the PDF (ms) */
  generationTimeMs: number;
  /** Number of pages in the final PDF */
  pageCount: number;
  /** Number of photos processed */
  photoCount: number;
  /** Number of photos successfully embedded */
  photosEmbedded: number;
  /** Number of photos that failed to load (HEIC, timeout, etc.) */
  photosFailed: number;
  /** Total findings documented */
  findingCount: number;
  /** Number of unique IRC codes referenced */
  uniqueCodeCount: number;
  /** Number of evidence clusters after grouping */
  clusterCount: number;
  /** Average claim-worthiness score */
  avgClaimWorthiness: number;
  /** Whether branding was applied */
  hasBranding: boolean;
  /** Whether logo was embedded */
  hasLogo: boolean;
  /** Whether inspector headshot was embedded */
  hasHeadshot: boolean;
  /** Report format version */
  reportVersion: string;
  /** Options used for generation */
  options: {
    captionStyle?: string;
    photoOrder?: string;
    layout?: string;
    printSafe?: boolean;
    includeRepairability?: boolean;
  };
}

export interface ReportQualityMetrics {
  /** Percentage of photos with at least 1 finding */
  photoUtilizationRate: number;
  /** Average findings per photo */
  avgFindingsPerPhoto: number;
  /** Percentage of findings with IRC code references */
  codeReferenceRate: number;
  /** Severity distribution */
  severityDistribution: {
    severe: number;
    moderate: number;
    minor: number;
    informational: number;
  };
  /** Caption quality indicators */
  captionQuality: {
    avgLength: number;
    withCodeReference: number;
    withClaimImplication: number;
    templateGenerated: number;
    aiEnhanced: number;
  };
}

// ─── Metric Collection ───────────────────────────────────────────────────────

/**
 * Record report generation metrics for analytics.
 * Stored in the report's file_asset metadata.
 */
export async function recordReportMetrics(
  reportId: string,
  metrics: ReportGenerationMetrics,
  quality: ReportQualityMetrics
): Promise<void> {
  try {
    const asset = await prisma.file_assets.findUnique({
      where: { id: reportId },
      select: { metadata: true },
    });

    if (!asset) {
      logger.warn("[REPORT_METRICS] Report asset not found", { reportId });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = (asset.metadata as any) || {};
    metadata.generationMetrics = {
      ...metrics,
      quality,
      recordedAt: new Date().toISOString(),
    };

    await prisma.file_assets.update({
      where: { id: reportId },
      data: { metadata, updatedAt: new Date() },
    });

    logger.info("[REPORT_METRICS] Recorded generation metrics", {
      reportId,
      generationTimeMs: metrics.generationTimeMs,
      pageCount: metrics.pageCount,
      photoCount: metrics.photoCount,
      findingCount: metrics.findingCount,
    });
  } catch (error) {
    logger.error("[REPORT_METRICS] Failed to record metrics", {
      error: error instanceof Error ? error.message : String(error),
      reportId,
    });
  }
}

/**
 * Calculate quality metrics from report data.
 */
export function calculateQualityMetrics(
  photos: Array<{ hasClusters: boolean; clusterCount: number }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clusters: Array<{
    severity: string;
    confidence: number;
    ircCode: any;
    caption: string;
    score: number;
  }>
): ReportQualityMetrics {
  const photosWithFindings = photos.filter((p) => p.hasClusters).length;
  const totalFindings = clusters.length;

  // Severity distribution
  const severityDist = { severe: 0, moderate: 0, minor: 0, informational: 0 };
  for (const c of clusters) {
    const sev = c.severity.toLowerCase();
    if (["critical", "severe", "high"].includes(sev)) severityDist.severe++;
    else if (["moderate", "medium"].includes(sev)) severityDist.moderate++;
    else if (["minor", "low"].includes(sev)) severityDist.minor++;
    else severityDist.informational++;
  }

  // Caption quality
  const captions = clusters.map((c) => c.caption || "");
  const withCodeRef = captions.filter((c) => /IRC|IBC|ASTM|HAAG|ARMA/.test(c)).length;
  const withClaimImpl = captions.filter((c) =>
    /claim|warranty|service life|weather barrier|functional damage/i.test(c)
  ).length;
  const avgLength =
    captions.length > 0 ? captions.reduce((sum, c) => sum + c.length, 0) / captions.length : 0;

  return {
    photoUtilizationRate: photos.length > 0 ? photosWithFindings / photos.length : 0,
    avgFindingsPerPhoto: photos.length > 0 ? totalFindings / photos.length : 0,
    codeReferenceRate:
      totalFindings > 0 ? clusters.filter((c) => c.ircCode).length / totalFindings : 0,
    severityDistribution: severityDist,
    captionQuality: {
      avgLength,
      withCodeReference: withCodeRef,
      withClaimImplication: withClaimImpl,
      templateGenerated: totalFindings, // All captions are template-generated in v2
      aiEnhanced: 0, // GPT enhancement not yet implemented
    },
  };
}

/**
 * Create a performance timer for report generation.
 */
export function createReportTimer(): { elapsed: () => number } {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}

/**
 * Get aggregate report metrics for an organization.
 */
export async function getOrgReportMetrics(
  orgId: string,
  options?: { since?: Date; limit?: number }
): Promise<{
  totalReports: number;
  avgGenerationTimeMs: number;
  avgPageCount: number;
  avgPhotoCount: number;
  avgFindingCount: number;
  avgClaimWorthiness: number;
  brandingRate: number;
}> {
  try {
    const reports = await prisma.file_assets.findMany({
      where: {
        orgId,
        file_type: "damage_report",
        ...(options?.since ? { createdAt: { gte: options.since } } : {}),
      },
      select: { metadata: true },
      orderBy: { createdAt: "desc" },
      take: options?.limit || 100,
    });

    let totalTime = 0;
    let totalPages = 0;
    let totalPhotos = 0;
    let totalFindings = 0;
    let totalWorthiness = 0;
    let brandedCount = 0;
    let metricsCount = 0;

    for (const report of reports) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = (report.metadata as any)?.generationMetrics;
      if (!m) continue;
      metricsCount++;
      totalTime += m.generationTimeMs || 0;
      totalPages += m.pageCount || 0;
      totalPhotos += m.photoCount || 0;
      totalFindings += m.findingCount || 0;
      totalWorthiness += m.avgClaimWorthiness || 0;
      if (m.hasBranding) brandedCount++;
    }

    const n = metricsCount || 1;
    return {
      totalReports: reports.length,
      avgGenerationTimeMs: totalTime / n,
      avgPageCount: totalPages / n,
      avgPhotoCount: totalPhotos / n,
      avgFindingCount: totalFindings / n,
      avgClaimWorthiness: totalWorthiness / n,
      brandingRate: reports.length > 0 ? brandedCount / reports.length : 0,
    };
  } catch (error) {
    logger.error("[REPORT_METRICS] Failed to get org metrics", { error, orgId });
    return {
      totalReports: 0,
      avgGenerationTimeMs: 0,
      avgPageCount: 0,
      avgPhotoCount: 0,
      avgFindingCount: 0,
      avgClaimWorthiness: 0,
      brandingRate: 0,
    };
  }
}
