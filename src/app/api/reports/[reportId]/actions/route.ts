/**
 * Reports Actions - Thin dispatcher calling service layer
 *
 * POST /api/reports/[reportId]/actions
 * Actions: approve, reject, send, send_packet, draft, draft_email,
 *          regenerate_links, update_status, add_note
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import * as reportService from "@/lib/domain/reports";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    reason: z.string(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("send"),
    recipientEmail: z.string().email(),
    recipientType: z.enum(["adjuster", "homeowner", "contractor"]).optional(),
    message: z.string().optional(),
  }),
  z.object({
    action: z.literal("send_packet"),
    includePhotos: z.boolean().optional(),
    includeDocuments: z.boolean().optional(),
    recipientEmail: z.string().email(),
    message: z.string().optional(),
  }),
  z.object({
    action: z.literal("draft"),
    content: z.record(z.any()),
  }),
  z.object({
    action: z.literal("draft_email"),
    subject: z.string(),
    body: z.string(),
    recipientType: z.enum(["adjuster", "homeowner", "contractor"]),
  }),
  z.object({
    action: z.literal("regenerate_links"),
    expireExisting: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("update_status"),
    status: z.string(),
  }),
  z.object({
    action: z.literal("add_note"),
    content: z.string(),
    noteType: z.string().optional(),
  }),
]);

export const POST = withAuth(async (req: NextRequest, { orgId, userId }, routeParams) => {
  try {
    const { reportId } = await routeParams.params;
    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify report belongs to org
    const report = await prisma.ai_reports.findFirst({
      where: { id: reportId, orgId },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // =========================================================================
    // Dispatch to Service Layer
    // =========================================================================
    const input = parsed.data;

    switch (input.action) {
      case "approve": {
        const result = await reportService.approveReport({
          reportId,
          orgId,
          userId,
          notes: input.notes,
        });
        return NextResponse.json(result);
      }

      case "reject": {
        const result = await reportService.rejectReport({
          reportId,
          orgId,
          userId,
          reason: input.reason,
          notes: input.notes,
        });
        return NextResponse.json(result);
      }

      case "send": {
        const result = await reportService.sendReport({
          reportId,
          orgId,
          userId,
          recipientEmail: input.recipientEmail,
          recipientType: input.recipientType,
          message: input.message,
        });
        return NextResponse.json(result);
      }

      case "send_packet": {
        const result = await reportService.sendPacket({
          reportId,
          orgId,
          userId,
          recipientEmail: input.recipientEmail,
          message: input.message,
          includePhotos: input.includePhotos,
          includeDocuments: input.includeDocuments,
        });
        return NextResponse.json(result);
      }

      case "draft": {
        const result = await reportService.saveDraft(reportId, input.content);
        return NextResponse.json(result);
      }

      case "draft_email": {
        const result = await reportService.createEmailDraft(
          reportId,
          input.subject,
          input.body,
          input.recipientType
        );
        return NextResponse.json(result);
      }

      case "regenerate_links": {
        const result = await reportService.regenerateShareLinks(reportId, input.expireExisting);
        return NextResponse.json(result);
      }

      case "update_status": {
        const result = await reportService.updateReportStatus({
          reportId,
          status: input.status,
        });
        return NextResponse.json(result);
      }

      case "add_note": {
        const result = await reportService.addReportNote({
          reportId,
          userId,
          content: input.content,
          noteType: input.noteType,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Reports Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
