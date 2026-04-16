/**
 * POST /api/migrations/acculynx
 *
 * Triggers a CRM migration from AccuLynx into the current user's org.
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
import { runAccuLynxMigration } from "@/lib/migrations/migration-engine";

export const POST = withAdmin(async (req, { userId, orgId, role }) => {
  try {
    // Only ADMIN/OWNER can run migrations (enforced by withAdmin)

    // 2. Parse body
    const body = await req.json().catch(() => ({}));
    const { apiKey, baseUrl, dryRun } = body as {
      apiKey?: string;
      baseUrl?: string;
      dryRun?: boolean;
    };

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Valid AccuLynx API key is required" },
        { status: 400 }
      );
    }

    // 3. Run migration
    logger.debug(`[API] Migration started by ${userId} for org ${orgId} (dryRun=${!!dryRun})`);

    const result = await runAccuLynxMigration({
      orgId,
      userId,
      apiKey,
      baseUrl,
      dryRun: !!dryRun,
    });

    return NextResponse.json({
      ok: result.success,
      migrationId: result.migrationId,
      stats: result.stats,
      errors: result.errors.length > 0 ? result.errors.slice(0, 50) : [], // cap error list
      durationMs: result.durationMs,
    });
  } catch (err) {
    logger.error("[API] /api/migrations/acculynx error:", err);
    return NextResponse.json({ ok: false, error: "Migration failed" }, { status: 500 });
  }
});

/** GET — health check / info */
export async function GET() {
  return NextResponse.json({
    status: "AccuLynx migration endpoint active",
    method: "POST",
    requiredBody: {
      apiKey: "string (required) — AccuLynx API key",
      baseUrl: "string (optional) — custom API base URL",
      dryRun: "boolean (optional) — test connection only",
    },
    requiresRole: "ADMIN",
  });
}
