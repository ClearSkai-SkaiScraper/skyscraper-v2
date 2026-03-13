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
import { onClaimUpdated } from "@/lib/claimiq/readiness-hooks";
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

      // Handle date fields specially — use noon UTC to prevent timezone off-by-one
      if (body.dateOfLoss !== undefined) {
        updateData.dateOfLoss = body.dateOfLoss
          ? new Date(body.dateOfLoss + (body.dateOfLoss.includes("T") ? "" : "T12:00:00Z"))
          : null;
      }
      if (body.dateOfInspection !== undefined) {
        updateData.inspectionDate = body.dateOfInspection
          ? new Date(
              body.dateOfInspection + (body.dateOfInspection.includes("T") ? "" : "T12:00:00Z")
            )
          : null;
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

      // ── Auto-save adjuster as a reusable contact (adjuster recall) ──
      const hasAdjusterUpdate = body.adjusterName || body.adjusterPhone || body.adjusterEmail;
      if (hasAdjusterUpdate) {
        const adjName = body.adjusterName || updateData.adjusterName;
        const adjEmail = body.adjusterEmail || updateData.adjusterEmail;
        const adjPhone = body.adjusterPhone || updateData.adjusterPhone;
        const carrier = body.carrier || updateData.carrier;

        if (adjName && (adjEmail || adjPhone)) {
          try {
            // Upsert by email (if provided) or name within this org
            const existing = adjEmail
              ? await prisma.contacts.findFirst({
                  where: { orgId, email: adjEmail, tags: { has: "adjuster" } },
                })
              : await prisma.contacts.findFirst({
                  where: {
                    orgId,
                    firstName: adjName.split(" ")[0],
                    lastName: adjName.split(" ").slice(1).join(" ") || "",
                    tags: { has: "adjuster" },
                  },
                });

            if (!existing) {
              const { createId } = await import("@paralleldrive/cuid2");
              await prisma.contacts.create({
                data: {
                  id: createId(),
                  orgId,
                  firstName: adjName.split(" ")[0] || adjName,
                  lastName: adjName.split(" ").slice(1).join(" ") || "",
                  email: adjEmail || null,
                  phone: adjPhone || null,
                  company: carrier || null,
                  title: "Insurance Adjuster",
                  tags: ["adjuster"],
                  source: "claim_adjuster",
                  updatedAt: new Date(),
                },
              });
            } else {
              // Update existing adjuster contact with latest info
              await prisma.contacts.update({
                where: { id: existing.id },
                data: {
                  phone: adjPhone || existing.phone,
                  company: carrier || existing.company,
                },
              });
            }
          } catch (adjErr) {
            // Non-blocking — don't fail the claim update if contact save fails
            logger.warn("[CLAIM_UPDATE] Adjuster contact upsert failed:", adjErr);
          }
        }
      }

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
          // Update existing property street
          await prisma.properties.update({
            where: { id: propertyId },
            data: { street: body.propertyAddress },
          });
        } else {
          // No linked property yet — cannot create one without required fields
          // (contactId, name, propertyType, city, state, zipCode).
          // Log and skip; user should create a full property via the property form.
          logger.warn("[PATCH /api/claims/update] No propertyId on claim; cannot update address", {
            claimId,
          });
        }
      }

      // Fire ClaimIQ readiness refresh (non-blocking)
      if (Object.keys(updateData).length > 0) {
        onClaimUpdated(claimId, orgId, userId, Object.keys(updateData)).catch(() => {});
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
