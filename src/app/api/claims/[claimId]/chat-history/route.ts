/**
 * Chat History API — GET /api/claims/[claimId]/chat-history
 *
 * Returns persisted AI chat messages for a specific claim.
 * Powers the ClaimAIAssistant "senior adjuster memory" — conversation
 * persists across page navigations and sessions.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { getRouteParams, withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (_req: Request, { userId: _userId, orgId }, routeContext) => {
  const { claimId } = await getRouteParams<{ claimId: string }>(routeContext);

  try {
    const messages = await prisma.dominusChatMessage.findMany({
      where: {
        claimId,
        orgId,
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    logger.error("[CHAT_HISTORY] Error:", { claimId, error });
    return NextResponse.json({ messages: [] });
  }
});
