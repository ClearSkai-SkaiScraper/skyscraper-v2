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
import { notifyManagersOfSubmission } from "@/lib/notifications/notifyManagers";
import prisma from "@/lib/prisma";

export const PATCH = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
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
        "claimNumber",
        "damageType",
        "insured_name",
        "homeowner_email",
        "carrier",
        "policy_number",
        "adjusterName",
        "adjusterPhone",
        "adjusterEmail",
        "signingStatus",
        "estimatedJobValue",
        "jobValueStatus",
        "jobValueApprovalNotes",
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
      if (body.dateOfInspection !== undefined) {
        updateData.inspectionDate = body.dateOfInspection ? new Date(body.dateOfInspection) : null;
      }

      // Auto-set signing status audit trail
      if (body.signingStatus !== undefined) {
        updateData.signingStatusSetAt = new Date();
        updateData.signingStatusSetBy = userId;
      }

      // Auto-set job value submission audit trail
      if (body.jobValueStatus === "submitted") {
        updateData.jobValueSubmittedAt = new Date();
        updateData.jobValueSubmittedBy = userId;
      }
      // Auto-set job value approval/rejection audit trail
      if (body.jobValueStatus === "approved" || body.jobValueStatus === "rejected") {
        updateData.jobValueApprovedAt = new Date();
        updateData.jobValueApprovedBy = userId;
      }

      // Track if we made any changes at all (including property address)
      const hasPropertyAddressUpdate = body.propertyAddress !== undefined;

      // Update the claim record if we have claim-level changes
      let updated;
      if (Object.keys(updateData).length > 0) {
        updated = await prisma.claims.update({
          where: { id: claimId },
          data: updateData,
        });
      } else {
        // Still need the claim for propertyId lookup even if no claim-level changes
        updated = await prisma.claims.findUnique({
          where: { id: claimId },
          select: { id: true, title: true, propertyId: true },
        });
      }

      if (!updated && !hasPropertyAddressUpdate) {
        return NextResponse.json({ success: true, message: "No changes" });
      }

      // Notify managers when a job value is submitted for approval
      if (body.jobValueStatus === "submitted" && body.estimatedJobValue) {
        notifyManagersOfSubmission({
          orgId,
          submittedByUserId: userId,
          entityType: "claim",
          entityId: claimId,
          entityTitle: (updated as any)?.title || "Claim",
          estimatedValue: body.estimatedJobValue,
        });
      }

      // Update property address if provided
      if (body.propertyAddress !== undefined) {
        const propertyId = (updated as any)?.propertyId;
        if (propertyId) {
          // Update existing property
          await prisma.properties.update({
            where: { id: propertyId },
            data: { street: body.propertyAddress },
          });
        } else {
          // Create new property and link to claim
          const newProperty = await prisma.properties.create({
            data: {
              street: body.propertyAddress,
              orgId,
            },
          });
          await prisma.claims.update({
            where: { id: claimId },
            data: { propertyId: newProperty.id },
          });
        }
      }

      return NextResponse.json({ success: true, claim: updated });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[PATCH /api/claims/[claimId]/update] Error:", error);
      return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
    }
  }
);
