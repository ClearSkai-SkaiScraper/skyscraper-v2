import { logger } from "@/lib/logger";

/**
 * Import Auto-Matcher Stub
 *
 * TODO: Implement field auto-matching for CSV imports
 * This is a placeholder to allow builds to succeed
 */

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  confidence: number;
}

export interface MatchResult {
  mappings: FieldMapping[];
  unmatchedSource: string[];
  unmatchedTarget: string[];
}

/**
 * Auto-match source fields to target schema
 * Stub implementation
 */
export function autoMatchFields(sourceFields: string[], targetSchema: string[]): MatchResult {
  logger.debug("[AutoMatcher] Stub: Would auto-match fields");
  return {
    mappings: [],
    unmatchedSource: sourceFields,
    unmatchedTarget: targetSchema,
  };
}

/**
 * Validate field mapping
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateMapping(mappings: FieldMapping[]): {
  valid: boolean;
  errors: string[];
} {
  return { valid: true, errors: [] };
}

/**
 * Auto-match line items to estimate categories
 */
export function autoMatchLineItems(
  items: Array<{ description: string; code?: string }>,
  categories: string[]
): Array<{ item: any; match: string | null; confidence: number }> {
  logger.debug(
    `[AUTO_MATCHER] Stub: Would auto-match ${items.length} items to ${categories.length} categories`
  );
  return items.map((item) => ({ item, match: null, confidence: 0 }));
}

/**
 * Apply matched mappings to data
 */
export function applyMatches(
  data: Record<string, any>[],
  mappings: FieldMapping[]
): Record<string, any>[] {
  logger.debug(`[AutoMatcher] Applying ${mappings.length} mappings to ${data.length} rows`);
  return data.map((row) => {
    const mapped: Record<string, any> = {};
    for (const m of mappings) {
      if (row[m.sourceField] !== undefined) {
        mapped[m.targetField] = row[m.sourceField];
      }
    }
    return mapped;
  });
}
