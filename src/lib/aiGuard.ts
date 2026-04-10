import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function safeAI(label: string, cb: () => Promise<any>) {
  try {
    const result = await cb();
    return { ok: true, result };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    logger.error(`❌ OpenAI failure [${label}]: ${err?.message || err}`);

    return {
      ok: false,
      result: null,
      error: `AI service unavailable: ${label}`,
      status: 503,
    };
  }
}
