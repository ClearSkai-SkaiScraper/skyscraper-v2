/**
 * Damage Detection Confidence & Fail-Safe Module
 *
 * Provides:
 * 1. Confidence scoring for damage analysis results
 * 2. Confidence-based UX classification (high/medium/low)
 * 3. Fail-safe mode — returns "manual review required" when AI confidence is too low
 * 4. Human feedback integration types for learning loop
 *
 * @module damage-confidence
 */

import { type DamageItem, type DamageReport } from "./damage-schema";

// =============================================================================
// CONFIDENCE THRESHOLDS
// =============================================================================

export const CONFIDENCE_THRESHOLDS = {
  /** Above this = auto-highlight (green), high trust */
  HIGH: 0.8,
  /** Above this = yellow, moderate trust */
  MEDIUM: 0.5,
  /** Below MEDIUM = dotted/suggested, low trust */
  LOW: 0.5,
  /** Below this = fail-safe triggers manual review */
  FAIL_SAFE: 0.3,
} as const;

// =============================================================================
// CONFIDENCE CLASSIFICATION
// =============================================================================

export type ConfidenceLevel = "high" | "medium" | "low" | "manual_review_required";

export interface ConfidenceClassification {
  level: ConfidenceLevel;
  color: string;
  bgColor: string;
  borderStyle: string;
  label: string;
  description: string;
}

/**
 * Classify a confidence score into a UX-friendly category
 */
export function classifyConfidence(confidence: number): ConfidenceClassification {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return {
      level: "high",
      color: "text-green-700 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderStyle: "border-solid border-green-500",
      label: "High Confidence",
      description: "AI is highly confident this is real damage",
    };
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return {
      level: "medium",
      color: "text-yellow-700 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      borderStyle: "border-solid border-yellow-500",
      label: "Moderate Confidence",
      description: "AI detected possible damage — verify in person",
    };
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.FAIL_SAFE) {
    return {
      level: "low",
      color: "text-orange-700 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderStyle: "border-dashed border-orange-400",
      label: "Low Confidence",
      description: "AI suggests possible damage — manual inspection recommended",
    };
  }

  return {
    level: "manual_review_required",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderStyle: "border-dotted border-red-400",
    label: "Manual Review Required",
    description: "AI confidence too low — manual inspection required",
  };
}

// =============================================================================
// FAIL-SAFE MODE
// =============================================================================

export interface FailSafeResult {
  /** Whether the analysis passed the fail-safe check */
  passed: boolean;
  /** If failed, the mode to display */
  mode: "normal" | "manual_review_required" | "partial_confidence";
  /** Human-readable message */
  message: string;
  /** Filtered findings (only those above fail-safe threshold) */
  reliableFindings: DamageItem[];
  /** Findings below the threshold (need manual verification) */
  unreliableFindings: DamageItem[];
  /** Overall assessment */
  overallConfidence: number;
}

/**
 * Run fail-safe checks on a damage report
 *
 * If overall confidence is too low or too many findings are unreliable,
 * returns a fail-safe result recommending manual review.
 */
export function checkFailSafe(
  report: DamageReport,
  threshold: number = CONFIDENCE_THRESHOLDS.FAIL_SAFE
): FailSafeResult {
  const reliableFindings = report.items.filter((item) => item.confidence >= threshold);
  const unreliableFindings = report.items.filter((item) => item.confidence < threshold);

  const overallConfidence = report.overall_confidence;

  // FAIL-SAFE: If overall confidence is very low
  if (overallConfidence < threshold && report.items.length > 0) {
    return {
      passed: false,
      mode: "manual_review_required",
      message:
        "AI confidence is low for this analysis. Manual inspection is strongly recommended before using these findings for a claim.",
      reliableFindings,
      unreliableFindings,
      overallConfidence,
    };
  }

  // PARTIAL: Some findings are reliable, some aren't
  if (unreliableFindings.length > 0 && reliableFindings.length > 0) {
    return {
      passed: true,
      mode: "partial_confidence",
      message: `${reliableFindings.length} findings are reliable. ${unreliableFindings.length} findings need manual verification.`,
      reliableFindings,
      unreliableFindings,
      overallConfidence,
    };
  }

  // ALL GOOD
  return {
    passed: true,
    mode: "normal",
    message: "Analysis confidence is sufficient for all findings.",
    reliableFindings,
    unreliableFindings: [],
    overallConfidence,
  };
}

// =============================================================================
// SCORING HELPERS
// =============================================================================

/**
 * Calculate an ensemble confidence score when both YOLO and GPT detected the same item
 */
export function ensembleScore(yoloConfidence: number, gptConfidence: number): number {
  // Agreement between YOLO and GPT boosts confidence
  // Weighted average with agreement bonus
  const baseScore = yoloConfidence * 0.4 + gptConfidence * 0.6;
  const agreementBonus = Math.min(yoloConfidence, gptConfidence) * 0.15;
  return Math.min(1.0, baseScore + agreementBonus);
}

/**
 * Score individual findings with source weighting
 */
export function scoreFinding(
  finding: DamageItem,
  source: "yolo_only" | "gpt_only" | "yolo_and_gpt"
): number {
  const baseConfidence = finding.confidence;

  switch (source) {
    case "yolo_and_gpt":
      // Both sources agree — highest confidence
      return Math.min(1.0, baseConfidence * 1.2);
    case "gpt_only":
      // GPT-only detection — use as-is
      return baseConfidence;
    case "yolo_only":
      // YOLO-only — slightly lower since no semantic confirmation
      return baseConfidence * 0.85;
    default:
      return baseConfidence;
  }
}

// =============================================================================
// HUMAN FEEDBACK TYPES (Phase 10)
// =============================================================================

export interface DamageFeedback {
  /** The finding ID this feedback is for */
  findingId: string;
  /** User's verdict */
  verdict: "confirmed" | "rejected" | "adjusted";
  /** If adjusted, the corrected values */
  adjustments?: {
    type?: string;
    severity?: string;
    location?: string;
    notes?: string;
  };
  /** User who provided the feedback */
  userId: string;
  /** Organization */
  orgId: string;
  /** Timestamp */
  timestamp: Date;
  /** The original AI confidence for tracking */
  originalConfidence: number;
}

export interface FeedbackSummary {
  /** Total feedback entries */
  total: number;
  /** Confirmed findings */
  confirmed: number;
  /** Rejected findings (false positives) */
  rejected: number;
  /** Adjusted findings */
  adjusted: number;
  /** Precision: confirmed / (confirmed + rejected) */
  precision: number;
  /** For prompt tuning: common rejection reasons */
  commonRejectionPatterns: string[];
}

/**
 * Calculate feedback summary statistics
 */
export function calculateFeedbackSummary(feedbacks: DamageFeedback[]): FeedbackSummary {
  const confirmed = feedbacks.filter((f) => f.verdict === "confirmed").length;
  const rejected = feedbacks.filter((f) => f.verdict === "rejected").length;
  const adjusted = feedbacks.filter((f) => f.verdict === "adjusted").length;
  const total = feedbacks.length;

  const precision = confirmed + rejected > 0 ? confirmed / (confirmed + rejected) : 1;

  // Track rejection patterns for prompt tuning
  const rejectionNotes = feedbacks
    .filter((f) => f.verdict === "rejected" && f.adjustments?.notes)
    .map((f) => f.adjustments!.notes!);

  // Simple frequency count of rejection notes
  const noteFreq: Record<string, number> = {};
  rejectionNotes.forEach((note) => {
    const key = note.toLowerCase().trim();
    noteFreq[key] = (noteFreq[key] || 0) + 1;
  });

  const commonRejectionPatterns = Object.entries(noteFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pattern]) => pattern);

  return {
    total,
    confirmed,
    rejected,
    adjusted,
    precision: Math.round(precision * 100) / 100,
    commonRejectionPatterns,
  };
}

// =============================================================================
// COST ESTIMATION
// =============================================================================

/**
 * Estimate the cost of a multi-pass analysis
 *
 * @param imageCount Number of images
 * @param passes Number of passes
 * @param model Model used
 * @returns Estimated cost in USD
 */
export function estimateMultiPassCost(
  imageCount: number,
  passes: number,
  model: "gpt-4o" | "gpt-4o-mini" = "gpt-4o"
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = {
    "gpt-4o": { input: 5.0 / 1_000_000, output: 15.0 / 1_000_000 },
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  };

  const { input, output } = pricing[model];

  // Rough estimates per image per pass
  const inputTokensPerImage = 1200; // image tokens + prompt
  const outputTokensPerImage = 1500; // detailed findings

  const totalInputTokens = inputTokensPerImage * imageCount * passes;
  const totalOutputTokens = outputTokensPerImage * imageCount * passes;

  const inputCost = totalInputTokens * input;
  const outputCost = totalOutputTokens * output;

  return {
    inputCost: Math.round(inputCost * 10000) / 10000,
    outputCost: Math.round(outputCost * 10000) / 10000,
    totalCost: Math.round((inputCost + outputCost) * 10000) / 10000,
  };
}
