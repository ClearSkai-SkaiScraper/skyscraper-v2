import crypto from "crypto";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function issueToken(orgId: string, scopes: string[]) {
  const raw = "pt_" + crypto.randomBytes(24).toString("hex");
  const token_hash = hashToken(raw);
  await prisma.$executeRaw`INSERT INTO app.api_tokens (org_id, token_hash, scopes) VALUES (${orgId}, ${token_hash}, ${scopes})`;
  return raw;
}

export async function validateToken(raw: string, requiredScopes: string[]) {
  const token_hash = hashToken(raw);
  // 🔒 SECURITY FIX: Use $queryRaw tagged template instead of $queryRawUnsafe
  const rows: any[] = await prisma.$queryRaw(
    Prisma.sql`SELECT id, org_id, scopes FROM app.api_tokens WHERE token_hash = ${token_hash} LIMIT 1`
  );
  const token = rows[0];
  if (!token) return null;
  if (!requiredScopes.every((s) => token.scopes.includes(s))) return null;
  await prisma.$executeRaw(
    Prisma.sql`UPDATE app.api_tokens SET last_used_at = NOW() WHERE id = ${token.id}::uuid`
  );
  return token.org_id as string;
}

export interface ApiTokenRow {
  id: string;
  org_id: string | null;
  scopes: string[];
}

// Fetch token row if valid and update last_used_at; returns null if invalid/missing required scopes
export async function getApiToken(
  raw: string,
  requiredScopes: string[] = []
): Promise<ApiTokenRow | null> {
  const token_hash = hashToken(raw);
  const rows: any[] =
    await prisma.$queryRaw`SELECT id, org_id, scopes FROM app.api_tokens WHERE token_hash = ${token_hash} LIMIT 1`;
  const token = rows[0];
  if (!token) return null;
  if (!requiredScopes.every((s) => token.scopes.includes(s))) return null;
  await prisma.$executeRaw`UPDATE app.api_tokens SET last_used_at = NOW() WHERE id = ${token.id}::uuid`;
  return token as ApiTokenRow;
}

// Convenience helper for API routes: returns organization id if valid or null.
export async function authenticateApiKey(request: Request, scopes: string[]) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return null;
  return await validateToken(apiKey, scopes);
}
