export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/hoa/notices/[id]/send
 *
 * HOA notice feature - requires hoaNoticePack model to be implemented
 * Currently stubbed as the model doesn't exist in the schema
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // HOA notice feature not yet implemented - requires database schema
    logger.debug(`[HOA] Notice send requested for ${id} by org ${orgId}`);

    return NextResponse.json(
      {
        error: "HOA notice feature not yet available",
        noticeId: id,
      },
      { status: 501 }
    );
  } catch (error) {
    logger.error("Error in HOA notice:", error);
    return NextResponse.json(
      { error: "Failed to process notice" },
      { status: 500 }
    );
  }
}
