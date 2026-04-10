import { finishJobRun, startJobRun } from "@/lib/telemetry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonValue = any;

export async function runJob<T>(params: {
  orgId?: string | null;
  queue?: string | null;
  jobName: string;
  meta?: JsonValue;
  fn: () => Promise<T>;
}): Promise<T> {
  const { orgId, queue, jobName, meta, fn } = params;

  const startedAt = new Date();
  const startedAtMs = Date.now();

  const id = await startJobRun({
    orgId: orgId ?? null,
    queue: queue ?? null,
    jobName,
    meta: meta ?? {},
    startedAt,
  });

  try {
    const result = await fn();

    if (id) {
      await finishJobRun({
        id,
        status: "completed",
        success: true,
        durationMs: Date.now() - startedAtMs,
        finishedAt: new Date(),
        meta: meta ?? {},
      });
    }

    return result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (id) {
      await finishJobRun({
        id,
        status: "failed",
        success: false,
        durationMs: Date.now() - startedAtMs,
        errorMessage: String(error?.message || error),
        finishedAt: new Date(),
        meta: {
          ...(meta ?? {}),
          error: String(error?.message || error),
        },
      });
    }

    throw error;
  }
}
