export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import crypto from "crypto";
import { NextResponse } from "next/server";

import { getDelegate } from "@/lib/db/modelAliases";
import { checkRateLimit } from "@/lib/ratelimit";
import { safeOrgContext } from "@/lib/safeOrgContext";

// Get all webhooks for the organization
export async function GET() {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }
    const { orgId } = ctx;

    const webhooks = await getDelegate("webhooks").findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        createdAt: true,
        lastTriggeredAt: true,
        failureCount: true,
      },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    logger.error("Failed to fetch webhooks:", error);
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }
}

// Create a new webhook
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rl = await checkRateLimit(`webhook-manage:${ip}`, "WEBHOOK");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded", reset: rl.reset }, { status: 429 });
  }
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.userId || !ctx.orgId) {
      return NextResponse.json({ error: ctx.reason || "Unauthorized" }, { status: 401 });
    }
    const { userId, orgId } = ctx;

    const body = await request.json();
    const { url, events, description } = body;

    if (!url || !events || events.length === 0) {
      return NextResponse.json({ error: "URL and events are required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Generate webhook secret
    const secret = generateWebhookSecret();

    const webhook = await getDelegate("webhooks").create({
      data: {
        orgId,
        url,
        events,
        secret,
        description: description || null,
        status: "active",
        createdBy: userId,
      },
    });

    return NextResponse.json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret, // Only shown once on creation
      status: webhook.status,
    });
  } catch (error) {
    logger.error("Failed to create webhook:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}

// Generate secure webhook secret
function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}
