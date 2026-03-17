/**
 * Get client from authenticated user
 *
 * Supports both self-service clients (userId-based) and legacy org-managed clients (email-based)
 */

import { auth, currentUser } from "@clerk/nextjs/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function getClientFromAuth() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }

    const user = await currentUser();
    if (!user) {
      return null;
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
      return null;
    }

    // Find client by userId (self-service) OR by email (legacy)
    const client = await prisma.client.findFirst({
      where: {
        OR: [{ userId }, { email }],
      },
    });

    if (!client) {
      return null;
    }

    // Only fetch org if client has a real orgId (not self-service placeholder)
    let org: any = null;
    if (client.orgId && client.orgId !== "self-service-clients") {
      try {
        org = await prisma.org.findUnique({
          where: { id: client.orgId },
          select: { id: true, name: true, brandLogoUrl: true },
        });
      } catch (error) {
        logger.debug("[getClientFromAuth] Org fetch failed (non-critical):", error);
      }
    }

    return { ...client, org } as any;
  } catch (error) {
    logger.error("[getClientFromAuth] Error:", error);
    return null;
  }
}
