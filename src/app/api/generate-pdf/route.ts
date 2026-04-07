export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { makePdfContent } from "@/lib/ai";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  const body = await req.json().catch(() => ({}));
  const prompt =
    body?.prompt ??
    "Generate a one-page roof inspection summary for a shingle roof in Prescott, AZ.";

  try {
    const content = await makePdfContent(prompt);
    return NextResponse.json({ data: { type: "pdf-text", content } });
  } catch (error) {
    logger.error("[GENERATE-PDF] Error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
});
