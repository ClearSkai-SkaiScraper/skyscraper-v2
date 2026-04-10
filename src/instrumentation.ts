/**
 * ✅ UNIFIED Next.js Instrumentation Hook (Server & Edge)
 * Consolidates: Node version checks + build-phase fetch guards + Sentry init
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  const hasProcess = typeof process !== "undefined";

  // ═══════════════════════════════════════════════════════════════════════
  // 1. Node Version Advisory (Non-blocking)
  // ═══════════════════════════════════════════════════════════════════════
  try {
    if (!hasProcess) return;
    const v = process.version;
    const major = parseInt(v.replace(/^v/, "").split(".")[0], 10);
    if (major < 22) {
      console.warn(`[runtime] Recommended Node >=22, detected Node ${v}. Non-blocking warning.`);
    }
  } catch {}

  // ═══════════════════════════════════════════════════════════════════════
  // 2. Build-Phase External Fetch Guard (Reduces ECONNRESET noise)
  // ═══════════════════════════════════════════════════════════════════════
  // eslint-disable-next-line no-restricted-syntax
  if (hasProcess && process.env.BUILD_PHASE) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        const isExternal =
          // eslint-disable-next-line no-restricted-syntax
          /^https?:\/\//.test(url) && !url.includes(process.env.VERCEL_URL || "localhost");
        if (isExternal) {
          return new Response(JSON.stringify({ ok: true, buildPhaseStub: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, buildPhaseError: String(e) }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Environment Variable Validation (fail-fast in production)
  // ═══════════════════════════════════════════════════════════════════════
  // eslint-disable-next-line no-restricted-syntax
  if (hasProcess && !process.env.BUILD_PHASE) {
    try {
      const { assertRequiredEnv } = await import("@/lib/validateEnv");
      assertRequiredEnv();
    } catch (err) {
      // In production, this is fatal — surface clearly
      // eslint-disable-next-line no-restricted-syntax
      if (process.env.NODE_ENV === "production") {
        console.error("❌ Environment validation failed:", err);
        throw err;
      }
      // In dev/preview, warn but continue
      console.warn("⚠️  Environment validation warning:", (err as Error)?.message ?? err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Sentry Initialization (Server & Edge Runtime Dispatch)
  // ═══════════════════════════════════════════════════════════════════════
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 5. Automatic Server Error Capture (requires @sentry/nextjs >= 8.28.0)
// ═══════════════════════════════════════════════════════════════════════
import * as Sentry from "@sentry/nextjs";
export const onRequestError = Sentry.captureRequestError;
