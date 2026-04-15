/**
 * ============================================================================
 * MASTER SECTION COLOR SYSTEM — ENTITY-CODED
 * ============================================================================
 *
 * 9 sidebar sections, each with a unique gradient.
 * These colors appear in:
 *   1. PageHero banners (auto-detected via ROUTE_THEME_MAP or explicit section= prop)
 *   2. AppSidebar section headers (consumed via SIDEBAR_SECTION_STYLES)
 *   3. AppSidebar chevron icons
 *
 * ⚠️  DO NOT hardcode section colors anywhere else — import from here.
 *
 * Section → Color mapping:
 *   command  (Dashboard & Intel)    → Teal → Cyan
 *   claims   (Claims & Insurance)   → Blue → Sky
 *   leads    (Field & Sales)        → Emerald → Teal
 *   jobs     (Jobs & Operations)    → Amber → Orange
 *   build    (Build & Design)       → Violet → Purple
 *   reports  (Documents & Reports)  → Purple → Fuchsia
 *   network  (Network & Comms)      → Indigo → Blue
 *   finance  (Finance & Billing)    → Emerald → Green
 *   settings (Company)              → Slate → Zinc
 *
 * ============================================================================
 */

export type SectionTheme =
  | "command" // Teal/Cyan  — Dashboard & Intel
  | "claims" // Blue/Sky   — Claims & Insurance
  | "leads" // Emerald    — Field & Sales
  | "jobs" // Amber/Org  — Jobs & Operations
  | "build" // Violet/Pur — Build & Design
  | "reports" // Purple/Fch — Documents & Reports
  | "network" // Indigo/Blu — Network & Comms
  | "finance" // Emerald/Grn— Finance & Billing
  | "settings" // Slate/Zinc — Company
  | "trades"; // Alias → same as jobs (backward compat)

export interface ThemeConfig {
  gradient: string;
  subtitleColor: string;
}

export const SECTION_THEMES: Record<SectionTheme, ThemeConfig> = {
  command: {
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
  jobs: {
    gradient: "bg-gradient-to-r from-amber-600 via-amber-600 to-orange-600",
    subtitleColor: "text-amber-200/80",
  },
  build: {
    gradient: "bg-gradient-to-r from-violet-600 via-violet-600 to-purple-600",
    subtitleColor: "text-violet-200/80",
  },
  reports: {
    gradient: "bg-gradient-to-r from-purple-600 via-purple-600 to-fuchsia-600",
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
    gradient: "bg-gradient-to-r from-slate-600 via-slate-600 to-zinc-600",
    subtitleColor: "text-slate-300/80",
  },
  // Backward-compat alias — "trades" resolves identically to "jobs"
  trades: {
    gradient: "bg-gradient-to-r from-amber-600 via-amber-600 to-orange-600",
    subtitleColor: "text-amber-200/80",
  },
};

/**
 * Sidebar section label → theme key mapping.
 * Used by AppSidebar to look up gradient + icon colors dynamically.
 */
export const SIDEBAR_SECTION_STYLES: Record<
  string,
  { theme: SectionTheme; borderColor: string; chevronColor: string }
> = {
  "Dashboard & Intel": {
    theme: "command",
    borderColor: "border-teal-500",
    chevronColor: "text-teal-500",
  },
  "Claims & Insurance": {
    theme: "claims",
    borderColor: "border-blue-500",
    chevronColor: "text-blue-500",
  },
  "Field & Sales": {
    theme: "leads",
    borderColor: "border-emerald-500",
    chevronColor: "text-emerald-500",
  },
  "Jobs & Operations": {
    theme: "jobs",
    borderColor: "border-amber-500",
    chevronColor: "text-amber-500",
  },
  "Build & Design": {
    theme: "build",
    borderColor: "border-violet-500",
    chevronColor: "text-violet-500",
  },
  "Documents & Reports": {
    theme: "reports",
    borderColor: "border-purple-500",
    chevronColor: "text-purple-500",
  },
  "Finance & Billing": {
    theme: "finance",
    borderColor: "border-emerald-500",
    chevronColor: "text-emerald-500",
  },
  "Network & Comms": {
    theme: "network",
    borderColor: "border-indigo-500",
    chevronColor: "text-indigo-500",
  },
  Company: { theme: "settings", borderColor: "border-slate-500", chevronColor: "text-slate-500" },
};

/**
 * Helper: get sidebar gradient text class for a section label.
 * Returns the `bg-gradient-to-r … bg-clip-text text-transparent` classes.
 */
export function getSidebarGradient(sectionLabel: string): string {
  const style = SIDEBAR_SECTION_STYLES[sectionLabel];
  if (!style) return "bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent";
  const cfg = SECTION_THEMES[style.theme];
  // Convert "bg-gradient-to-r from-X via-Y to-Z" → same string + clip
  return `${cfg.gradient} bg-clip-text text-transparent`;
}

/**
 * Route prefix → section theme mapping
 * Order matters: more specific routes first
 *
 * Every route under src/app/(app)/ MUST have an entry here.
 * PageHero auto-detects the section from usePathname().
 */
const ROUTE_THEME_MAP: [string, SectionTheme][] = [
  // ── Dashboard & Intel (teal→cyan) ─────────────────────────────────
  ["/dashboard", "command"],
  ["/admin", "command"],
  ["/analytics", "command"],
  ["/performance", "command"],
  ["/search", "command"],
  ["/storm-center", "command"],
  ["/pipeline", "command"],
  ["/tools", "command"],

  // ── Claims & Insurance (blue→sky) ──────────────────────────────────
  ["/claims/ready", "claims"],
  ["/claims/new", "claims"],
  ["/claims/rebuttal", "claims"],
  ["/claims", "claims"],
  ["/claims-ready-folder", "claims"],
  ["/claimiq", "claims"],
  ["/evidence", "claims"],
  ["/measurements", "claims"],
  ["/ai/bad-faith", "claims"],
  ["/ai/tools", "claims"],
  ["/ai/claims", "claims"],
  ["/ai/smart-actions", "claims"],
  ["/ai/recommendations", "claims"],
  ["/ai/damage-builder", "claims"],
  ["/ai/exports", "claims"],
  ["/agent", "claims"],
  ["/box-summary", "claims"],
  ["/carrier", "claims"],
  ["/correlate", "claims"],
  ["/damage", "claims"],
  ["/depreciation", "claims"],
  ["/intelligence", "claims"],
  ["/scopes", "claims"],
  ["/scope-editor", "claims"],
  ["/weather-chains", "claims"],
  ["/weather-report", "claims"],
  ["/weather", "claims"],
  ["/quick-dol", "leads"],

  // ── Field & Sales (emerald→teal) ───────────────────────────────────
  ["/field", "leads"],
  ["/storm-leads", "leads"],
  ["/leads", "leads"],
  ["/client-leads", "leads"],
  ["/opportunities", "leads"],
  ["/maps/door-knocking", "leads"],
  ["/maps/weather-chains", "leads"],
  ["/maps/map-view", "leads"],
  ["/maps/routes", "leads"],
  ["/maps/weather", "leads"],
  ["/maps-weather", "leads"],
  ["/maps", "leads"],
  ["/property-profiles", "leads"],
  ["/route-optimization", "leads"],

  // ── Jobs & Operations (amber→orange) ───────────────────────────────
  ["/jobs", "jobs"],
  ["/work-orders", "jobs"],
  ["/appointments", "jobs"],
  ["/tasks", "jobs"],
  ["/crews", "jobs"],
  ["/time-tracking", "jobs"],
  ["/archive", "jobs"],
  ["/bids", "jobs"],
  ["/crm", "jobs"],
  ["/inspections", "jobs"],
  ["/job-board", "jobs"],
  ["/meetings", "jobs"],
  ["/operations", "jobs"],
  ["/projects", "jobs"],
  ["/quality", "jobs"],
  ["/hoa", "jobs"],
  ["/governance", "jobs"],

  // ── Build & Design (violet→purple) ─────────────────────────────────
  ["/ai/roofplan-builder", "build"],
  ["/ai/mockup", "build"],
  ["/ai", "claims"], // all other /ai/ routes → claims
  ["/vision-lab", "build"],
  ["/builder", "build"],
  ["/materials", "build"],
  ["/vendor-network", "build"],
  ["/vendors", "build"],
  ["/trades-hub", "build"],
  ["/trades/profile", "settings"],
  ["/trades", "network"],

  // ── Documents & Reports (purple→fuchsia) ───────────────────────────
  ["/reports", "reports"],
  ["/proposals", "reports"],
  ["/smart-docs", "reports"],
  ["/ai-video-reports", "reports"],
  ["/esign", "reports"],
  ["/estimates", "jobs"],
  ["/exports", "reports"],
  ["/forms", "reports"],
  ["/quotes", "reports"],
  ["/report-workbench", "reports"],
  ["/sign", "reports"],
  ["/templates", "reports"],
  ["/supplements", "reports"],
  ["/contracts", "reports"],
  ["/permits", "reports"],

  // ── Finance & Billing (emerald→green) ──────────────────────────────
  ["/finance", "finance"],
  ["/financial", "finance"],
  ["/invoices", "finance"],
  ["/commissions", "finance"],
  ["/mortgage-checks", "finance"],
  ["/billing", "finance"],

  // ── Network & Comms (indigo→blue) ──────────────────────────────────
  ["/clients", "network"],
  ["/contacts", "network"],
  ["/company/connections", "network"],
  ["/messages", "network"],
  ["/invitations", "network"],
  ["/network", "network"],
  ["/pro/", "network"],
  ["/directory", "network"],
  ["/marketplace", "network"],
  ["/referrals", "network"],
  ["/reviews", "network"],
  ["/marketing", "network"],
  ["/connections", "network"],
  ["/sms", "network"],
  ["/inbox", "network"],

  // ── Company (slate→zinc) ───────────────────────────────────────────
  ["/settings/billing", "finance"],
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
  ["/notifications", "settings"],
  ["/onboarding", "settings"],
  ["/resources", "settings"],
  ["/support", "settings"],
  ["/system", "settings"],
  ["/trial", "settings"],
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
