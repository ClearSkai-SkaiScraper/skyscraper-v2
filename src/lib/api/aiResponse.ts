// Unified AI response envelope helpers
export type AiMetrics = {
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
  durationMs?: number;
  estimatedCostUsd?: number;
};

export type AiSuccess<T> = {
  ok: true;
  data: T;
  metrics?: AiMetrics;
};

export type AiError = {
  ok: false;
  error: {
    message: string;
    code?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details?: any;
  };
  metrics?: AiMetrics;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AiResponse<T = any> = AiSuccess<T> | AiError;

export function aiOk<T>(data: T, metrics?: AiMetrics): AiSuccess<T> {
  return { ok: true, data, metrics };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function aiFail(message: string, code?: string, details?: any, metrics?: AiMetrics): AiError {
  return { ok: false, error: { message, code, details }, metrics };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function classifyOpenAiError(err: any): { message: string; code?: string } {
  const raw = err?.message ?? String(err);
  const lower = raw.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("429")) {
    return { message: "Rate limited by AI provider. Please retry shortly.", code: "RATE_LIMIT" };
  }
  if (lower.includes("timeout") || lower.includes("etimedout")) {
    return { message: "AI request timed out. Please retry.", code: "TIMEOUT" };
  }
  if (lower.includes("insufficient_quota") || lower.includes("quota")) {
    return { message: "AI quota exhausted. Contact support.", code: "QUOTA" };
  }
  return { message: raw, code: "UNKNOWN" };
}

// ---------------------------------------------------------------------------
// TOKEN & COST ESTIMATION HELPERS (heuristic fallback when API usage missing)
// ---------------------------------------------------------------------------

/**
 * Rough token estimation from text length (4 chars per token heuristic).
 */
export function estimateTokens(text: string | undefined | null): number | undefined {
  if (!text) return undefined;
  const len = text.length;
  if (len === 0) return 0;
  return Math.max(1, Math.round(len / 4));
}

/**
 * Estimate cost using simple model pricing map when usage not supplied.
 * Pricing (approx Nov 2025):
 *  gpt-4o-mini: $0.15 / 1M input, $0.60 / 1M output
 *  gpt-4o:      $5.00 / 1M input, $15.00 / 1M output
 */
export function estimateCostUsd(model: string | undefined, tokensIn?: number, tokensOut?: number): number | undefined {
  if (!model) return undefined;
  const pricing: Record<string, { in: number; out: number }> = {
    "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.60 / 1_000_000 },
    "gpt-4o": { in: 5.0 / 1_000_000, out: 15.0 / 1_000_000 }
  };
  const p = pricing[model];
  if (!p) return undefined;
  const ti = tokensIn ?? 0;
  const to = tokensOut ?? 0;
  return +(ti * p.in + to * p.out).toFixed(6);
}
