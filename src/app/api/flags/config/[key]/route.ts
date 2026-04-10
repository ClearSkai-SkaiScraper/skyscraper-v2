export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withRateLimit } from "@/lib/api/wrappers";
import { getApiToken } from "@/lib/apiTokens";
import { setFlag } from "@/lib/flags";
import { logger } from "@/lib/logger";
import { withSentryApi } from "@/lib/monitoring/sentryApi";
import { requireAdmin } from "@/lib/security/roles";

export const PATCH = withSentryApi(
  withRateLimit(async (req: Request, { params }: { params: { key: string } }) => {
    const body = await req.json();
    // eslint-disable-next-line no-restricted-syntax
    const hasDb = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgres");
    if (!hasDb) {
      return NextResponse.json({
        status: "degraded",
        key: params.key,
        reason: "DATABASE_URL not configured for postgres",
      });
    }
    let orgId: string | null = null;
    // Allow either admin session or API key with write:flags scope.
    try {
      const { orgId: adminOrgId } = await requireAdmin();
      orgId = adminOrgId;
    } catch {
      const apiKey = req.headers.get("x-api-key");
      if (apiKey) {
        const token = await getApiToken(apiKey, ["write:flags"]);
        if (token) orgId = token.org_id;
      }
      if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const enabled = body.enabled === undefined ? true : !!body.enabled;
    const rolloutPercent =
      body.rolloutPercent === undefined
        ? 100
        : Math.max(0, Math.min(100, parseInt(body.rolloutPercent)));
    const targeting = body.targeting || null;
    try {
      logger.info("[FLAGS_CONFIG]", { key: params.key, enabled, orgId, rolloutPercent });
      const saved = await setFlag(params.key, enabled, orgId, rolloutPercent, targeting);
      return NextResponse.json(saved);
    } catch (err) {
      return NextResponse.json({ error: err?.message || "Invalid targeting" }, { status: 400 });
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
);
