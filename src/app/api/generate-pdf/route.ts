export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@clerk/nextjs/server";

import { makePdfContent } from "@/lib/ai";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return new Response(JSON.stringify({ error: "Unauthenticated" }), {
      status: 401,
    });
  const body = await req.json().catch(() => ({}));
  const prompt =
    body?.prompt ??
    "Generate a one-page roof inspection summary for a shingle roof in Prescott, AZ.";

  try {
    const content = await makePdfContent(prompt);
    return new Response(JSON.stringify({ data: { type: "pdf-text", content } }), { status: 200 });
  } catch (error) {
    logger.error("[GENERATE-PDF] Error:", error);
    return new Response(JSON.stringify({ error: "PDF generation failed" }), { status: 500 });
  }
}
