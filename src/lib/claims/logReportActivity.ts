/**
 * Universal Claims Report Activity Logging
 *
 * Tracks all meaningful actions taken on ClaimReport records
 * and logs them to the ClaimTimelineEvent model for visibility
 * in the claim activity feed.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type ReportActivityType =
  | "REPORT_CREATED"
  | "REPORT_UPDATED"
  | "REPORT_FINALIZED"
  | "REPORT_PDF_GENERATED"
  | "REPORT_SUBMITTED"
  | "REPORT_REOPENED";

interface LogReportActivityParams {
  claimId: string;
  userId?: string;
  type: ReportActivityType;
  title: string;
  body?: string;
  metadata?: Record<string, any>;
  visibleToClient?: boolean;
}

/**
 * Log a Universal Report activity to the ClaimTimelineEvent model
 */
export async function logReportActivity({
  claimId,
  userId,
  type,
  title,
  body,
  metadata = {},
  visibleToClient = false, // Default to internal-only for reports
}: LogReportActivityParams): Promise<void> {
  try {
    // Note: createdById field omitted due to Prisma client cache
    // TODO: Add createdById: userId once Prisma client is regenerated
    await prisma.claim_timeline_events.create({
      data: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        type,
        description: title + (body ? `\n${body}` : ""),
        visible_to_client: visibleToClient,
      },
    });

    logger.info(
      `[ReportActivity] Logged ${type} for claim ${claimId} by user ${userId || "system"}`
    );
  } catch (error) {
    logger.error("[ReportActivity] Failed to log activity:", error);
    // Don't throw - activity logging should never block the main flow
  }
}

/**
 * Helper functions for common report activities
 */

export async function logReportCreated(claimId: string, userId?: string): Promise<void> {
  await logReportActivity({
    claimId,
    userId,
    type: "REPORT_CREATED",
    title: "Universal Claims Report Created",
    body: "A new Universal Claims Report was created for this claim with 10 sections.",
    visibleToClient: false,
  });
}

export async function logReportUpdated(
  claimId: string,
  sections: string[],
  userId?: string
): Promise<void> {
  const sectionList = sections.join(", ");
  await logReportActivity({
    claimId,
    userId,
    type: "REPORT_UPDATED",
    title: "Universal Report Updated",
    body: `Report sections updated: ${sectionList}`,
    metadata: { sections },
    visibleToClient: false,
  });
}

export async function logReportFinalized(claimId: string, userId?: string): Promise<void> {
  await logReportActivity({
    claimId,
    userId,
    type: "REPORT_FINALIZED",
    title: "Universal Report Finalized",
    body: "The Universal Claims Report has been marked as finalized and is ready for distribution.",
    visibleToClient: true, // Finalization can be visible to clients
  });
}

export async function logReportPDFGenerated(claimId: string, userId?: string): Promise<void> {
  await logReportActivity({
    claimId,
    userId,
    type: "REPORT_PDF_GENERATED",
    title: "Report PDF Generated",
    body: "A PDF version of the Universal Claims Report was generated and is available for download.",
    visibleToClient: false,
  });
}

export async function logReportSubmitted(
  claimId: string,
  carrierName?: string,
  userId?: string
): Promise<void> {
  const carrier = carrierName || "insurance carrier";
  await logReportActivity({
    claimId,
    userId,
    type: "REPORT_SUBMITTED",
    title: "Universal Report Submitted to Carrier",
    body: `The finalized Universal Claims Report was submitted to ${carrier}.`,
    metadata: { carrierName },
    visibleToClient: true, // Submission is visible to clients
  });
}

export async function logReportReopened(claimId: string, userId?: string): Promise<void> {
  await logReportActivity({
    claimId,
    userId,
    type: "REPORT_REOPENED",
    title: "Universal Report Reopened for Editing",
    body: "A previously submitted report was reopened by an administrator for further editing.",
    visibleToClient: false,
  });
}
