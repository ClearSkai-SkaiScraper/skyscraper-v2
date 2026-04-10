// lib/report-engine/collectors/forensics.ts
// 🧬 FORENSICS COLLECTOR — Material failure analysis for report generation

import { getDelegate } from "@/lib/db/modelAliases";
import { formatForensicsForReport } from "@/lib/intel/forensics/materials";
import { logger } from "@/lib/logger";

/**
 * FORENSICS COLLECTOR
 *
 * Fetches material forensics data for a claim and formats it for report inclusion.
 * This collector integrates engineering-grade material failure analysis into all reports.
 *
 * What it provides:
 * - Material condition summary
 * - Failure mode analysis (hail, wind, age, thermal, installation)
 * - ASTM/UL test standard violations
 * - Manufacturer spec violations
 * - Replacement justification
 * - Engineering conclusion
 *
 * Used by: Report Builder, Supplement Builder, Proposal Builder
 */

export interface ForensicsDataset {
  hasForensics: boolean;
  forensicId?: string;
  materialType?: string;
  overallScore?: number;
  primaryMode?: string;
  summary?: string;
  technicalReport?: string;
  retailReport?: string;
  quickReport?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fullPayload?: any;
}

/**
 * Collect material forensics data for a claim
 */
export async function collectForensicsDataset(claimId: string): Promise<ForensicsDataset> {
  try {
    // Fetch most recent forensic report
    const forensicReport = await getDelegate("materialForensicReport").findFirst({
      where: { claimId },
      orderBy: { createdAt: "desc" },
    });

    if (!forensicReport) {
      return {
        hasForensics: false,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = forensicReport.payload as any;

    // Format for different report types
    const technicalReport = formatForensicsForReport(payload, "TECHNICAL");
    const retailReport = formatForensicsForReport(payload, "RETAIL");
    const quickReport = formatForensicsForReport(payload, "QUICK");

    return {
      hasForensics: true,
      forensicId: forensicReport.id,
      materialType: forensicReport.materialType,
      overallScore: forensicReport.overallFailureScore || undefined,
      primaryMode: forensicReport.primaryFailureMode || undefined,
      summary: payload.materialConditionSummary,
      technicalReport,
      retailReport,
      quickReport,
      fullPayload: payload,
    };
  } catch (err) {
    logger.error("❌ Forensics collector error:", err);
    return {
      hasForensics: false,
    };
  }
}

/**
 * Get quick forensics summary for inline use
 */
export function getForensicsSummary(forensics: ForensicsDataset): string {
  if (!forensics.hasForensics) {
    return "";
  }

  return forensics.summary || "";
}

/**
 * Check if material forensics supports replacement
 */
export function supportsReplacement(forensics: ForensicsDataset): boolean {
  if (!forensics.hasForensics || !forensics.overallScore) {
    return false;
  }

  return forensics.overallScore >= 60; // 60%+ threshold
}

/**
 * Get ASTM citations from forensics
 */
export function getTestStandardCitations(forensics: ForensicsDataset): string[] {
  if (!forensics.hasForensics || !forensics.fullPayload) {
    return [];
  }

  return forensics.fullPayload.testStandardsCited || [];
}

/**
 * Get manufacturer violations from forensics
 */
export function getManufacturerViolations(forensics: ForensicsDataset): string[] {
  if (!forensics.hasForensics || !forensics.fullPayload) {
    return [];
  }

  return forensics.fullPayload.manufacturerViolations || [];
}
