export const dynamic = "force-dynamic";

/**
 * PATCH /api/leads/[id]/files/[fileId]/share
 *
 * Toggle file sharing with client
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Org = await prisma.org.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const { id: leadId, fileId } = params;
    const body = await req.json();
    const { sharedWithClient } = body;

    // Verify lead belongs to org
    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId: Org.id },
      select: { id: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Verify file belongs to this lead and org
    const file = await prisma.file_assets.findFirst({
      where: {
        id: fileId,
        orgId: Org.id,
        leadId: leadId,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Note: FileAsset model doesn't have sharedWithClient field yet
    // For now, we'll store this in the file's note field as a prefix
    // In a proper migration, we'd add the field to schema
    const sharePrefix = "[SHARED]";
    const currentNote = file.note || "";
    const isCurrentlyShared = currentNote.startsWith(sharePrefix);

    let newNote: string;
    if (sharedWithClient && !isCurrentlyShared) {
      newNote = `${sharePrefix} ${currentNote}`.trim();
    } else if (!sharedWithClient && isCurrentlyShared) {
      newNote = currentNote.replace(sharePrefix, "").trim();
    } else {
      newNote = currentNote;
    }

    const updatedFile = await prisma.file_assets.update({
      where: { id: fileId },
      data: {
        note: newNote,
        updatedAt: new Date(),
      },
    });

    logger.debug(`[Files Share] File ${fileId} shared=${sharedWithClient}`);

    return NextResponse.json({
      success: true,
      file: {
        ...updatedFile,
        sharedWithClient,
      },
    });
  } catch (error) {
    logger.error("[Files Share PATCH] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
