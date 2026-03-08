export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (user.publicMetadata?.orgId as string) || user.id;
    const body = await req.json();

    const { claimId, completionFormUploaded, completionPhotosUploaded, walkthroughPassed, notes } =
      body;

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    // Verify claim ownership
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Upsert completion status
    const updateData: any = {
      org_id: orgId,
      updated_at: new Date(),
    };

    if (completionFormUploaded !== undefined) {
      updateData.completion_form_uploaded = completionFormUploaded;
    }
    if (completionPhotosUploaded !== undefined) {
      updateData.completion_photos_uploaded = completionPhotosUploaded;
    }
    if (walkthroughPassed !== undefined) {
      updateData.walkthrough_passed = walkthroughPassed;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const completion_status = await prisma.completion_status.upsert({
      where: { claim_id: claimId },
      create: {
        claim_id: claimId,
        ...updateData,
      },
      update: updateData,
    });

    // Check if all requirements are met
    const allComplete =
      completion_status.completion_form_uploaded &&
      completion_status.completion_photos_uploaded &&
      completion_status.walkthrough_passed;

    // Auto-mark as complete if all requirements met
    if (allComplete && !completion_status.is_complete) {
      await prisma.completion_status.update({
        where: { claim_id: claimId },
        data: {
          is_complete: true,
          completed_at: new Date(),
          completed_by: user.id,
        },
      });

      // Log to claim activity
      await prisma.claim_timeline_events.create({
        data: {
          id: randomUUID(),
          claim_id: claimId,
          type: "status_changed",
          description: "🏁 Claim marked as BUILD COMPLETE - Ready for depreciation processing",
          actor_id: user.id,
          visible_to_client: true,
        },
      });
    }

    // Fetch updated status
    const updated = await prisma.completion_status.findUnique({
      where: { claim_id: claimId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("[Completion Update Error]", error);
    return NextResponse.json(
      { error: "Failed to update completion status" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (user.publicMetadata?.orgId as string) || user.id;
    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get("claimId");

    if (!claimId) {
      return NextResponse.json({ error: "claimId required" }, { status: 400 });
    }

    const completion_status = await prisma.completion_status.findUnique({
      where: { claim_id: claimId },
    });

    if (!completion_status || completion_status.org_id !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(completion_status);
  } catch (error) {
    logger.error("[Completion Get Error]", error);
    return NextResponse.json(
      { error: "Failed to get completion status" },
      { status: 500 }
    );
  }
}
