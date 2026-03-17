import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const createSupplementSchema = z.object({
  totalCents: z.number().int().min(0),
  status: z.enum(["REQUESTED", "APPROVED", "DENIED", "DISPUTED"]).default("REQUESTED"),
  data: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/claims/[id]/supplements - Add supplement request to claim
 */
export const POST = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      const body = await req.json();
      const validated = createSupplementSchema.parse(body);

      // Verify claim belongs to org (DB-backed orgId)
      await getOrgClaimOrThrow(orgId, claimId);

      // Create supplement
      const supplement = await prisma.claim_supplements.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          total_cents: validated.totalCents,
          status: validated.status,
          data: validated.data || {},
          updated_at: new Date(),
        },
      });

      // Log activity
      await prisma.claim_activities.create({
        data: {
          id: crypto.randomUUID(),
          claim_id: claimId,
          user_id: userId,
          type: "SUPPLEMENT",
          message:
            validated.notes ||
            `Supplement ${validated.status} for $${(validated.totalCents / 100).toFixed(2)}`,
          metadata: {
            supplementId: supplement.id,
            totalCents: validated.totalCents,
            status: validated.status,
          },
        },
      });

      // Update claim exposure
      const supplements = await prisma.claim_supplements.findMany({
        where: {
          claim_id: claimId,
          status: { in: ["APPROVED", "REQUESTED"] },
        },
      });

      const supplementTotal = supplements.reduce(
        (sum: number, s: any) => sum + (s.total_cents || 0),
        0
      );

      await prisma.claims.update({
        where: { id: claimId },
        data: { exposure_cents: supplementTotal },
      });

      return NextResponse.json(
        { supplement },
        { status: 201, headers: { "Cache-Control": "no-store" } }
      );
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

      logger.error("[POST /api/claims/supplements]", error);
      return NextResponse.json(
        { error: "Failed to create supplement" },
        { status: 500 }
      );
    }
  }
);

/**
 * GET /api/claims/[id]/supplements - List all supplements for claim
 */
export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org (DB-backed orgId)
      await getOrgClaimOrThrow(orgId, claimId);

      const supplements = await prisma.claim_supplements.findMany({
        where: { claim_id: claimId },
        orderBy: { created_at: "desc" },
      });

      return NextResponse.json({ supplements }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[GET /api/claims/supplements]", error);
      return NextResponse.json(
        { error: "Failed to fetch supplements" },
        { status: 500 }
      );
    }
  }
);
