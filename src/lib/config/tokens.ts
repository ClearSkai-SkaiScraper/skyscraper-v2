/**
 * Token / Credit System — REMOVED
 * SkaiScraper Pro uses flat $80/month pricing.
 * All AI features are included in the subscription.
 *
 * This file is kept as a stub to prevent import errors.
 * All costs are 0, all quotas are unlimited.
 */

export const TOKEN_COSTS = {
  AI_MOCKUP: 0,
  QUICK_DOL_PULL: 0,
  WEATHER_REPORT_BASIC: 0,
  WEATHER_REPORT_DETAILED: 0,
  BOX_SUMMARY_AI: 0,
  CARRIER_EXPORT_PDF: 0,
  CARRIER_EXPORT_ZIP: 0,
} as const;

export const TRIAL_TOKENS = 0;

export const TOKEN_PACKS = [] as const;

export const PLAN_QUOTAS = {
  SOLO: { aiMockups: 999999, dolPulls: 999999, weatherReports: 999999, seats: 1 },
  BUSINESS: { aiMockups: 999999, dolPulls: 999999, weatherReports: 999999, seats: 10 },
  ENTERPRISE: { aiMockups: 999999, dolPulls: 999999, weatherReports: 999999, seats: 25 },
} as const;

export const OVERAGE_COSTS = {
  AI_MOCKUP: 0,
  DOL_PULL: 0,
  WEATHER_REPORT: 0,
} as const;
