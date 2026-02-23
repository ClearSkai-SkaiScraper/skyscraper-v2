/**
 * ============================================================================
 * CLAIM UPDATE PROXY
 * ============================================================================
 *
 * PATCH /api/claims/[claimId]/update
 *
 * The overview page calls this with PATCH { field: value, ... }.
 * This proxies to the mutate route's "update" action.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const PATCH = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      await getOrgClaimOrThrow(orgId, claimId);

      const body = await req.json();

      // Build update data from body fields
      const updateData: Record<string, any> = {};
      const allowedFields = [
        "title",
        "description",
        "status",
        "damageType",
        "insured_name",
        "homeowner_email",
        "carrier",
        "policy_number",
        "adjusterName",
        "adjusterPhone",
        "adjusterEmail",
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Handle date fields specially
      if (body.dateOfLoss !== undefined) {
        updateData.dateOfLoss = body.dateOfLoss ? new Date(body.dateOfLoss) : null;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ success: true, message: "No changes" });
      }

      const updated = await prisma.claims.update({
        where: { id: claimId },
        data: updateData,
      });

      // Update property address if provided
      if (body.propertyAddress !== undefined && updated.propertyId) {
        await prisma.properties.update({
          where: { id: updated.propertyId },
          data: { street: body.propertyAddress },
        });
      }

      return NextResponse.json({ success: true, claim: updated });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[PATCH /api/claims/[claimId]/update] Error:", error);
      return NextResponse.json(
        { error: "Failed to update claim" },
        { status: 500 }
      );
    }
  }
);
