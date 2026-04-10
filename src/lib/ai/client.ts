/**
 * 🧠 UNIFIED AI CLIENT
 *
 * Mission 3B: Centralized OpenAI helper with:
 * - Consistent error handling
 * - Structured logging
 * - Timeout management
 * - Model standardization
 * - Token limit enforcement
 *
 * All AI routes should use callOpenAI() for non-streaming requests,
 * or getOpenAI() when direct client access is needed (e.g. streaming).
 *
 * ⚠️  NEVER instantiate `new OpenAI()` outside this file.
 *     Use `import { getOpenAI } from "@/lib/ai/client"` instead.
 */

import OpenAI from "openai";

import { aiCircuitBreaker, CircuitBreakerOpenError } from "@/lib/ai/circuitBreaker";
import { aiCostGuard } from "@/lib/ai/costGuard";
import { logger } from "@/lib/logger";

// ============================================================================
// CLIENT INITIALIZATION (Lazy Singleton)
// ============================================================================

let _client: OpenAI | null = null;

/**
 * Returns the shared OpenAI client instance.
 * Creates it lazily on first call — no cold-start penalty at module load.
 *
 * @throws Error if OPENAI_API_KEY is not set at runtime
 */
export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // During build time (no runtime context), return a dummy client
      // This only affects static analysis — runtime calls will fail properly
      if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
        throw new Error("[AI] OPENAI_API_KEY environment variable is required");
      }
      // In production/build, create a placeholder that will fail at runtime
      _client = new OpenAI({ apiKey: "sk-placeholder" });
    } else {
      _client = new OpenAI({ apiKey });
    }
  }
  return _client;
}

/** @deprecated Use `getOpenAI()` instead. Will be removed in v3. */
export const ensureOpenAI = getOpenAI;

// ============================================================================
// CONFIGURATION DEFAULTS
// ============================================================================

const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

// ============================================================================
// TYPES
// ============================================================================

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type AiCallOptions<T = unknown> = {
  /** OpenAI model to use. Defaults to gpt-4o-mini or OPENAI_DEFAULT_MODEL env var */
  model?: string;

  /** System message to prepend (optional) */
  system?: string;

  /** Conversation messages */
  messages: AIMessage[];

  /** Maximum tokens for completion. Default: 1200 */
  maxTokens?: number;

  /** Temperature (0-2). Default: 0.2 for deterministic outputs */
  temperature?: number;

  /** Tag for logging/debugging (e.g. "claim_prediction", "dispute_generation") */
  tag?: string;

  /** Request timeout in milliseconds. Default: 30000ms */
  timeoutMs?: number;

  /** If true, parse response as JSON and return typed object. If false, return raw string */
  parseJson?: boolean;

  /** Additional context for error logging (e.g. claimId, userId) */
  context?: Record<string, any>;

  /** Organization ID — when provided, enforces per-org daily token budget */
  orgId?: string;
};

export type AiCallResult<T> =
  | {
      success: true;
      data: T;
      raw: string;
      model: string;
      tokensUsed?: number;
    }
  | {
      success: false;
      error: string;
      code: "TIMEOUT" | "PARSE_ERROR" | "API_ERROR" | "CONFIG_ERROR";
      raw?: string;
    };

// ============================================================================
// MAIN HELPER: callOpenAI()
// ============================================================================

/**
 * Unified OpenAI completion helper.
 *
 * @example
 * ```ts
 * const result = await callOpenAI<PredictionResponse>({
 *   tag: "claim_prediction",
 *   system: "You are an expert claims analyst...",
 *   messages: [{ role: "user", content: "Predict outcome for claim..." }],
 *   parseJson: true,
 *   context: { claimId: "abc123" }
 * });
 *
 * if (result.success) {
 *   console.log(result.data); // Typed as PredictionResponse
 * } else {
 *   console.error(result.error, result.code);
 * }
 * ```
 */
export async function callOpenAI<T = unknown>(opts: AiCallOptions<T>): Promise<AiCallResult<T>> {
  const {
    model = DEFAULT_MODEL,
    system,
    messages,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    tag = "generic",
    timeoutMs = DEFAULT_TIMEOUT_MS,
    parseJson = false,
    context = {},
    orgId,
  } = opts;

  const startTime = Date.now();

  try {
    // Cost guard check — reject if org exceeded daily token budget
    if (orgId) {
      const budget = await aiCostGuard.checkBudget(orgId);
      if (!budget.ok) {
        return {
          success: false,
          error: budget.reason || "AI daily budget exceeded",
          code: "API_ERROR" as const,
        };
      }
    }

    // Circuit breaker check — reject early if OpenAI is down
    try {
      aiCircuitBreaker.guard();
    } catch (cbError) {
      if (cbError instanceof CircuitBreakerOpenError) {
        return {
          success: false,
          error: `AI temporarily unavailable. Retry in ${Math.ceil(cbError.retryAfterMs / 1000)}s.`,
          code: "API_ERROR" as const,
        };
      }
      throw cbError;
    }

    // Get OpenAI client
    const openaiClient = getOpenAI();

    // Build full message array
    const fullMessages: AIMessage[] = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Make API call
      const response = await openaiClient.chat.completions.create(
        {
          model,
          messages: fullMessages,
          max_tokens: maxTokens,
          temperature,
        },
        { signal: controller.signal as any }
      );

      clearTimeout(timeoutId);

      const raw = response.choices[0]?.message?.content ?? "";
      const tokensUsed = response.usage?.total_tokens;

      // Record success with circuit breaker
      aiCircuitBreaker.recordSuccess();

      // Record token usage for cost guardrails
      if (orgId && tokensUsed) {
        aiCostGuard.recordUsage(orgId, tokensUsed).catch(() => {
          // Non-blocking — don't fail the request if Redis is down
        });
      }

      // Log success
      logger.info("[AI_SUCCESS]", {
        tag,
        model,
        tokensUsed,
        duration: Date.now() - startTime,
        ...context,
      });

      // Parse result
      if (parseJson) {
        try {
          const parsed = JSON.parse(raw) as T;
          return {
            success: true,
            data: parsed,
            raw,
            model,
            tokensUsed,
          };
        } catch (parseError) {
          logger.error("[AI_PARSE_ERROR]", {
            tag,
            model,
            raw: raw.substring(0, 200),
            error: parseError,
            ...context,
          });

          return {
            success: false,
            error: "Failed to parse AI response as JSON",
            code: "PARSE_ERROR",
            raw,
          };
        }
      }

      // Return raw string
      return {
        success: true,
        data: raw as T,
        raw,
        model,
        tokensUsed,
      };
    } catch (apiError: any) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (apiError.name === "AbortError" || apiError.code === "ECONNABORTED") {
        aiCircuitBreaker.recordFailure(apiError);
        logger.error("[AI_TIMEOUT]", {
          tag,
          model,
          timeoutMs,
          duration: Date.now() - startTime,
          ...context,
        });

        return {
          success: false,
          error: `AI request timed out after ${timeoutMs}ms`,
          code: "TIMEOUT",
        };
      }

      // Handle API errors
      aiCircuitBreaker.recordFailure(apiError);
      logger.error("[AI_API_ERROR]", {
        tag,
        model,
        error: apiError.message || apiError,
        status: apiError.status,
        duration: Date.now() - startTime,
        ...context,
      });

      return {
        success: false,
        error: apiError.message || "OpenAI API request failed",
        code: "API_ERROR",
      };
    }
  } catch (error: any) {
    // Handle configuration errors
    logger.error("[AI_CONFIG_ERROR]", {
      tag,
      error: error.message || error,
      ...context,
    });

    return {
      success: false,
      error: error.message || "AI client configuration error",
      code: "CONFIG_ERROR",
    };
  }
}

// ============================================================================
// STREAMING HELPER (Placeholder for future)
// ============================================================================

/**
 * TODO: Implement streaming helper for SSE endpoints
 *
 * @example
 * ```ts
 * const stream = await callOpenAIStream({
 *   model: "gpt-4o",
 *   messages: [...],
 *   onChunk: (text) => console.log(text),
 * });
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function callOpenAIStream(opts: any): Promise<any> {
  throw new Error("callOpenAIStream not yet implemented. Use direct OpenAI client for streaming.");
}

// ============================================================================
// UTILITY: Model Selection Helpers
// ============================================================================

export const AIModels = {
  /** Fast, cost-effective model for most tasks */
  MINI: "gpt-4o-mini" as const,

  /** Full GPT-4o for complex reasoning */
  STANDARD: "gpt-4o" as const,

  /** For vision tasks (image analysis) */
  VISION: "gpt-4o" as const,
} as const;

export type AIModel = (typeof AIModels)[keyof typeof AIModels];

// ============================================================================
// UTILITY: Token Limit Presets
// ============================================================================

export const TokenLimits = {
  /** Short responses (summaries, tags, categories) */
  SHORT: 400,

  /** Medium responses (predictions, analysis) */
  MEDIUM: 800,

  /** Standard responses (decision plans, strategies) */
  STANDARD: 1200,

  /** Long responses (dispute letters, reports) */
  LONG: 2000,

  /** Very long responses (comprehensive documents) */
  VERY_LONG: 3000,
} as const;
