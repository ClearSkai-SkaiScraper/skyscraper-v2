/* eslint-disable no-console */
/**
 * Recommendation Analytics — Track how users interact with template recommendations.
 *
 * Tracks:
 * - Style selection (Insurance / Retail / Sales Material)
 * - Template recommendations shown (which templates, scores)
 * - Template selection (accept AI recommendation vs. manual override)
 * - Confidence scores and missing-field counts
 * - Workflow source (which surface triggered the recommendation)
 */

import { logger } from "@/lib/logger";

// ─── Types ───────────────────────────────────────────────────

export type RecommendationEventType =
  | "style_selected"
  | "recommendations_shown"
  | "template_selected"
  | "template_override"
  | "recommendation_dismissed";

export interface RecommendationAnalyticsEvent {
  eventType: RecommendationEventType;
  /** Which surface triggered this (e.g. 'weather-report', 'builder', 'claim-workspace') */
  workflowSource?: string;
  /** The style category chosen */
  styleCategory?: string;
  /** ID of the AI-recommended (top pick) template */
  recommendedTemplateId?: string;
  /** ID of the template actually selected by the user */
  selectedTemplateId?: string;
  /** Confidence score of the top recommendation (0-100) */
  topConfidence?: number;
  /** Number of recommendations shown */
  recommendationCount?: number;
  /** Whether the user accepted the top AI recommendation */
  acceptedTopPick?: boolean;
  /** Number of missing fields flagged */
  missingFieldCount?: number;
  /** Trade/damage/intent context that was sent */
  context?: {
    trade?: string;
    damageType?: string;
    intent?: string;
  };
  /** Timestamp */
  timestamp: string;
}

// ─── Client-side Tracker ─────────────────────────────────────

/**
 * Log a recommendation analytics event.
 * Fires a non-blocking POST to the analytics endpoint.
 * Falls back to console logging if the endpoint is unavailable.
 */
export function trackRecommendationEvent(
  event: Omit<RecommendationAnalyticsEvent, "timestamp">
): void {
  const fullEvent: RecommendationAnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // Log locally for debugging
  if (typeof window !== "undefined") {
    console.debug("[RecommendationAnalytics]", fullEvent.eventType, fullEvent);
  }

  // Fire-and-forget POST to analytics endpoint
  try {
    if (typeof window !== "undefined") {
      fetch("/api/reports/recommendation-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullEvent),
      }).catch(() => {
        // Silently swallow — analytics should never break the UI
      });
    }
  } catch {
    // Ignore
  }
}

// ─── Server-side Logger ──────────────────────────────────────

/**
 * Server-side analytics logging for recommendation events.
 * Used in API routes to log events with structured logging.
 */
export function logRecommendationEvent(
  event: Omit<RecommendationAnalyticsEvent, "timestamp">
): void {
  const fullEvent: RecommendationAnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  logger.info("[RECOMMENDATION_ANALYTICS]", {
    eventType: fullEvent.eventType,
    styleCategory: fullEvent.styleCategory,
    recommendedTemplateId: fullEvent.recommendedTemplateId,
    selectedTemplateId: fullEvent.selectedTemplateId,
    topConfidence: fullEvent.topConfidence,
    acceptedTopPick: fullEvent.acceptedTopPick,
    missingFieldCount: fullEvent.missingFieldCount,
    workflowSource: fullEvent.workflowSource,
    context: fullEvent.context,
  });
}
