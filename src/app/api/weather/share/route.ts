export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { userId } = auth;

    const { reportId } = await req.json();

    if (!reportId) {
      return NextResponse.json({ error: "reportId required" }, { status: 400 });
    }

    // Verify user owns this report (createdById maps to internal user ID)
    // First get internal user ID
    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const report = await prisma.weather_reports.findFirst({
      where: { id: reportId, createdById: user.id },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const token = randomUUID();

    // Update the weather report with share token
    // Note: You may need to add shareToken field to WeatherReport model
    await prisma.weather_reports.update({
      where: { id: reportId },
      data: {
        // shareToken: token, // Uncomment when field is added to schema
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const shareUrl = `${baseUrl}/share/weather/${token}`;

    return NextResponse.json({
      success: true,
      url: shareUrl,
      token,
    });
  } catch (err) {
    logger.error("WEATHER SHARE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create share link" },
      { status: 500 }
    );
  }
}
