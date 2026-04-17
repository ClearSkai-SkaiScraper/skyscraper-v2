/**
 * POST /api/migrations/jobnimbus
 *
 * Triggers a CRM migration from JobNimbus into the current user's org.
 *
 * Body:
 *   { apiKey: string, baseUrl?: string, dryRun?: boolean }
 *
 * Security:
 *   - Requires authenticated user with ADMIN role
 *   - API key is NOT stored — used in-memory for the migration only
 *   - Migration is logged for audit trail
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { withAdmin } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { JobNimbusMigrationEngine } from "@/lib/migrations/jobnimbus-engine";

export const POST = withAdmin(async (req, { userId, orgId, role: _role }) => {
  try {
    // Only ADMIN/OWNER can run migrations (enforced by withAdmin)

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { apiKey, baseUrl, dryRun } = body as {
      apiKey?: string;
      baseUrl?: string;
      dryRun?: boolean;
    };

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Valid JobNimbus API key is required" },
        { status: 400 }
      );
    }

    // 3. Run migration
    logger.info(
      `[API] JobNimbus migration started by ${userId} for org ${orgId} (dryRun=${!!dryRun})`
    );

    const engine = new JobNimbusMigrationEngine({
      orgId,
      userId,
      source: "JOBNIMBUS",
      credentials: { apiKey },
      options: { dryRun: !!dryRun },
    });

    const result = await engine.run();

    return NextResponse.json({
      ok: result.success,
      migrationId: result.jobId,
      stats: result.stats,
      errors: result.errors?.slice(0, 50) ?? [],
      durationMs: result.duration,
    });
  } catch (err) {
    logger.error("[API] /api/migrations/jobnimbus error:", err);
    return NextResponse.json({ ok: false, error: "Migration failed" }, { status: 500 });
  }
});

/** GET — health check / info */
export async function GET() {
  return NextResponse.json({
    status: "JobNimbus migration endpoint active",
    method: "POST",
    requiredBody: {
      apiKey: "string (required) — JobNimbus API key",
      baseUrl: "string (optional) — custom API base URL",
      dryRun: "boolean (optional) — test connection only",
    },
    requiresRole: "ADMIN",
  });
}
