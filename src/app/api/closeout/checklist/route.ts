/**
 * GET  /api/closeout/checklist?entityId=xxx&entityType=claim
 * PATCH /api/closeout/checklist  { entityId, entityType, field, value }
 *
 * Manages the JobCloseout checklist for a claim.
 * Creates the record on first access (upsert pattern).
 */
import { auth } from "@clerk/nextjs/server";
import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import { getTenantContext } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BOOLEAN_FIELDS = [
  "allPhotosPresent",
  "allFormsUploaded",
  "signedCompletionForm",
  "finalInvoiceAttached",
  "warrantyRegistered",
  "subcontractorsPaid",
  "materialsReconciled",
  "dumpsterAccounted",
  "buildDaysLogged",
  "depreciationRequested",
  "depreciationReceived",
  "finalPaymentReceived",
] as const;

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getTenantContext();
    if (!ctx?.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get("entityId");
    const entityType = searchParams.get("entityType");

    if (!entityId || entityType !== "claim") {
      return NextResponse.json(
        { error: "entityId and entityType=claim required" },
        { status: 400 }
      );
    }

    // Upsert — create if not exists
    let checklist = await prisma.jobCloseout.findFirst({
      where: { claimId: entityId, orgId: ctx.orgId },
    });

    if (!checklist) {
      checklist = await prisma.jobCloseout.create({
        data: {
          id: createId(),
          orgId: ctx.orgId,
          claimId: entityId,
          updatedAt: new Date(),
        },
      });
      logger.info("[CLOSEOUT_CHECKLIST] Created new checklist", {
        orgId: ctx.orgId,
        claimId: entityId,
      });
    }

    return NextResponse.json({ checklist });
  } catch (err) {
    logger.error("[CLOSEOUT_CHECKLIST] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getTenantContext();
    if (!ctx?.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await req.json();
    const { entityId, entityType, field, value } = body;

    if (!entityId || entityType !== "claim") {
      return NextResponse.json(
        { error: "entityId and entityType=claim required" },
        { status: 400 }
      );
    }

    if (!BOOLEAN_FIELDS.includes(field)) {
      return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 });
    }

    if (typeof value !== "boolean") {
      return NextResponse.json({ error: "value must be boolean" }, { status: 400 });
    }

    // Build dynamic update payload
    const updateData: Record<string, unknown> = {
      [field]: value,
      updatedAt: new Date(),
    };

    // Add timestamp for date-tracked fields
    if (field === "depreciationRequested") {
      updateData.depreciationRequestedAt = value ? new Date() : null;
    }
    if (field === "depreciationReceived") {
      updateData.depreciationReceivedAt = value ? new Date() : null;
    }
    if (field === "finalPaymentReceived") {
      updateData.finalPaymentReceivedAt = value ? new Date() : null;
    }

    // Upsert — create if needed, then update
    const checklist = await prisma.jobCloseout.upsert({
      where: {
        claimId: entityId,
      },
      update: updateData,
      create: {
        id: createId(),
        orgId: ctx.orgId,
        claimId: entityId,
        updatedAt: new Date(),
        ...updateData,
      },
    });

    // Check if all items complete → auto-set closeoutStatus
    const allComplete = BOOLEAN_FIELDS.every((f) => checklist[f] === true);

    if (allComplete && checklist.closeoutStatus !== "complete") {
      await prisma.jobCloseout.update({
        where: { claimId: entityId },
        data: {
          closeoutStatus: "complete",
          closeoutCompletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else if (!allComplete && checklist.closeoutStatus === "complete") {
      await prisma.jobCloseout.update({
        where: { claimId: entityId },
        data: {
          closeoutStatus: "pending",
          closeoutCompletedAt: null,
          updatedAt: new Date(),
        },
      });
    }

    logger.info("[CLOSEOUT_CHECKLIST] Updated", {
      orgId: ctx.orgId,
      claimId: entityId,
      field,
      value,
      allComplete,
    });

    return NextResponse.json({ checklist, allComplete });
  } catch (err) {
    logger.error("[CLOSEOUT_CHECKLIST] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
