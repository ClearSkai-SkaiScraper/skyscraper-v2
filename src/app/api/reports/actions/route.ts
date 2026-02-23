/**
 * Reports Generate Actions - Unified handler for report generation
 *
 * POST /api/reports/actions
 * Actions: generate, generate_from_template, compose, summary, supplement, queue
 *
 * Uses service layer → ai_reports model (real fields only)
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import * as reportService from "@/lib/domain/reports";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    claimId: z.string(),
    reportType: z.string(),
    options: z.record(z.any()).optional(),
  }),
  z.object({
    action: z.literal("generate_from_template"),
    claimId: z.string(),
    templateId: z.string(),
    variables: z.record(z.any()).optional(),
  }),
  z.object({
    action: z.literal("compose"),
    claimId: z.string(),
    sections: z.array(
      z.object({
        key: z.string(),
        content: z.string().optional(),
        include: z.boolean().optional(),
      })
    ),
  }),
  z.object({
    action: z.literal("summary"),
    claimId: z.string(),
    format: z.enum(["brief", "detailed", "executive"]).optional(),
  }),
  z.object({
    action: z.literal("supplement"),
    claimId: z.string(),
    originalReportId: z.string().optional(),
    newDamage: z.array(z.record(z.any())).optional(),
  }),
  z.object({
    action: z.literal("queue"),
    claimId: z.string(),
    reportType: z.string(),
    priority: z.enum(["low", "normal", "high"]).optional(),
    scheduledFor: z.string().optional(),
  }),
]);

export const POST = withAuth(async (req: NextRequest, { orgId, userId }) => {
  try {
    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: input.claimId, orgId },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Delegate to service layer (uses real Prisma models only)
    switch (input.action) {
      case "generate": {
        const result = await reportService.generateReport({
          claimId: claim.id,
          orgId,
          userId,
          reportType: input.reportType,
          options: input.options,
        });
        return NextResponse.json(result);
      }

      case "generate_from_template": {
        const result = await reportService.generateFromTemplate({
          claimId: claim.id,
          orgId,
          userId,
          templateId: input.templateId,
          variables: input.variables,
        });
        return NextResponse.json(result);
      }

      case "compose": {
        const result = await reportService.composeReport({
          claimId: claim.id,
          orgId,
          userId,
          sections: input.sections,
        });
        return NextResponse.json(result);
      }

      case "summary": {
        const result = await reportService.generateSummary({
          claimId: claim.id,
          orgId,
          userId,
          format: input.format,
        });
        return NextResponse.json(result);
      }

      case "supplement": {
        const result = await reportService.generateSupplement({
          claimId: claim.id,
          orgId,
          userId,
          originalReportId: input.originalReportId,
          newDamage: input.newDamage,
        });
        return NextResponse.json(result);
      }

      case "queue": {
        const result = await reportService.queueReport({
          claimId: claim.id,
          orgId,
          userId,
          reportType: input.reportType,
          priority: input.priority,
          scheduledFor: input.scheduledFor,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Reports Generate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
