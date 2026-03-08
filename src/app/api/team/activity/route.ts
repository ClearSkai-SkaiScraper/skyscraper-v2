export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { getTenant } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";

// Cache activity logs for 30 seconds
export const revalidate = 30;

// Use activities model directly
const Activity = prisma.activities;

export async function GET(request: Request) {
  try {
    const orgId = await getTenant();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const activities = Activity
      ? await Activity.findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            userId: true,
            userName: true,
            metadata: true,
            createdAt: true,
          },
        }).catch(() => [])
      : [];

    return NextResponse.json(activities);
  } catch (error) {
    logger.error("Failed to fetch activity logs:", error);
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}

// Create new activity log
export async function POST(request: Request) {
  try {
    const orgId = await getTenant();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, description, userId, metadata } = body;

    if (!Activity) {
      return NextResponse.json({ error: "Activity model unavailable" }, { status: 200 });
    }

    const activity = await Activity.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        userId: userId || "system",
        userName: "System",
        type: action,
        title: action,
        description,
        metadata: metadata || {},
        updatedAt: new Date(),
      },
    }).catch(() => null);

    if (!activity) {
      return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    logger.error("Failed to create activity log:", error);
    return NextResponse.json({ error: "Failed to create activity log" }, { status: 500 });
  }
}
