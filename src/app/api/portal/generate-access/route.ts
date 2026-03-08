export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { generatePortalToken } from "@/lib/portalAuth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, orgId: authOrgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { clientId, orgId } = body;
    if (!clientId || !orgId)
      return NextResponse.json({ error: "Missing clientId/orgId" }, { status: 400 });
    if (authOrgId && orgId !== authOrgId)
      return NextResponse.json({ error: "Org mismatch" }, { status: 403 });
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    const tokenRecord = await generatePortalToken(clientId, orgId);
    return NextResponse.json({ ok: true, token: tokenRecord.token, id: tokenRecord.id });
  } catch (e) {
    logger.error("[portal:generate-access]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
