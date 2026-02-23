import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getDelegate } from "@/lib/db/modelAliases";
import prisma from "@/lib/prisma";

/**
 * GET /api/damage/[id]
 * Get a single damage assessment with all findings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessment = await getDelegate('damageAssessment').findFirst({
      where: {
        id: params.id,
        orgId
      },
      include: {
        findings: {
          orderBy: { createdAt: "asc" }
        },
        photos: true,
        claim: true
      }
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Damage assessment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      assessment
    });

  } catch (error) {
    logger.error("[API] Get damage assessment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch damage assessment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/damage/[id]
 * Delete a damage assessment
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const existing = await getDelegate('damageAssessment').findFirst({
      where: {
        id: params.id,
        orgId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Damage assessment not found" },
        { status: 404 }
      );
    }

    await getDelegate('damageAssessment').delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      description: "Damage assessment deleted"
    });

  } catch (error) {
    logger.error("[API] Delete damage assessment error:", error);
    return NextResponse.json(
      { error: "Failed to delete damage assessment" },
      { status: 500 }
    );
  }
}
