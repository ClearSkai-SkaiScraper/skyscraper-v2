export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// API: DECLINE REPORT (PUBLIC)
// =====================================================
// POST /api/public/reports/[id]/decline
// Client decline endpoint (no auth required, uses token)
// =====================================================

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { token, reason } = body as { token?: string; reason?: string };

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Find report by ID
    // NOTE: Add clientToken validation when Prisma schema is updated
    const report = await prisma.ai_reports.findUnique({
      where: { id: params.id },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // NOTE: Update status to 'declined' when Prisma schema supports it
    // For now, just acknowledge the decline
    logger.debug(`Report ${report.id} declined by client. Reason:`, reason);

    return NextResponse.json({
      ok: true,
      description: "Report declined",
    });
  } catch (error) {
    logger.error("Decline report error:", error);
    return NextResponse.json(
      { error: "Decline failed" },
      { status: 500 }
    );
  }
}
