/**
 * Report Queue System
 *
 * Queue-based report generation for reliability and scalability.
 * Ensures reports are generated even if the initial request times out.
 *
 * Status Flow:
 * - queued: Report request received, waiting to be processed
 * - processing: Worker picked up the job
 * - completed: Report generated successfully
 * - failed: Report generation failed (will retry)
 * - cancelled: User cancelled the request
 *
 * Features:
 * - Automatic retries (up to 3 attempts)
 * - Progress tracking via polling
 * - Email notification on completion
 * - Error logging for debugging
 */

import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Report queue statuses
export type ReportQueueStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";
/** Shape of the Prisma JSON `attachments` column on reports */
export interface ReportAttachments {
  pdfUrl?: string | null;
  pdfStoragePath?: string | null;
  fileSize?: number | null;
  pageCount?: number | null;
  generatedAt?: string | null;
  lastError?: string | null;
  attempts?: number;
  maxAttempts?: number;
  notifyEmail?: string | null;
  queueConfig?: Record<string, unknown> | null;
  processingStartedAt?: string | null;
  completedAt?: string | null;
  lastFailedAt?: string | null;
}

/** Helper to cast ReportAttachments to Prisma-compatible JSON */
function toJson(obj: ReportAttachments): Prisma.InputJsonValue {
  return obj as unknown as Prisma.InputJsonValue;
}
export interface ReportQueueItem {
  id: string;
  orgId: string;
  claimId: string;
  type: string;
  status: ReportQueueStatus;
  config: ReportQueueConfig;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  pdfUrl: string | null;
  notifyEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface ReportQueueConfig {
  sections: string[];
  options?: Record<string, unknown>;
  customTitle?: string;
  generatedBy?: string;
}

interface QueueReportParams {
  orgId: string;
  claimId: string;
  type: string;
  config: ReportQueueConfig;
  notifyEmail?: string;
  userId: string;
}

/**
 * Add a report to the generation queue
 */
export async function queueReport(params: QueueReportParams): Promise<string> {
  const { orgId, claimId, type, config, notifyEmail, userId } = params;

  const id = nanoid();

  // Use ai_reports table with queue status
  await prisma.ai_reports.create({
    data: {
      id,
      orgId,
      claimId,
      type,
      title: config.customTitle || `${type} Report`,
      prompt: null,
      content: "", // Will be populated when report is generated
      tokensUsed: 0,
      model: null,
      userId,
      userName: userId, // Will be resolved later
      status: "queued",
      attachments: {
        queueConfig: config,
        notifyEmail,
        attempts: 0,
        maxAttempts: 3,
        lastError: null,
      } as unknown as Prisma.InputJsonValue,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  logger.debug(`[ReportQueue] Queued report ${id} for claim ${claimId}`);

  return id;
}

/**
 * Get the status of a queued report
 * B-28: Requires orgId to prevent cross-tenant status leaks
 */
export async function getReportStatus(
  reportId: string,
  orgId?: string
): Promise<{
  status: ReportQueueStatus;
  pdfUrl: string | null;
  error: string | null;
  attempts: number;
  progress: number; // 0-100
} | null> {
  const report = await prisma.ai_reports.findFirst({
    where: { id: reportId, ...(orgId ? { orgId } : {}) },
    select: {
      status: true,
      content: true,
      attachments: true,
    },
  });

  if (!report) return null;

  const attachments = (report.attachments as ReportAttachments) || {};
  const status = report.status as ReportQueueStatus;

  // Calculate progress based on status
  let progress = 0;
  switch (status) {
    case "queued":
      progress = 10;
      break;
    case "processing":
      progress = 50;
      break;
    case "completed":
      progress = 100;
      break;
    case "failed":
      progress = 0;
      break;
    case "cancelled":
      progress = 0;
      break;
  }

  return {
    status,
    pdfUrl: attachments.pdfUrl || null,
    error: attachments.lastError || null,
    attempts: attachments.attempts || 0,
    progress,
  };
}

/**
 * Get the next report to process from the queue
 */
export async function getNextQueuedReport(): Promise<{
  id: string;
  orgId: string;
  claimId: string | null;
  type: string;
  config: ReportQueueConfig;
} | null> {
  // Find oldest queued report that hasn't exceeded max attempts
  const report = await prisma.ai_reports.findFirst({
    where: {
      status: "queued",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      orgId: true,
      claimId: true,
      type: true,
      attachments: true,
    },
  });

  if (!report) return null;

  const attachments = (report.attachments as ReportAttachments) || {};

  // Check if exceeded max attempts
  if ((attachments.attempts || 0) >= (attachments.maxAttempts || 3)) {
    // Mark as failed
    await prisma.ai_reports.update({
      where: { id: report.id },
      data: {
        status: "failed",
        updatedAt: new Date(),
      },
    });
    // Try next one
    return getNextQueuedReport();
  }

  return {
    id: report.id,
    orgId: report.orgId,
    claimId: report.claimId,
    type: report.type,
    config: (attachments.queueConfig as unknown as ReportQueueConfig) || { sections: [] },
  };
}

/**
 * Mark a report as processing
 */
export async function markReportProcessing(reportId: string): Promise<void> {
  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { attachments: true },
  });

  const attachments = (report?.attachments as ReportAttachments) || {};

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: "processing",
      attachments: toJson({
        ...attachments,
        attempts: (attachments.attempts || 0) + 1,
        processingStartedAt: new Date().toISOString(),
      }),
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark a report as completed
 */
export async function markReportCompleted(
  reportId: string,
  pdfUrl: string,
  content?: string
): Promise<void> {
  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { attachments: true },
  });

  const attachments = (report?.attachments as ReportAttachments) || {};

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: "completed",
      content: content || "",
      attachments: toJson({
        ...attachments,
        pdfUrl,
        completedAt: new Date().toISOString(),
      }),
      updatedAt: new Date(),
    },
  });

  // Send email notification if configured
  if (attachments.notifyEmail) {
    await notifyReportComplete(reportId, attachments.notifyEmail, pdfUrl);
  }
}

/**
 * Mark a report as failed
 */
export async function markReportFailed(reportId: string, error: string): Promise<void> {
  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { attachments: true },
  });

  const attachments = (report?.attachments as ReportAttachments) || {};
  const attempts = attachments.attempts || 0;
  const maxAttempts = attachments.maxAttempts || 3;

  // If under max attempts, requeue for retry
  const newStatus = attempts < maxAttempts ? "queued" : "failed";

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: newStatus,
      attachments: toJson({
        ...attachments,
        lastError: error,
        lastFailedAt: new Date().toISOString(),
      }),
      updatedAt: new Date(),
    },
  });

  logger.info(
    `[ReportQueue] Report ${reportId} failed (attempt ${attempts}/${maxAttempts}): ${error}`
  );
}

/**
 * Cancel a queued report
 */
export async function cancelReport(reportId: string): Promise<boolean> {
  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { status: true },
  });

  if (!report) return false;

  // Can only cancel queued reports
  if (report.status !== "queued") return false;

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: "cancelled",
      updatedAt: new Date(),
    },
  });

  return true;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(orgId?: string): Promise<{
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const where = orgId ? { orgId } : {};

  const [queued, processing, completed, failed] = await Promise.all([
    prisma.ai_reports.count({ where: { ...where, status: "queued" } }),
    prisma.ai_reports.count({ where: { ...where, status: "processing" } }),
    prisma.ai_reports.count({ where: { ...where, status: "completed" } }),
    prisma.ai_reports.count({ where: { ...where, status: "failed" } }),
  ]);

  return { queued, processing, completed, failed };
}

/**
 * Send email notification when report is complete
 * TODO: Integrate with Resend email system when email_queue is implemented
 */
async function notifyReportComplete(
  reportId: string,
  email: string,
  pdfUrl: string
): Promise<void> {
  try {
    // TODO: Implement email notification via Resend
    // The email_queue model doesn't exist yet, so we log for now
    logger.info(
      `[ReportQueue] Report ${reportId} ready - would notify ${email} with URL: ${pdfUrl}`
    );
  } catch (error) {
    logger.error(`[ReportQueue] Failed to queue notification email:`, error);
  }
}

/**
 * List recent reports for an organization
 */
export async function listRecentReports(
  orgId: string,
  options: {
    limit?: number;
    status?: ReportQueueStatus;
    claimId?: string;
  } = {}
): Promise<
  Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    pdfUrl: string | null;
    createdAt: Date;
    claimId: string | null;
  }>
> {
  const { limit = 20, status, claimId } = options;

  const where: Prisma.ai_reportsWhereInput = { orgId };
  if (status) where.status = status;
  if (claimId) where.claimId = claimId;

  const reports = await prisma.ai_reports.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      status: true,
      attachments: true,
      createdAt: true,
      claimId: true,
    },
  });

  return reports.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    status: r.status,
    pdfUrl: (r.attachments as ReportAttachments)?.pdfUrl || null,
    createdAt: r.createdAt,
    claimId: r.claimId,
  }));
}
