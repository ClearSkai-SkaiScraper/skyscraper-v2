/**
 * ============================================================================
 * MASTER SECTION COLOR SYSTEM — ENTITY-CODED
 * ============================================================================
 *
 * Brand-cohesive gradients that visually distinguish each platform area:
 *
 * — command (Dashboard, overview)  → Deep teal (brand anchor)
 * — claims (Insurance claims)     → Blue family (sky → blue)
 * — jobs (Retail / Jobs / Leads)  → Teal → cyan
 * — trades (Crews, materials)     → Amber → orange
 * — reports (Docs, proposals)     → Purple → violet
 * — network (Vendors, contacts)   → Indigo → blue
 * — finance (Invoices, billing)   → Emerald → green
 * — settings (Admin, account)     → Slate → cool gray
 * — leads (Sales pipeline)        → Emerald → teal (green family)
 *
 * ============================================================================
 */

export type SectionTheme =
  | "command" // Deep Teal — Dashboard, overview, KPIs
  | "jobs" // Teal/Cyan — Retail jobs, pipeline
  | "claims" // Blue — Claims workspace, AI claims tools
  | "leads" // Green — Sales leads pipeline
  | "trades" // Warm Orange — Crews, trades, field tools
  | "reports" // Purple — Reports, docs, proposals, templates
  | "network" // Indigo — Vendor network, invitations, contacts
  | "finance" // Emerald Green — Finance, invoices, commissions
  | "settings"; // Slate — Billing, integrations, security, org settings

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
    gradient: "bg-gradient-to-r from-blue-600 via-blue-600 to-sky-600",
    subtitleColor: "text-blue-200/80",
  },
  leads: {
    gradient: "bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600",
    subtitleColor: "text-emerald-200/80",
  },
  trades: {
    gradient: "bg-gradient-to-r from-amber-600 via-amber-600 to-orange-600",
    subtitleColor: "text-amber-200/80",
  },
  reports: {
    gradient: "bg-gradient-to-r from-purple-600 via-purple-600 to-violet-600",
    subtitleColor: "text-purple-200/80",
  },
  network: {
    gradient: "bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600",
    subtitleColor: "text-indigo-200/80",
  },
  finance: {
    gradient: "bg-gradient-to-r from-emerald-600 via-emerald-600 to-green-600",
    subtitleColor: "text-emerald-200/80",
  },
  settings: {
    gradient: "bg-gradient-to-r from-slate-600 via-slate-600 to-slate-500",
    subtitleColor: "text-slate-300/80",
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
  ["/claims/ready", "claims"],
  ["/claims/new", "claims"],
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

  // ── Claims (list + detail pages) ───────────────────────────────────
  ["/claims", "claims"],

  // ── Leads (sales pipeline) — green family ──────────────────────────
  ["/leads", "leads"],
  ["/client-leads", "leads"],
  ["/opportunities", "leads"],

  // ── Jobs & Operations (retail, pipeline, misc) ─────────────────────
  ["/pipeline", "jobs"],
  ["/jobs", "jobs"],
  ["/work-orders", "jobs"],
  ["/property-profiles", "jobs"],
  ["/appointments", "jobs"],
  ["/permits", "jobs"],
  ["/mortgage-checks", "jobs"],
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
  ["/maps/door-knocking", "trades"],
  ["/maps/weather-chains", "claims"],

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
  ["/notifications", "settings"],
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
