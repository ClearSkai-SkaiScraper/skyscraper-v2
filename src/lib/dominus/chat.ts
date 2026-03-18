import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Persist Ask Dominus chat messages via the DominusChatMessage table.
 */

export interface ChatMessageInput {
  userId?: string;
  orgId?: string;
  claimId?: string;
  routeName?: string;
  role: "user" | "assistant";
  content: string;
}

export async function saveChatMessage(data: ChatMessageInput) {
  try {
    await prisma.dominusChatMessage.create({
      data: {
        userId: data.userId ?? null,
        orgId: data.orgId ?? null,
        claimId: data.claimId ?? null,
        routeName: data.routeName ?? null,
        role: data.role,
        content: data.content,
      },
    });
  } catch (err) {
    logger.error("[skai/chat] saveChatMessage failed:", err);
  }
}

export async function getRecentChatHistory(userId: string, limit = 25) {
  try {
    return await prisma.dominusChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (err) {
    logger.error("[skai/chat] getRecentChatHistory failed:", err);
    return [];
  }
}
