// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find client record
    let clientId: string | null = null;
    try {
      const client = await prisma.client.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      clientId = client?.id ?? null;
    } catch {}

    const userId = user.id;
    const userEmail = user.emailAddresses?.[0]?.emailAddress;

    const [activeProjects, savedContractors, claims, messages] = await Promise.all([
      // Active work requests
      clientId
        ? prisma.clientWorkRequest.count({ where: { clientId } }).catch(() => 0)
        : Promise.resolve(0),

      // Saved contractors
      clientId
        ? prisma.clientSavedPro.count({ where: { clientId } }).catch(() => 0)
        : Promise.resolve(0),

      // Claims (by email or clientId)
      userEmail
        ? prisma.claims
            .count({
              where: {
                OR: [{ homeownerEmail: userEmail }, ...(clientId ? [{ clientId }] : [])],
              },
            })
            .catch(() => 0)
        : Promise.resolve(0),

      // Message threads
      prisma.messageThread
        .count({
          where: { participants: { has: userId } },
        })
        .catch(() => 0),
    ]);

    return NextResponse.json({
      activeProjects,
      savedContractors,
      claims,
      messages,
    });
  } catch (error) {
    logger.error("[API/portal/stats] Error:", error);
    return NextResponse.json(
      { activeProjects: 0, savedContractors: 0, claims: 0, messages: 0 },
      { status: 200 }
    );
  }
}
