export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get org context
    const orgCtx = await getActiveOrgContext({ required: true });
    if (!orgCtx.ok) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

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
        orgId: orgCtx.orgId,
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
  } catch (e) {
    logger.error("[clients:create]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
