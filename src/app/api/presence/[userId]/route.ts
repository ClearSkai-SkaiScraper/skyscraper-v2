/**
 * Presence Lookup API
 * GET /api/presence/[userId] — get another user's presence + status
 * Works for both pro and client users
 */

import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Compute presence tier from lastSeenAt timestamp:
 *   1. "online"      — within last 5 minutes
 *   2. "recently"    — within last 24 hours
 *   3. "away"        — within last 7 days
 *   4. "offline"     — more than 7 days
 *   5. "unknown"     — no lastSeenAt data
 */
function computePresence(lastSeen: Date | null): {
  presence: "online" | "recently" | "away" | "offline" | "unknown";
  label: string;
  color: string;
} {
  if (!lastSeen) {
    return { presence: "unknown", label: "No activity yet", color: "gray" };
  }

  const now = Date.now();
  const diff = now - new Date(lastSeen).getTime();
  const minutes = diff / 60_000;
  const hours = diff / 3_600_000;
  const days = diff / 86_400_000;

  if (minutes < 5) {
    return { presence: "online", label: "Online now", color: "green" };
  }
  if (hours < 1) {
    return { presence: "recently", label: `Active ${Math.round(minutes)}m ago`, color: "green" };
  }
  if (hours < 24) {
    return {
      presence: "recently",
      label: `Active ${Math.round(hours)}h ago`,
      color: "yellow",
    };
  }
  if (days < 7) {
    const d = Math.round(days);
    return {
      presence: "away",
      label: `Offline for ${d} day${d > 1 ? "s" : ""}`,
      color: "gray",
    };
  }

  return {
    presence: "offline",
    label: "Been away for a while — looking to get back at it!",
    color: "gray",
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req, { userId: callerUserId, orgId }, routeParams) => {
  try {
    const { userId: targetUserId } = await routeParams.params;
    logger.info("[PRESENCE_LOOKUP]", { callerUserId, targetUserId });

    // Parallel lookup: pro member + client
    const [member, client] = await Promise.allSettled([
      prisma.tradesCompanyMember.findFirst({
        where: { userId: targetUserId },
        select: {
          firstName: true,
          lastName: true,
          avatar: true,
          customStatus: true,
          statusEmoji: true,
          lastSeenAt: true,
          companyName: true,
        },
      }),
      prisma.client.findUnique({
        where: { userId: targetUserId },
        select: {
          firstName: true,
          lastName: true,
          avatarUrl: true,
          customStatus: true,
          statusEmoji: true,
          lastActiveAt: true,
          category: true,
        },
      }),
    ]);

    const memberData = member.status === "fulfilled" ? member.value : null;
    const clientData = client.status === "fulfilled" ? client.value : null;

    if (!memberData && !clientData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prefer pro data if both exist
    const lastSeen = memberData?.lastSeenAt || clientData?.lastActiveAt || null;
    const presence = computePresence(lastSeen);

    return NextResponse.json({
      userId: targetUserId,
      userType: memberData ? "pro" : "client",
      name: memberData
        ? `${memberData.firstName || ""} ${memberData.lastName || ""}`.trim()
        : `${clientData?.firstName || ""} ${clientData?.lastName || ""}`.trim(),
      avatar: memberData?.avatar || clientData?.avatarUrl || null,
      companyName: memberData?.companyName || null,
      category: clientData?.category || null,
      customStatus: memberData?.customStatus || clientData?.customStatus || null,
      statusEmoji: memberData?.statusEmoji || clientData?.statusEmoji || null,
      ...presence,
      lastSeenAt: lastSeen,
    });
  } catch (error) {
    logger.error("[PRESENCE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
