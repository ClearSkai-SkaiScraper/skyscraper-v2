import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Rate limit: 5 requests/min per IP to prevent spam
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rl = await checkRateLimit(`contact:${ip}`, "PUBLIC");
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    logger.debug("Contact submission", body); // placeholder logging
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 400 });
  }
}
