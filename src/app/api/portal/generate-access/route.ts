export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import { generatePortalToken } from "@/lib/portalAuth";
import prisma from "@/lib/prisma";

const generateAccessSchema = z.object({
  clientId: z.string().min(1, "Missing clientId").max(100),
});

export async function POST(req: Request) {
  try {
    // B-02: Use DB-backed org resolution — never trust client-supplied orgId
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { orgId } = auth;

    const raw = await req.json();
    let parsed: z.infer<typeof generateAccessSchema>;
    try {
      parsed = generateAccessSchema.parse(raw);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.errors[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }
      throw err;
    }

    const { clientId } = parsed;

    // B-02: Verify client belongs to caller's org (cross-tenant fix)
    const client = await prisma.client.findFirst({ where: { id: clientId, orgId } });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const tokenRecord = await generatePortalToken(clientId, orgId);
    return NextResponse.json({ ok: true, token: tokenRecord.token, id: tokenRecord.id });
  } catch (e) {
    logger.error("[portal:generate-access]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
