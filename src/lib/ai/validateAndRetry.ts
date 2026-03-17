/**
 * AI Validation & Retry
 * Bulletproof AI generation with schema validation and automatic retries
 */

import { ZodSchema } from "zod";

import { logger } from "@/lib/logger";

export interface ValidateAndRetryOptions<T> {
  call: () => Promise<any>;
  schema: ZodSchema<T>;
  retries?: number;
  fallback: T;
  onError?: (error: any, attempt: number) => void;
}

export async function validateAndRetry<T>({
  call,
  schema,
  retries = 2,
  fallback,
  onError,
}: ValidateAndRetryOptions<T>): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const raw = await call();
      const parsed = schema.safeParse(raw);

      if (parsed.success) {
        return parsed.data;
      }

      // Schema validation failed
      console.warn(
        `Validation failed (attempt ${attempt + 1}/${retries + 1}):`,
        parsed.error.issues
      );

      if (onError) {
        onError(parsed.error, attempt);
      }

      // Last attempt - return fallback
      if (attempt === retries) {
        logger.error("All validation attempts failed, using fallback");
        return fallback;
      }
    } catch (error) {
      logger.error(`AI call failed (attempt ${attempt + 1}/${retries + 1}):`, error);

      if (onError) {
        onError(error, attempt);
      }

      // Last attempt - return fallback
      if (attempt === retries) {
        logger.error("All attempts failed, using fallback");
        return fallback;
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return fallback;
}

/**
 * Batch validation for multiple AI calls
 */
export async function validateBatch<T>(
  calls: Array<{
    call: () => Promise<any>;
    schema: ZodSchema<T>;
    fallback: T;
  }>
): Promise<T[]> {
  return Promise.all(
    calls.map(({ call, schema, fallback }) =>
      validateAndRetry({ call, schema, fallback, retries: 1 })
    )
  );
}
