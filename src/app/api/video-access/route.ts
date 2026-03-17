/**
 * 🔥 PHASE 31: VIDEO ACCESS API
 *
 * GET /api/video-access
 * Returns video access status for current Org
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { canUseRealVideo, getVideoAccessMessage } from "@/lib/video/access";

export async function GET() {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Org = await prisma.org.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        videoEnabled: true,
        videoPlanTier: true,
      },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const hasRealVideo = canUseRealVideo(Org.videoPlanTier);

    const message = getVideoAccessMessage(Org.videoPlanTier);

    return NextResponse.json({
      hasRealVideo,
      message,
      videoEnabled: Org.videoEnabled,
      videoPlanTier: Org.videoPlanTier,
    });
  } catch (error) {
    logger.error("[Video Access API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
