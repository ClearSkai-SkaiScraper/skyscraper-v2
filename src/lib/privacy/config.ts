/**
 * Data Privacy & Retention Configuration
 *
 * Centralized privacy settings for PII handling, data retention,
 * and compliance requirements.
 */

// ─── Retention Periods ──────────────────────────────────────────────────────

export const DATA_RETENTION = {
  /** Active claim data — retained while org is active */
  CLAIMS: {
    active: Infinity,
    afterOrgDeletion: 90, // days
  },

  /** User activity logs */
  ACTIVITIES: {
    retentionDays: 365,
    aggregateAfterDays: 90, // Aggregate old records, delete raw
  },

  /** Notifications */
  NOTIFICATIONS: {
    readRetentionDays: 90, // Already cleaned by orphan-cleanup cron
    unreadRetentionDays: 365,
  },

  /** File assets (photos, documents, reports) */
  FILE_ASSETS: {
    active: Infinity,
    orphanedRetentionDays: 30, // Already cleaned by orphan-cleanup cron
  },

  /** Webhook events (Stripe, Twilio, etc.) */
  WEBHOOK_EVENTS: {
    retentionDays: 30, // Already cleaned by orphan-cleanup cron
  },

  /** Session / auth data */
  SESSIONS: {
    // Managed by Clerk — we don't store sessions
    provider: "Clerk",
  },

  /** User feedback */
  USER_FEEDBACK: {
    retentionDays: 730, // 2 years
  },

  /** Audit logs (when implemented) */
  AUDIT_LOGS: {
    retentionDays: 2555, // 7 years (compliance)
  },
} as const;

// ─── PII Fields ─────────────────────────────────────────────────────────────

/**
 * Fields containing Personally Identifiable Information.
 * Used by PII masking, data export, and data deletion.
 */
export const PII_FIELDS = {
  USER: ["email", "firstName", "lastName", "phone", "imageUrl"],
  CONTACT: ["email", "phone", "firstName", "lastName", "address", "city", "state", "zip"],
  CLAIM: [
    "homeownerName",
    "homeownerEmail",
    "homeownerPhone",
    "propertyAddress",
    "adjusterName",
    "adjusterPhone",
    "adjusterEmail",
  ],
  ORGANIZATION: ["contactEmail", "contactPhone", "address"],
} as const;

// ─── Data Export (GDPR Right to Data Portability) ───────────────────────────

export const EXPORTABLE_TABLES = [
  "claims",
  "contacts",
  "file_assets",
  "activities",
  "notifications",
  "user_feedback",
] as const;

// ─── Cookie & Tracking Consent ──────────────────────────────────────────────

export const TRACKING_CONFIG = {
  /** PostHog analytics */
  posthog: {
    requiresConsent: true,
    category: "analytics",
    description: "Usage analytics to improve the product",
  },

  /** Sentry error tracking */
  sentry: {
    requiresConsent: false, // Essential for app functionality
    category: "essential",
    description: "Error tracking to maintain service quality",
  },

  /** Clerk authentication */
  clerk: {
    requiresConsent: false, // Essential
    category: "essential",
    description: "Authentication and session management",
  },
} as const;

// ─── Compliance Standards ───────────────────────────────────────────────────

export const COMPLIANCE = {
  /** WCAG accessibility standard */
  WCAG_LEVEL: "AA" as const,
  WCAG_VERSION: "2.1" as const,

  /** Data protection */
  ENCRYPTION_AT_REST: true, // Supabase encrypts at rest
  ENCRYPTION_IN_TRANSIT: true, // HTTPS enforced
  MFA_AVAILABLE: true, // Via Clerk

  /** Insurance industry specific */
  DATA_RESIDENCY: "US", // Vercel US region
  HIPAA_COMPLIANT: false, // Not required for property insurance
  SOC2_COMPLIANT: false, // Future roadmap
} as const;
