import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/security/roles";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { withRateLimit, withSentryApi } from "@/lib/api/wrappers";
import { getApiToken } from "@/lib/apiTokens";
import { deleteFlag, evaluateFlag, setFlag } from "@/lib/flags";

export const GET = withSentryApi(async (req, { params }: { params: { key: string } }) => {
  try {
    const hasDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres");
    if (!hasDb) {
      return NextResponse.json({
        key: params.key,
        enabled: false,
        userScoped: false,
        status: "degraded",
        reason: "DATABASE_URL not configured for postgres",
      });
    }
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId, orgId: clerkOrgId } = await auth();
    let orgId = clerkOrgId;
    if (!userId) {
      const apiKey = req.headers.get("x-api-key");
      if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const token = await getApiToken(apiKey, ["read:flags"]);
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      orgId = token.org_id;
    }
    const enabled = await evaluateFlag(params.key, orgId, userId || null);
    return NextResponse.json({ key: params.key, enabled, userScoped: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.error("[FLAGS_EVALUATE]", { key: params.key, error: errMsg, stack: errStack });
    return NextResponse.json({ error: "Internal server error", detail: errMsg }, { status: 500 });
  }
});

export const POST = withSentryApi(
  withRateLimit(async (req, { params }: { params: { key: string } }) => {
    const hasDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres");
    if (!hasDb) {
      return NextResponse.json({
        key: params.key,
        status: "degraded",
        reason: "DATABASE_URL not configured for postgres",
      });
    }
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId, orgId: clerkOrgId } = await auth();
    let effectiveOrgId = clerkOrgId;
    if (!userId) {
      const apiKey = req.headers.get("x-api-key");
      if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const token = await getApiToken(apiKey, ["write:flags"]);
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      effectiveOrgId = token.org_id;
    }
    if (!effectiveOrgId)
      return NextResponse.json({ error: "Org context required" }, { status: 400 });
    const body = await req.json();
    const enabled = !!body.enabled;
    const rolloutPercent =
      body.rolloutPercent === undefined
        ? 100
        : Math.max(0, Math.min(100, parseInt(body.rolloutPercent)));
    const targeting = body.targeting || null;
    try {
      await setFlag(params.key, enabled, effectiveOrgId, rolloutPercent, targeting);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Invalid targeting";
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }
    return NextResponse.json({ key: params.key, enabled, rolloutPercent, targeting });
  })
);

export const DELETE = withSentryApi(
  withRateLimit(async (req, { params }: { params: { key: string } }) => {
    const hasDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres");
    if (!hasDb) {
      return NextResponse.json({
        key: params.key,
        status: "degraded",
        reason: "DATABASE_URL not configured for postgres",
      });
    }
    let orgId: string | null = null;
    try {
      const { orgId: adminOrgId } = await requireAdmin();
      orgId = adminOrgId;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unauthorized";
      return NextResponse.json({ error: errMsg }, { status: 401 });
    }
    await deleteFlag(params.key, orgId);
    return NextResponse.json({ key: params.key, deleted: true });
  })
);
