/**
 * Presence Heartbeat API
 * POST /api/presence/heartbeat
 * Called on page load / periodically to update lastSeenAt
 * Also returns the user's current presence state
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // Try pro member first, then client — updateMany avoids RecordNotFound errors
  const [member, client] = await Promise.allSettled([
    prisma.tradesCompanyMember.updateMany({
      where: { userId },
      data: { lastSeenAt: now },
    }),
    prisma.client.updateMany({
      where: { userId },
      data: { lastActiveAt: now },
    }),
  ]);

  const memberData =
    member.status === "fulfilled" && member.value.count > 0
      ? { updated: true, lastSeenAt: now }
      : null;
  const clientData =
    client.status === "fulfilled" && client.value.count > 0
      ? { updated: true, lastActiveAt: now }
      : null;

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    pro: memberData,
    client: clientData,
  });
}
