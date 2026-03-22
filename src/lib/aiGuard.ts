import { logger } from "@/lib/logger";

export async function safeAI(label: string, cb: () => Promise<any>) {
  try {
    const result = await cb();
    return { ok: true, result };
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
