export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth/requireAuth";

const ShareCreateSchema = z.object({
  resourceType: z.enum(["report", "export"]),
  resourceId: z.string().min(1),
  expiresInDays: z.number().int().min(1).max(365).default(7),
});

/**
 * Body: { resourceType: "report"|"export", resourceId: string, expiresInDays?: number }
 * Returns: { url: string, token: string, expiresAt: string }
 *
 * Note: share_tokens model not yet implemented in schema.
 * This endpoint creates ephemeral share links without persistence.
 */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = ShareCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { resourceType, resourceId, expiresInDays } = parsed.data;

  // Generate ephemeral token (not persisted - share_tokens model not in schema)
  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const base = (
    // eslint-disable-next-line no-restricted-syntax
    process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_URL ?? "localhost:3000"}`
  ).replace(/\/$/, "");

  return NextResponse.json({
    token,
    url: `${base}/share/${token}`,
    expiresAt: expiresAt.toISOString(),
  });
}
