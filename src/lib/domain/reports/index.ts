/**
 * Reports Domain Services
 *
 * Pure business logic functions - no HTTP, no Next.js, no UI.
 * Route handlers call these, they return results.
 *
 * Uses ONLY real Prisma models:
 *   - ai_reports: id, orgId, type, title, prompt, content, tokensUsed, model,
 *                 claimId, inspectionId, userId, userName, status, attachments
 *   - claim_activities: event logging
 *   - reports: generated reports with sections/PDF
 */

import type { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ============================================================================
// Types
// ============================================================================

export interface ApproveReportInput {
  reportId: string;
  orgId: string;
  userId: string;
  notes?: string;
}

export interface RejectReportInput {
  reportId: string;
  orgId: string;
  userId: string;
  reason: string;
  notes?: string;
}

export interface SendReportInput {
  reportId: string;
  orgId: string;
  userId: string;
  recipientEmail: string;
  recipientType?: "adjuster" | "homeowner" | "contractor";
  message?: string;
}

export interface SendPacketInput {
  reportId: string;
  orgId: string;
  userId: string;
  recipientEmail: string;
  message?: string;
  includePhotos?: boolean;
  includeDocuments?: boolean;
}

export interface GenerateReportInput {
  claimId: string;
  orgId: string;
  userId: string;
  reportType: string;
  options?: Record<string, unknown>;
}

export interface UpdateReportStatusInput {
  reportId: string;
  status: string;
}

export interface AddReportNoteInput {
  reportId: string;
  userId: string;
  content: string;
  noteType?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Log a report event to claim_activities (fire-and-forget) */
function logReportEvent(
  reportId: string,
  claimId: string | null,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {}
) {
  if (!claimId) return;
  prisma.claim_activities
    .create({
      data: {
        id: crypto.randomUUID(),
        claim_id: claimId,
        user_id: userId,
        type: "NOTE",
        message: `Report ${eventType}: ${reportId}`,
        metadata: { reportId, eventType, ...metadata },
      },
    })
    .catch((err: unknown) => logger.error("[ReportService] Failed to log event:", err));
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Approve a report — update status + log event
 */
export async function approveReport(input: ApproveReportInput) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { reportId, orgId, userId, notes } = input;

  const report = await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: "approved",
      attachments: {
        approvedAt: new Date().toISOString(),
        approvedBy: userId,
        approvalNotes: notes,
      },
    },
  });

  logReportEvent(reportId, report.claimId, userId, "approved", { notes });

  return { success: true, report };
}

/**
 * Reject a report — update status + log event
 */
export async function rejectReport(input: RejectReportInput) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { reportId, orgId, userId, reason, notes } = input;

  const report = await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: "rejected",
      attachments: {
        rejectedAt: new Date().toISOString(),
        rejectedBy: userId,
        rejectionReason: reason,
        rejectionNotes: notes,
      },
    },
  });

  logReportEvent(reportId, report.claimId, userId, "rejected", { reason, notes });

  return { success: true, report };
}

/**
 * Send a report — update status, log event
 * TODO: wire actual email delivery via EmailQueue
 */
export async function sendReport(input: SendReportInput) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { reportId, orgId, userId, recipientEmail, recipientType, message } = input;

  const report = await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: "sent",
      attachments: {
        sentAt: new Date().toISOString(),
        sentBy: userId,
        recipientEmail,
        recipientType: recipientType || "adjuster",
        message,
      },
    },
  });

  logReportEvent(reportId, report.claimId, userId, "sent", {
    recipientEmail,
    recipientType,
  });

  return { success: true, message: "Report marked as sent" };
}

/**
 * Send a complete packet — update status, log event
 * TODO: wire actual packet assembly + email via EmailQueue
 */
export async function sendPacket(input: SendPacketInput) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { reportId, orgId, userId, recipientEmail, message, includePhotos, includeDocuments } =
    input;

  const report = await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      status: "sent",
      attachments: {
        packetSentAt: new Date().toISOString(),
        sentBy: userId,
        recipientEmail,
        message,
        includePhotos: includePhotos ?? true,
        includeDocuments: includeDocuments ?? true,
      },
    },
  });

  logReportEvent(reportId, report.claimId, userId, "packet_sent", {
    recipientEmail,
    includePhotos,
    includeDocuments,
  });

  return { success: true, message: "Packet marked as sent" };
}

/**
 * Generate a new report — create ai_reports record
 */
export async function generateReport(input: GenerateReportInput) {
  const { claimId, orgId, userId, reportType, options } = input;

  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { name: true },
  });

  const report = await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId,
      type: reportType,
      title: `${reportType} Report`,
      content: "",
      tokensUsed: 0,
      userId,
      userName: user?.name || "System",
      status: "pending",
      attachments: { options: (options || {}) as Prisma.InputJsonValue } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  logReportEvent(report.id, claimId, userId, "generation_started", { reportType });

  return { success: true, report: { id: report.id, status: "pending" } };
}

/**
 * Update report status
 */
export async function updateReportStatus(input: UpdateReportStatusInput) {
  const { reportId, status } = input;

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: { status },
  });

  return { success: true };
}

/**
 * Add a note to a report — stored in attachments JSON
 */
export async function addReportNote(input: AddReportNoteInput) {
  const { reportId, userId, content, noteType } = input;

  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { attachments: true, claimId: true },
  });

  const currentAttachments =
    report?.attachments && typeof report.attachments === "object"
      ? (report.attachments as Record<string, unknown>)
      : {};

  const existingNotes = Array.isArray(currentAttachments.notes)
    ? (currentAttachments.notes as Record<string, unknown>[])
    : [];

  const newNote = {
    id: crypto.randomUUID(),
    content,
    noteType: noteType || "general",
    authorId: userId,
    createdAt: new Date().toISOString(),
  };

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      attachments: {
        ...currentAttachments,
        notes: [...existingNotes, newNote],
      } as Prisma.InputJsonValue,
    },
  });

  logReportEvent(reportId, report?.claimId || null, userId, "note_added", {
    noteType,
  });

  return { success: true, note: newNote };
}

/**
 * Regenerate share links — store token in attachments
 */
export async function regenerateShareLinks(reportId: string, expireExisting?: boolean) {
  const token = crypto.randomUUID();

  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { attachments: true },
  });

  const currentAttachments =
    report?.attachments && typeof report.attachments === "object"
      ? (report.attachments as Record<string, unknown>)
      : {};

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      attachments: {
        ...currentAttachments,
        shareToken: token,
        shareCreatedAt: new Date().toISOString(),
        shareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        previousShareExpired: expireExisting ?? false,
      },
    },
  });

  return {
    success: true,
    shareUrl: `/reports/share/${token}`,
  };
}

/**
 * Save draft content — update ai_reports content field
 */
export async function saveDraft(reportId: string, content: Record<string, unknown>) {
  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      content: JSON.stringify(content),
      status: "draft",
    },
  });

  return { success: true };
}

/**
 * Create email draft — stored in attachments
 * TODO: integrate with EmailQueue model for real sending
 */
export async function createEmailDraft(
  reportId: string,
  subject: string,
  body: string,
  recipientType: "adjuster" | "homeowner" | "contractor"
) {
  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { attachments: true },
  });

  const currentAttachments =
    report?.attachments && typeof report.attachments === "object"
      ? (report.attachments as Record<string, unknown>)
      : {};

  const draft = {
    id: crypto.randomUUID(),
    subject,
    body,
    recipientType,
    createdAt: new Date().toISOString(),
  };

  await prisma.ai_reports.update({
    where: { id: reportId },
    data: {
      attachments: {
        ...currentAttachments,
        emailDraft: draft,
      },
    },
  });

  return { success: true, draft };
}

// ============================================================================
// Batch Report Services (from reports/actions)
// ============================================================================

export interface GenerateFromTemplateInput {
  claimId: string;
  orgId: string;
  userId: string;
  templateId: string;
  variables?: Record<string, unknown>;
}

export interface ComposeReportInput {
  claimId: string;
  orgId: string;
  userId: string;
  sections: Array<{
    key: string;
    content?: string;
    include?: boolean;
  }>;
}

export interface GenerateSummaryInput {
  claimId: string;
  orgId: string;
  userId: string;
  format?: "brief" | "detailed" | "executive";
}

export interface GenerateSupplementInput {
  claimId: string;
  orgId: string;
  userId: string;
  originalReportId?: string;
  newDamage?: Record<string, unknown>[];
}

export interface QueueReportInput {
  claimId: string;
  orgId: string;
  userId: string;
  reportType: string;
  priority?: "low" | "normal" | "high";
  scheduledFor?: string;
}

/**
 * Generate report from template
 */
export async function generateFromTemplate(input: GenerateFromTemplateInput) {
  const { claimId, orgId, userId, templateId, variables } = input;

  const template = await prisma.reportTemplate.findFirst({
    where: { id: templateId, orgId },
  });

  if (!template) {
    throw new Error("Template not found");
  }

  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { name: true },
  });

  const report = await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId,
      type: template.type,
      title: `${template.name} Report`,
      content: "",
      tokensUsed: 0,
      userId,
      userName: user?.name || "System",
      status: "generating",
      attachments: {
        templateId,
        variables: (variables || {}) as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return { success: true, report: { id: report.id } };
}

/**
 * Compose report with sections
 */
export async function composeReport(input: ComposeReportInput) {
  const { claimId, orgId, userId, sections } = input;

  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { name: true },
  });

  const report = await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId,
      type: "composed",
      title: "Composed Report",
      content: JSON.stringify(sections),
      tokensUsed: 0,
      userId,
      userName: user?.name || "System",
      status: "draft",
      attachments: { sections },
      updatedAt: new Date(),
    },
  });

  return { success: true, report: { id: report.id } };
}

/**
 * Generate summary report
 */
export async function generateSummary(input: GenerateSummaryInput) {
  const { claimId, orgId, userId, format } = input;

  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { name: true },
  });

  const report = await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId,
      type: "summary",
      title: `${(format || "detailed").charAt(0).toUpperCase() + (format || "detailed").slice(1)} Summary`,
      content: "",
      tokensUsed: 0,
      userId,
      userName: user?.name || "System",
      status: "generating",
      attachments: { format: format || "detailed" },
      updatedAt: new Date(),
    },
  });

  return { success: true, report: { id: report.id } };
}

/**
 * Generate supplement report
 */
export async function generateSupplement(input: GenerateSupplementInput) {
  const { claimId, orgId, userId, originalReportId, newDamage } = input;

  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { name: true },
  });

  const report = await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId,
      type: "supplement",
      title: "Supplement Report",
      content: "",
      tokensUsed: 0,
      userId,
      userName: user?.name || "System",
      status: "generating",
      attachments: {
        parentReportId: originalReportId,
        newDamage: (newDamage || []) as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return { success: true, report: { id: report.id } };
}

/**
 * Queue report for generation — stored as ai_reports with status "queued"
 */
export async function queueReport(input: QueueReportInput) {
  const { claimId, orgId, userId, reportType, priority, scheduledFor } = input;

  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { name: true },
  });

  const queueItem = await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId,
      orgId,
      type: reportType,
      title: `Queued: ${reportType} Report`,
      content: "",
      tokensUsed: 0,
      userId,
      userName: user?.name || "System",
      status: "queued",
      attachments: {
        priority: priority || "normal",
        scheduledFor: scheduledFor || null,
        queuedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  });

  return { success: true, queueItem: { id: queueItem.id } };
}

/**
 * Start generating a report (transition from queued → processing)
 */
export async function startReport(queueId: string) {
  const report = await prisma.ai_reports.update({
    where: { id: queueId },
    data: {
      status: "processing",
    },
  });

  return { success: true, queueItem: report };
}

/**
 * Mark report generation as finished
 */
export async function finishReport(queueId: string, reportId: string) {
  const report = await prisma.ai_reports.update({
    where: { id: queueId },
    data: {
      status: "completed",
      attachments: {
        completedAt: new Date().toISOString(),
        generatedReportId: reportId,
      },
    },
  });

  return { success: true, queueItem: report };
}

/**
 * Regenerate an existing report
 */
export async function regenerateReport(reportId: string, userId: string) {
  const report = await prisma.ai_reports.findUnique({
    where: { id: reportId },
    select: { claimId: true, orgId: true, type: true },
  });

  if (!report) {
    return { success: false, error: "Report not found" };
  }

  const user = await prisma.users.findFirst({
    where: { clerkUserId: userId },
    select: { name: true },
  });

  const queueItem = await prisma.ai_reports.create({
    data: {
      id: crypto.randomUUID(),
      claimId: report.claimId,
      orgId: report.orgId,
      type: report.type || "standard",
      title: `Regenerate: ${report.type || "standard"} Report`,
      content: "",
      tokensUsed: 0,
      userId,
      userName: user?.name || "System",
      status: "queued",
      attachments: {
        priority: "high",
        regenerateFrom: reportId,
        queuedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    },
  });

  return { success: true, queueItem: { id: queueItem.id } };
}
