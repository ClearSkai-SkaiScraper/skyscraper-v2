export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    const data = await req.json();
    const { firstName, lastName, email, name } = data;

    // Support both name or firstName/lastName
    const displayName = name || `${firstName || ""} ${lastName || ""}`.trim();

    if (!displayName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate unique slug
    const slug = `client-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const client = await prisma.client.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        slug,
        name: displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        phone: data.phone || null,
        category: data.category || "Homeowner",
      },
    });
    return NextResponse.json({ ok: true, client });
  } catch (e: unknown) {
    logger.error("[clients:create]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
});
