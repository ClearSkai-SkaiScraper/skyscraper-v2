/**
 * Presence Status API
 * GET  /api/presence/status — get my status
 * PATCH /api/presence/status — update my custom status
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_PRESETS_PRO = [
  { emoji: "🟢", text: "Available for work" },
  { emoji: "🔨", text: "On a job site" },
  { emoji: "📋", text: "Reviewing estimates" },
  { emoji: "🏖️", text: "On vacation" },
  { emoji: "😴", text: "Resting up after a long week" },
  { emoji: "🚫", text: "Not taking new jobs right now" },
  { emoji: "📞", text: "Available by phone only" },
  { emoji: "🕐", text: "Limited availability this week" },
  { emoji: "💪", text: "Ready to work — send me your projects!" },
];

const STATUS_PRESETS_CLIENT = [
  { emoji: "🔍", text: "Actively seeking bids" },
  { emoji: "📋", text: "Looking for claims assistance" },
  { emoji: "✅", text: "Found my pro!" },
  { emoji: "🏠", text: "Preparing for home project" },
  { emoji: "⏳", text: "Waiting on insurance" },
  { emoji: "📝", text: "Reviewing proposals" },
  { emoji: "🎉", text: "Project complete!" },
  { emoji: "👀", text: "Just browsing" },
];

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [member, client] = await Promise.allSettled([
    prisma.tradesCompanyMember.findFirst({
      where: { userId },
      select: { customStatus: true, statusEmoji: true, lastSeenAt: true },
    }),
    prisma.client.findUnique({
      where: { userId },
      select: { customStatus: true, statusEmoji: true, lastActiveAt: true },
    }),
  ]);

  const memberData = member.status === "fulfilled" ? member.value : null;
  const clientData = client.status === "fulfilled" ? client.value : null;

  return NextResponse.json({
    pro: memberData
      ? {
          customStatus: memberData.customStatus,
          statusEmoji: memberData.statusEmoji,
          lastSeenAt: memberData.lastSeenAt,
        }
      : null,
    client: clientData
      ? {
          customStatus: clientData.customStatus,
          statusEmoji: clientData.statusEmoji,
          lastActiveAt: clientData.lastActiveAt,
        }
      : null,
    presets: {
      pro: STATUS_PRESETS_PRO,
      client: STATUS_PRESETS_CLIENT,
    },
  });
}

export async function PATCH(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customStatus, statusEmoji, userType } = body;

  // Validate
  if (customStatus && customStatus.length > 100) {
    return NextResponse.json({ error: "Status must be 100 characters or less" }, { status: 400 });
  }

  try {
    if (userType === "client") {
      const updated = await prisma.client.update({
        where: { userId },
        data: {
          customStatus: customStatus ?? null,
          statusEmoji: statusEmoji ?? null,
          lastActiveAt: new Date(),
        },
        select: { customStatus: true, statusEmoji: true },
      });
      return NextResponse.json({ ok: true, ...updated });
    }

    // Default: pro
    const updated = await prisma.tradesCompanyMember.update({
      where: { userId },
      data: {
        customStatus: customStatus ?? null,
        statusEmoji: statusEmoji ?? null,
        lastSeenAt: new Date(),
      },
      select: { customStatus: true, statusEmoji: true },
    });
    return NextResponse.json({ ok: true, ...updated });
  } catch (error) {
    logger.error("[presence/status PATCH]", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
