/**
 * Application Route Constants
 * Single source of truth for all application routes
 */

// IMPORTANT:
// This file is a shared contract between navigation, feature gating, and deep linking.
// Do NOT remove constants in refactors; always extend in a backward-compatible way.
// If renaming paths, preserve the old export (deprecated) until all references are migrated.
// Internal app routes use /trades-network for the network hub; public marketing uses /network.

// Marketing (public) explicit constants
export const MARKETING_HOME = "/";
export const MARKETING_NETWORK = "/network";
export const MARKETING_PRICING = "/pricing";
export const MARKETING_DEMO = "/demo";
export const MARKETING_CONTACT = "/contact";

// Core internal base routes
export const DASHBOARD = "/dashboard";
export const TRADES_NETWORK = "/trades-network"; // internal renamed hub
export const TRADES_NETWORK_FEED = "/trades-network/feed"; // internal activity feed (migrated from /network/feed)
export const TRADES_NETWORK_METRICS = "/trades-network/metrics"; // internal metrics dashboard (migrated from /network/metrics)
export const CLAIMS = "/claims";
export const LEADS = "/leads";
export const WEATHER = "/weather";
export const SUPPLEMENT = "/supplement";
export const DEPRECIATION = "/depreciation";
export const MATERIALS = "/materials";
export const VENDORS = "/vendors";
export const TOKENS = "/tokens";
export const UPLOADS = "/uploads";
export const REPORTS = "/reports";
export const REPORTS_HISTORY = "/reports/history";
export const AI_HUB = "/ai/hub";

// AI API endpoints (superset – keep unless confirmed deprecated)
export const ASK_SKAI = "/api/ask-skai"; // alias
export const AI_APPEALS = "/api/claims/[claimId]/appeal";
export const AI_CLAIMS = "/api/claims"; // claims root API
export const AI_WEATHER_API = "/api/ai/weather/run"; // representative weather AI run endpoint
export const AI_GEOMETRY_SLOPES = "/api/ai/geometry/detect-slopes";
export const AI_VIDEO_JOB = "/api/ai/skai/video/job";
export const AI_VIDEO_JOB_RUN = "/api/ai/skai/video/job/[id]/run";
export const AI_VISION = "/api/ai/vision/analyze"; // generic vision analyze endpoint
export const AI_SUPPLEMENT_API = "/api/claims/[claimId]/supplement";
export const AI_DEPRECIATION_API = "/api/depreciation/generate";

// Backward compatibility: retain PATHS object aggregation for existing imports

export const PATHS = {
  // Dashboard & Home
  DASHBOARD: "/dashboard",
  HOME: "/",

  // Reports (HEAD used /reports/history for root nav highlighting; actual index page exists at /reports)
  REPORTS: "/reports", // primary reports landing (client page)
  REPORTS_HISTORY: "/reports/history",
  REPORT_NEW: "/reports/new",
  REPORT_DETAIL: (id: string) => `/reports/${id}`,
  REPORT_BUILDER: "/reports/builder",
  QUICK_PDF: "/reports/quick-pdf",

  // AI Hub & Tools (preserve full HEAD set + existing standalone damage builder & video reports)
  AI_HUB: "/ai/hub",
  AI_SUITE: "/ai-suite", // legacy alias if still referenced
  AI_TOOLS_MOCKUP: "/ai/tools/mockup",
  AI_TOOLS_MOCKUP_HISTORY: "/ai/tools/mockup/history",
  AI_TOOLS_WEATHER: "/ai/tools/weather",
  AI_TOOLS_SUPPLEMENT: "/ai/tools/supplement",
  AI_TOOLS_DEPRECIATION: "/ai/tools/depreciation",
  AI_TOOLS_REBUTTAL: "/ai/tools/rebuttal",
  AI_DOL: "/ai/dol",
  AI_EXPORTS: "/ai/exports",
  AI_DAMAGE_BUILDER: "/ai/damage-builder",
  AI_DAMAGE_HISTORY: "/ai/damage-builder/history",
  AI_VIDEO_REPORTS: "/ai/video-reports",

  AI_CLAIMS_ANALYSIS: "/ai/claims-analysis",
  AI_BAD_FAITH_DETECTOR: "/ai/bad-faith-detector",

  // Carrier & Export
  CARRIER_EXPORT: "/carrier/export",

  // Claims
  CLAIMS_WIZARD: "/reports/claims/new", // Report builder (11-step PDF generator)
  CLAIMS_GENERATE: "/claims/generate",
  CLAIMS_REPORTS: "/claims/reports",

  // Leads & CRM
  LEADS: "/leads",
  LEAD_NEW: "/leads/new",
  LEAD_DETAIL: (id: string) => `/leads/${id}`,
  LEAD_PIPELINE: "/leads/pipeline",

  // Jobs
  JOBS: "/jobs",
  JOB_DETAIL: (id: string) => `/jobs/${id}`,

  // Proposals
  PROPOSALS_NEW: "/dashboard/proposals/new",
  PROPOSALS: "/dashboard/proposals",

  // Settings
  SETTINGS: "/settings",
  SETTINGS_BRANDING: "/settings/branding",
  SETTINGS_TEAM: "/settings/team",
  SETTINGS_REFERRALS: "/settings/referrals",
  SETTINGS_SECURITY_AUDIT: "/settings/security-audit",

  // Billing
  BILLING: "/billing",
  ACCOUNT_BILLING: "/account/billing",
  PRICING: "/pricing",

  // Auth
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
  AFTER_SIGN_IN: "/after-sign-in",

  // Marketing (public)
  FEATURES: "/features",
  CONTACT: "/contact",
  FEEDBACK: "/feedback",
  LEGAL_PRIVACY: "/legal/privacy",
  LEGAL_TERMS: "/legal/terms",
  MARKETING_NETWORK: "/network", // public marketing network page

  // Trades Network (internal rename from /network). Keep explicit to avoid ambiguity.
  TRADES_NETWORK_ROOT: "/trades-network",
  TRADES_NETWORK_CONTRACTORS: "/trades-network/contractors",
  TRADES_NETWORK_CONTRACTOR_DETAIL: (id: string) => `/trades-network/contractors/${id}`,
  TRADES_NETWORK_INBOX: "/trades-network/inbox",
  TRADES_NETWORK_OPPORTUNITIES: "/trades-network/opportunities",
  TRADES_NETWORK_FEED: "/trades-network/feed",
  TRADES_NETWORK_METRICS: "/trades-network/metrics",
} as const;

/**
 * Helper function to build URLs with query parameters
 */
export function withParams(path: string, params: Record<string, string | number | boolean>) {
  const url = new URL(path, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.pathname + url.search;
}

/**
 * Example usage:
 * withParams(PATHS.REPORT_NEW, { leadId: '123', type: 'retail' })
 * // Result: "/reports/new?leadId=123&type=retail"
 */
