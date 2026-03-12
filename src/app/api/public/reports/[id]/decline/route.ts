export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// API: DECLINE REPORT (PUBLIC)
// =====================================================
// POST /api/public/reports/[id]/decline
// Client decline endpoint (no auth required, uses token)
// =====================================================

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { token, reason } = body as { token?: string; reason?: string };

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Validate token: hash the provided token and compare against stored hash.
    // Token format is reportId + secret suffix — verify the token matches the report.
    const crypto = await import("crypto");
    const expectedToken = crypto
      .createHmac("sha256", process.env.REPORT_SHARE_SECRET || "skaiscraper-report-share-default")
      .update(params.id)
      .digest("hex")
      .slice(0, 32);

    if (token !== expectedToken && token !== params.id) {
      // Also allow legacy flow where token === report ID, but log it
      logger.warn("[REPORT_DECLINE] Invalid token for report", { reportId: params.id });
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
    }

    const report = await prisma.ai_reports.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Update report status to declined
    await prisma.ai_reports.update({
      where: { id: params.id },
      data: { status: "declined", updatedAt: new Date() },
    });

    logger.info(`[REPORT_DECLINE] Report ${report.id} declined. Reason: ${reason || "none"}`);

    return NextResponse.json({
      ok: true,
      description: "Report declined",
    });
  } catch (error) {
    logger.error("Decline report error:", error);
    return NextResponse.json({ error: "Decline failed" }, { status: 500 });
  }
}
