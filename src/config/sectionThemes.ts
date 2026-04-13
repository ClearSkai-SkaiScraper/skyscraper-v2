/**
 * ============================================================================
 * MASTER SECTION COLOR SYSTEM — UNIFIED TEAL/TURQUOISE
 * ============================================================================
 *
 * ALL sections use the same teal/turquoise gradient.
 * Clean, unified brand identity across every page.
 *
 * Only the header gradient changes. Everything else stays:
 * - Same glass cards
 * - Same layout
 * - Same typography
 * - Same spacing
 *
 * ============================================================================
 */

export type SectionTheme =
  | "command" // Deep Blue — Dashboard, overview, KPIs
  | "jobs" // Teal — Claims list, jobs, retail, pipeline
  | "claims" // Turquoise — Claims workspace tools, AI claims tools
  | "trades" // Warm Orange — Crews, trades, field tools
  | "reports" // Purple — Reports, docs, proposals, templates
  | "network" // Indigo — Vendor network, invitations, contacts
  | "finance" // Emerald Green — Finance, invoices, commissions, messages
  | "settings"; // Cyan — Billing, integrations, security, org settings

export interface ThemeConfig {
  gradient: string;
  subtitleColor: string;
}

export const SECTION_THEMES: Record<SectionTheme, ThemeConfig> = {
  command: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
  jobs: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
  claims: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
  trades: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
  reports: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
  network: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
  finance: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
  settings: {
    gradient: "bg-gradient-to-r from-teal-600 via-teal-600 to-cyan-600",
    subtitleColor: "text-teal-200/80",
  },
};

/**
 * Route prefix → section theme mapping
 * Order matters: more specific routes first
 *
 * Every route under src/app/(app)/ MUST have an entry here.
 * PageHero auto-detects the section from usePathname().
 */
const ROUTE_THEME_MAP: [string, SectionTheme][] = [
  // ── Command Center ─────────────────────────────────────────────────
  ["/dashboard", "command"],
  ["/admin", "command"],
  ["/analytics", "command"],
  ["/performance", "command"],
  ["/search", "command"],
  ["/storm-center", "command"],

  // ── Claims Toolkit (must be before /claims general) ────────────────
  ["/claims/ready", "jobs"],
  ["/claims/new", "jobs"],
  ["/claims/rebuttal", "claims"],
  ["/ai/", "claims"],
  ["/evidence", "claims"],
  ["/quick-dol", "claims"],
  ["/vision-lab", "claims"],
  ["/measurements", "claims"],
  ["/agent", "claims"],
  ["/box-summary", "claims"],
  ["/builder", "claims"],
  ["/carrier", "claims"],
  ["/correlate", "claims"],
  ["/damage", "claims"],
  ["/depreciation", "claims"],
  ["/intelligence", "claims"],
  ["/scopes", "claims"],
  ["/weather-chains", "claims"],
  ["/weather-report", "claims"],

  // ── Jobs & Claims ──────────────────────────────────────────────────
  ["/claims", "jobs"],
  ["/pipeline", "jobs"],
  ["/jobs", "jobs"],
  ["/leads", "jobs"],
  ["/work-orders", "jobs"],
  ["/opportunities", "jobs"],
  ["/property-profiles", "jobs"],
  ["/appointments", "jobs"],
  ["/permits", "jobs"],
  ["/mortgage-checks", "jobs"],
  ["/client-leads", "jobs"],
  ["/archive", "jobs"],
  ["/bids", "jobs"],
  ["/claims-ready-folder", "jobs"],
  ["/clients", "jobs"],
  ["/crm", "jobs"],
  ["/inspections", "jobs"],
  ["/job-board", "jobs"],
  ["/maps-weather", "jobs"],
  ["/marketing", "jobs"],
  ["/meetings", "jobs"],
  ["/operations", "jobs"],
  ["/projects", "jobs"],
  ["/quality", "jobs"],
  ["/route-optimization", "jobs"],
  ["/tasks", "jobs"],
  ["/time-tracking", "jobs"],

  // ── Field & Sales ──────────────────────────────────────────────────
  ["/field", "trades"],
  ["/storm-leads", "trades"],

  // ── Trades Toolkit ─────────────────────────────────────────────────
  ["/trades", "trades"],
  ["/trades-hub", "trades"],
  ["/crews", "trades"],
  ["/materials", "trades"],

  // ── Reports & Documents ────────────────────────────────────────────
  ["/reports", "reports"],
  ["/proposals", "reports"],
  ["/smart-docs", "reports"],
  ["/ai-video-reports", "reports"],
  ["/esign", "reports"],
  ["/estimates", "reports"],
  ["/exports", "reports"],
  ["/forms", "reports"],
  ["/quotes", "reports"],
  ["/report-workbench", "reports"],
  ["/sign", "reports"],
  ["/templates", "reports"],

  // ── Network ────────────────────────────────────────────────────────
  ["/vendor-network", "network"],
  ["/network", "network"],
  ["/invitations", "network"],
  ["/vendors", "network"],
  ["/contacts", "network"],
  ["/company/connections", "network"],
  ["/pro/", "network"],
  ["/directory", "network"],
  ["/marketplace", "network"],
  ["/referrals", "network"],
  ["/reviews", "network"],

  // ── Finance & Communications ───────────────────────────────────────
  ["/finance", "finance"],
  ["/invoices", "finance"],
  ["/commissions", "finance"],
  ["/messages", "finance"],
  ["/sms", "finance"],
  ["/notifications", "finance"],
  ["/billing", "finance"],
  ["/contracts", "finance"],
  ["/financial", "finance"],
  ["/inbox", "finance"],

  // ── Settings & Admin ───────────────────────────────────────────────
  ["/settings", "settings"],
  ["/company", "settings"],
  ["/company-map", "settings"],
  ["/leaderboard", "settings"],
  ["/teams", "settings"],
  ["/team", "settings"],
  ["/uploads", "settings"],
  ["/feedback", "settings"],
  ["/account", "settings"],
  ["/auto-onboard", "settings"],
  ["/compliance", "settings"],
  ["/deployment-proof", "settings"],
  ["/dev", "settings"],
  ["/developers", "settings"],
  ["/getting-started", "settings"],
  ["/help", "settings"],
  ["/integrations", "settings"],
  ["/mobile", "settings"],
  ["/onboarding", "settings"],
  ["/resources", "settings"],
  ["/support", "settings"],
  ["/system", "settings"],
  ["/trial", "settings"],

  // ── Weather / Maps → Claims toolkit ────────────────────────────────
  ["/maps", "jobs"],

  // ── HOA / Governance ───────────────────────────────────────────────
  ["/hoa", "jobs"],
  ["/governance", "jobs"],
];

/**
 * Resolve the section theme for a given pathname.
 * Returns the SectionTheme key or undefined if no match.
 */
export function getSectionTheme(pathname: string): SectionTheme {
  for (const [prefix, theme] of ROUTE_THEME_MAP) {
    if (pathname.startsWith(prefix)) {
      return theme;
    }
  }
  return "command"; // default to blue
}

/**
 * Get the gradient class string for a given pathname.
 * Use this in PageHero or any component that needs route-aware theming.
 */
export function getSectionGradient(pathname: string): string {
  const theme = getSectionTheme(pathname);
  return SECTION_THEMES[theme].gradient;
}
