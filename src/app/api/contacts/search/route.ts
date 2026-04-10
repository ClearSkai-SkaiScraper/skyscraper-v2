// src/app/api/contacts/search/route.ts
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/search?q=query - Search contacts by name, email, or phone
 */
export const GET = withOrgScope(async (req, { orgId, userId }) => {
  try {
    const rl = await checkRateLimit(userId, "API");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const searchParams = new URL(req.url).searchParams;
    const query = searchParams.get("q") || "";
    const tag = searchParams.get("tag") || "";

    if (!query.trim() && !tag) {
      return NextResponse.json({ contacts: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { orgId };

    // Filter by tag (e.g. "adjuster")
    if (tag) {
      where.tags = { has: tag };
    }

    // Search by name/email/phone
    if (query.trim()) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ];
    }

    const contacts = await prisma.contacts.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      take: 10,
    });

    return NextResponse.json({
      contacts: contacts.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
      })),
    });
  } catch (error) {
    logger.error("[GET /api/contacts/search] Error:", error);
    return NextResponse.json({ error: "Failed to search contacts" }, { status: 500 });
  }
});
