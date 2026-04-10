import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logger.warn(`[telemetry] ${label} failed`, error);
    return null;
  }
}

export async function emitEvent(params: {
  orgId?: string | null;
  clerkUserId: string;
  kind: string;
  refType?: string;
  refId?: string;
  title: string;
  meta?: JsonValue;
}) {
  const { orgId, clerkUserId, kind, refType, refId, title, meta } = params;

  // Use raw SQL for telemetry_events (not in Prisma schema).
  // Keep this non-throwing so telemetry cannot break core flows.
  await safe("telemetry_events.insert", async () =>
    db.query(
      `INSERT INTO telemetry_events (org_id, user_id, kind, ref_type, ref_id, title, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        orgId ?? null,
        clerkUserId,
        kind,
        refType ?? null,
        refId ?? null,
        title,
        JSON.stringify(meta ?? {}),
      ]
    )
  );
}

export async function pushNotification(params: {
  orgId?: string | null;
  clerkUserId?: string | null; // null = broadcast to org
  level?: "info" | "success" | "warning" | "error";
  title: string;
  body?: string;
  link?: string;
}) {
  const { orgId, clerkUserId, level = "info", title, body, link } = params;
  await db.query(
    `insert into notifications (org_id, clerk_userId, level, title, body, link)
     values ($1,$2,$3,$4,$5,$6)`,
    [orgId ?? null, clerkUserId ?? null, level, title, body ?? null, link ?? null]
  );
}

export async function recordToolRun(params: {
  orgId?: string | null;
  clerkUserId: string;
  tool: string;
  status?: "success" | "error";
  tokensUsed?: number;
  input?: JsonValue;
  output?: JsonValue;
}) {
  const { orgId, clerkUserId, tool, status = "success", tokensUsed = 0, input, output } = params;
  await db.query(
    `insert into tool_runs (org_id, clerk_userId, tool, status, tokens_used, input, output)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      orgId ?? null,
      clerkUserId,
      tool,
      status,
      tokensUsed,
      JSON.stringify(input ?? {}),
      JSON.stringify(output ?? {}),
    ]
  );
}

export async function recordJobRun(params: {
  orgId?: string | null;
  queue?: string | null;
  jobName: string;
  status?: string;
  success: boolean;
  attempts?: number;
  durationMs?: number | null;
  errorMessage?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  meta?: JsonValue;
}) {
  const {
    orgId,
    queue,
    jobName,
    status = "completed",
    success,
    attempts = 1,
    durationMs,
    errorMessage,
    startedAt,
    finishedAt,
    meta,
  } = params;

  await safe("job_runs.insert", async () =>
    db.query(
      `INSERT INTO job_runs (org_id, queue, job_name, status, success, attempts, duration_ms, error_message, started_at, finished_at, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        orgId ?? null,
        queue ?? null,
        jobName,
        status,
        success,
        attempts,
        durationMs ?? null,
        errorMessage ?? null,
        startedAt ?? null,
        finishedAt ?? null,
        JSON.stringify(meta ?? {}),
      ]
    )
  );
}

export async function startJobRun(params: {
  orgId?: string | null;
  queue?: string | null;
  jobName: string;
  meta?: JsonValue;
  startedAt?: Date;
}): Promise<string | null> {
  const { orgId, queue, jobName, meta, startedAt } = params;

  const result = await safe("job_runs.start", async () =>
    db.query(
      `INSERT INTO job_runs (org_id, queue, job_name, status, success, attempts, started_at, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        orgId ?? null,
        queue ?? null,
        jobName,
        "running",
        true,
        1,
        startedAt ?? new Date(),
        JSON.stringify(meta ?? {}),
      ]
    )
  );

  return result?.rows?.[0]?.id ?? null;
}

export async function finishJobRun(params: {
  id: string;
  status: "completed" | "failed";
  success: boolean;
  durationMs?: number | null;
  errorMessage?: string | null;
  finishedAt?: Date;
  meta?: JsonValue;
}): Promise<void> {
  const { id, status, success, durationMs, errorMessage, finishedAt, meta } = params;

  await safe("job_runs.finish", async () =>
    db.query(
      `UPDATE job_runs
       SET status = $1, success = $2, duration_ms = $3, error_message = $4, finished_at = $5, meta = $6
       WHERE id = $7`,
      [
        status,
        success,
        durationMs ?? null,
        errorMessage ?? null,
        finishedAt ?? new Date(),
        JSON.stringify(meta ?? {}),
        id,
      ]
    )
  );
}

export async function recordCacheStat(params: {
  orgId?: string | null;
  cacheName: string;
  op: string;
  hit?: boolean | null;
  key?: string | null;
  ttlSeconds?: number | null;
  durationMs?: number | null;
  meta?: JsonValue;
}) {
  const { orgId, cacheName, op, hit, key, ttlSeconds, durationMs, meta } = params;

  await safe("cache_stats.insert", async () =>
    db.query(
      `INSERT INTO cache_stats (org_id, cache_name, op, hit, key, ttl_seconds, duration_ms, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        orgId ?? null,
        cacheName,
        op,
        hit ?? null,
        key ?? null,
        ttlSeconds ?? null,
        durationMs ?? null,
        JSON.stringify(meta ?? {}),
      ]
    )
  );
}
