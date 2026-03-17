/**
 * POST /api/claims/[id]/dol
 *
 * Update claim Date of Loss
 * Can be triggered from weather report selection
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const UpdateDolSchema = z.object({
  dol: z.string(), // ISO date
  source: z.enum(["weather_report", "manual", "adjuster", "other"]).default("manual"),
  weatherReportId: z.string().optional(),
  notes: z.string().optional(),
});

export const POST = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      const body = await req.json();
      const validated = UpdateDolSchema.parse(body);

      // Verify claim exists and belongs to org (DB-backed orgId)
      const claim = await getOrgClaimOrThrow(orgId, claimId);

      // Update DOL
      const updatedClaim = await prisma.claims.update({
        where: { id: claimId },
        data: {
          dateOfLoss: new Date(validated.dol),
        },
      });

      // Log activity
      try {
        await prisma.claim_activities.create({
          data: {
            id: crypto.randomUUID(),
            claim_id: claim.id,
            user_id: userId,
            type: "STATUS_CHANGE",
            message: `Date of Loss updated to ${validated.dol} (source: ${validated.source})${validated.weatherReportId ? ` - Weather Report ID: ${validated.weatherReportId}` : ""}`,
            metadata: {
              previousDol: claim.dateOfLoss,
              newDol: validated.dol,
              source: validated.source,
              weatherReportId: validated.weatherReportId,
            },
          },
        });
      } catch (activityError) {
        logger.warn("[POST /api/claims/[id]/dol] Failed to log activity:", activityError);
      }

      return NextResponse.json({
        success: true,
        claim: updatedClaim,
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.errors },
          { status: 400 }
        );
      }

      logger.error("[POST /api/claims/dol]", error);
      return NextResponse.json(
        { error: "Failed to update DOL" },
        { status: 500 }
      );
    }
  }
);
