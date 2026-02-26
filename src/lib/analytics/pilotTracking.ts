/**
 * Pilot Tracking — Analytics events for pilot cohort monitoring
 *
 * Tracks user activation milestones, feature adoption, and retention signals.
 * Uses PostHog for client-side events and activities table for server-side persistence.
 */

// ─── Activation Milestones ──────────────────────────────────────────────────

export const ACTIVATION_MILESTONES = {
  ONBOARDING_COMPLETE: "activation:onboarding_complete",
  FIRST_CLAIM_CREATED: "activation:first_claim_created",
  FIRST_PHOTO_UPLOADED: "activation:first_photo_uploaded",
  FIRST_REPORT_GENERATED: "activation:first_report_generated",
  FIRST_CLIENT_INVITED: "activation:first_client_invited",
  FIRST_TEAM_MEMBER_ADDED: "activation:first_team_member_added",
  FIRST_SMS_SENT: "activation:first_sms_sent",
  FIRST_EXPORT: "activation:first_export",
  BILLING_ACTIVATED: "activation:billing_activated",
  SEVEN_DAY_ACTIVE: "activation:seven_day_active",
  FOURTEEN_DAY_ACTIVE: "activation:fourteen_day_active",
  THIRTY_DAY_ACTIVE: "activation:thirty_day_active",
} as const;

export type ActivationMilestone =
  (typeof ACTIVATION_MILESTONES)[keyof typeof ACTIVATION_MILESTONES];

// ─── Feature Usage Events ───────────────────────────────────────────────────

export const FEATURE_EVENTS = {
  // Claims workflow
  CLAIM_CREATED: "feature:claim_created",
  CLAIM_UPDATED: "feature:claim_updated",
  CLAIM_STATUS_CHANGED: "feature:claim_status_changed",
  CLAIM_EXPORTED: "feature:claim_exported",

  // Documents & Reports
  PHOTO_UPLOADED: "feature:photo_uploaded",
  REPORT_GENERATED: "feature:report_generated",
  REPORT_DOWNLOADED: "feature:report_downloaded",
  DOCUMENT_SHARED: "feature:document_shared",

  // Communication
  SMS_SENT: "feature:sms_sent",
  CLIENT_INVITED: "feature:client_invited",
  MESSAGE_SENT: "feature:message_sent",

  // AI
  AI_ANALYSIS_RUN: "feature:ai_analysis_run",
  AI_SUPPLEMENT_DETECTED: "feature:ai_supplement_detected",

  // Team
  TEAM_MEMBER_INVITED: "feature:team_member_invited",
  ROLE_CHANGED: "feature:role_changed",

  // Settings
  BRANDING_UPDATED: "feature:branding_updated",
  COMMISSION_PLAN_CREATED: "feature:commission_plan_created",
} as const;

export type FeatureEvent = (typeof FEATURE_EVENTS)[keyof typeof FEATURE_EVENTS];

// ─── Retention Signals ──────────────────────────────────────────────────────

export const RETENTION_SIGNALS = {
  DAILY_LOGIN: "retention:daily_login",
  SESSION_STARTED: "retention:session_started",
  SESSION_DURATION: "retention:session_duration",
  PAGE_DEPTH: "retention:page_depth",
  RETURN_VISIT: "retention:return_visit",
} as const;

// ─── Pilot Cohort Config ────────────────────────────────────────────────────

export interface PilotCohort {
  name: string;
  orgIds: string[];
  startDate: string;
  endDate?: string;
  notes?: string;
}

/**
 * Define pilot cohorts here. Add org IDs as companies join the pilot.
 * This drives the pilot analytics dashboard filtering.
 */
export const PILOT_COHORTS: PilotCohort[] = [
  {
    name: "Alpha Cohort",
    orgIds: [], // Add org IDs when pilot begins
    startDate: "2026-03-01",
    notes: "First 3-5 roofing companies for hands-on pilot",
  },
  {
    name: "Beta Cohort",
    orgIds: [],
    startDate: "2026-04-01",
    notes: "Expanded pilot — 10-20 companies, self-service onboarding",
  },
];

// ─── Pilot Health Metrics ───────────────────────────────────────────────────

export interface PilotHealthMetrics {
  totalOrgs: number;
  activeOrgs: number; // At least 1 login in last 7 days
  totalUsers: number;
  activeUsers: number; // DAU in last 7 days
  activationRate: number; // % who completed onboarding + first claim
  day1Retention: number;
  day7Retention: number;
  day14Retention: number;
  avgSessionDuration: number; // seconds
  topFeatures: { feature: string; count: number }[];
  feedbackCount: number;
  feedbackSentiment: number; // 0-4 avg rating
  churnRisk: { orgId: string; lastActive: string; daysInactive: number }[];
}

/**
 * Activation score for a single org. Max 100.
 * Measures how many key milestones they've hit.
 */
export function calculateActivationScore(milestones: string[]): number {
  const weights: Record<string, number> = {
    [ACTIVATION_MILESTONES.ONBOARDING_COMPLETE]: 15,
    [ACTIVATION_MILESTONES.FIRST_CLAIM_CREATED]: 20,
    [ACTIVATION_MILESTONES.FIRST_PHOTO_UPLOADED]: 15,
    [ACTIVATION_MILESTONES.FIRST_REPORT_GENERATED]: 15,
    [ACTIVATION_MILESTONES.FIRST_CLIENT_INVITED]: 10,
    [ACTIVATION_MILESTONES.FIRST_TEAM_MEMBER_ADDED]: 10,
    [ACTIVATION_MILESTONES.FIRST_EXPORT]: 5,
    [ACTIVATION_MILESTONES.FIRST_SMS_SENT]: 5,
    [ACTIVATION_MILESTONES.BILLING_ACTIVATED]: 5,
  };

  let score = 0;
  for (const m of milestones) {
    score += weights[m] || 0;
  }
  return Math.min(score, 100);
}

/**
 * Retention bracket for an org.
 */
export function getRetentionBracket(
  daysSinceSignup: number,
  activeDays: number
): "healthy" | "at-risk" | "churning" | "churned" {
  const rate = daysSinceSignup > 0 ? activeDays / daysSinceSignup : 0;

  if (daysSinceSignup < 3) return "healthy"; // Too early to judge
  if (rate >= 0.5) return "healthy"; // Active 50%+ of days
  if (rate >= 0.2) return "at-risk"; // Active 20-50%
  if (daysSinceSignup > 14 && rate < 0.1) return "churned";
  return "churning";
}
