import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const REQUIRED_FIELDS = ["name", "email", "message"] as const;
const MAX_FIELD_LENGTH = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // Rate limit: 5 requests/min per IP to prevent spam
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rl = await checkRateLimit(`contact:${ip}`, "PUBLIC");
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();

    // Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
        return NextResponse.json(
          { ok: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
      if (body[field].length > MAX_FIELD_LENGTH) {
        return NextResponse.json(
          { ok: false, error: `Field ${field} exceeds maximum length` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    if (!EMAIL_REGEX.test(body.email)) {
      return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 });
    }

    // Sanitize and log the submission (persisted via observability pipeline)
    const submission = {
      name: body.name.trim().slice(0, 200),
      email: body.email.trim().toLowerCase().slice(0, 200),
      company: body.company?.trim()?.slice(0, 200) || null,
      phone: body.phone?.trim()?.slice(0, 30) || null,
      message: body.message.trim().slice(0, MAX_FIELD_LENGTH),
      source: body.source?.trim()?.slice(0, 100) || "website",
      submittedAt: new Date().toISOString(),
      ip,
    };

    logger.info("[Contact Form] New submission", {
      name: submission.name,
      email: submission.email,
      company: submission.company,
      source: submission.source,
    });

    return NextResponse.json({
      ok: true,
      message: "Thank you for reaching out! We'll get back to you within 24 hours.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}
