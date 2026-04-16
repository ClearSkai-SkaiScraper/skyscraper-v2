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
import { z } from "zod";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { onClaimUpdated } from "@/lib/claimiq/readiness-hooks";
import { logger } from "@/lib/logger";
import { notifyManagersOfSubmission } from "@/lib/notifications/notifyManagers";
import prisma from "@/lib/prisma";

const claimUpdateSchema = z
  .object({
    title: z.string().max(500).optional(),
    description: z.string().max(10_000).optional(),
    status: z.string().max(50).optional(),
    lifecycleStage: z
      .enum([
        "FILED",
        "ADJUSTER_REVIEW",
        "APPROVED",
        "DENIED",
        "APPEAL",
        "BUILD",
        "COMPLETED",
        "DEPRECIATION",
      ])
      .optional(),
    claimNumber: z.string().max(100).optional(),
    damageType: z.string().max(100).optional(),
    insured_name: z.string().max(200).optional(),
    homeowner_email: z.string().email().optional().or(z.literal("")),
    carrier: z.string().max(200).optional(),
    policy_number: z.string().max(100).optional(),
    adjusterName: z.string().max(200).optional(),
    adjusterPhone: z.string().max(30).optional(),
    adjusterEmail: z.string().email().optional().or(z.literal("")),
    signingStatus: z.string().max(50).optional(),
    estimatedJobValue: z.number().optional(),
    jobValueStatus: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
    jobValueApprovalNotes: z.string().max(2000).optional(),
    dateOfLoss: z.string().optional().nullable(),
    dateOfInspection: z.string().optional().nullable(),
    propertyAddress: z.string().max(500).optional(),
    propertyStreet: z.string().max(300).optional(),
    propertyCity: z.string().max(200).optional(),
    propertyState: z.string().max(100).optional(),
    propertyZip: z.string().max(20).optional(),
  })
  .passthrough(); // Allow extra fields for forward-compat

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

      const raw = await req.json();
      const parsed = claimUpdateSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const body = parsed.data;

      // Build update data from body fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};
      const allowedFields = [
        "title",
        "description",
        "status",
        "lifecycleStage",
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

      // ── CRITICAL: Sync estimatedJobValue → approvedValue on approval ──
      // When manager approves the scope of work, the approved number
      // flows to approvedValue so financial cards, sidebar, and intel/financial
      // all reflect the approved amount.
      if (body.jobValueStatus === "approved") {
        const jobValueCents =
          body.estimatedJobValue ||
          (await prisma.claims
            .findUnique({ where: { id: claimId }, select: { estimatedJobValue: true } })
            .then((c) => c?.estimatedJobValue));
        if (jobValueCents) {
          // Both estimatedJobValue and approvedValue are stored in cents
          updateData.approvedValue = jobValueCents;
          logger.info("[CLAIM_UPDATE] Manager approved → synced approvedValue", {
            claimId,
            jobValueCents,
            approvedValueCents: jobValueCents,
            userId,
          });
        }
      }

      // Track if we made any changes at all (including property address)
      const hasPropertyAddressUpdate =
        body.propertyAddress !== undefined ||
        body.propertyStreet !== undefined ||
        body.propertyCity !== undefined ||
        body.propertyState !== undefined ||
        body.propertyZip !== undefined;

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
        // S2: Use updateMany with orgId to prevent TOCTOU race condition
        const result = await prisma.claims.updateMany({
          where: { id: claimId, orgId },
          data: updateData,
        });
        if (result.count === 0) {
          return NextResponse.json({ error: "Claim not found" }, { status: 404 });
        }
        updated = await prisma.claims.findFirst({
          where: { id: claimId, orgId },
          select: { id: true, title: true, propertyId: true },
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
        // S2: Awaited with error logging instead of fire-and-forget
        try {
          await notifyManagersOfSubmission({
            orgId,
            submittedByUserId: userId,
            entityType: "claim",
            entityId: claimId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            entityTitle: (updated as any)?.title || "Claim",
            estimatedValue: body.estimatedJobValue,
          });
        } catch (notifyErr) {
          logger.warn("[CLAIM_UPDATE] notifyManagersOfSubmission failed", {
            claimId,
            error: notifyErr,
          });
        }
      }

      // Update property address fields if provided
      const hasPropertyUpdate =
        body.propertyStreet !== undefined ||
        body.propertyCity !== undefined ||
        body.propertyState !== undefined ||
        body.propertyZip !== undefined ||
        body.propertyAddress !== undefined;

      if (hasPropertyUpdate) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const propertyId = (updated as any)?.propertyId;
        if (propertyId) {
          const propertyUpdateData: Record<string, string> = {};
          if (body.propertyStreet !== undefined) propertyUpdateData.street = body.propertyStreet;
          if (body.propertyCity !== undefined) propertyUpdateData.city = body.propertyCity;
          if (body.propertyState !== undefined) propertyUpdateData.state = body.propertyState;
          if (body.propertyZip !== undefined) propertyUpdateData.zipCode = body.propertyZip;
          // Legacy: if only propertyAddress is sent (full string), put it in street
          if (body.propertyAddress !== undefined && Object.keys(propertyUpdateData).length === 0) {
            propertyUpdateData.street = body.propertyAddress;
          }
          if (Object.keys(propertyUpdateData).length > 0) {
            await prisma.properties.update({
              where: { id: propertyId, orgId },
              data: propertyUpdateData,
            });
          }
        } else {
          logger.warn("[PATCH /api/claims/update] No propertyId on claim; cannot update address", {
            claimId,
          });
        }
      }

      // Fire ClaimIQ readiness refresh (non-blocking)
      if (Object.keys(updateData).length > 0) {
        onClaimUpdated(claimId, orgId, userId, Object.keys(updateData)).catch((e) =>
          logger.warn("[CLAIM_UPDATE] ClaimIQ readiness hook failed", {
            claimId,
            error: e?.message,
          })
        );
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
