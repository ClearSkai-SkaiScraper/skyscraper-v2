/**
 * navConfig.ts — Single source of truth for all navigation items.
 *
 * Both AppSidebar and MobileNav import from here.
 * Icons are optional — MobileNav supplies its own icon mapping.
 * Feature flags and plan-gating live here so both surfaces behave identically.
 */

export interface NavItem {
  label: string;
  href: string;
  /** Feature flag key — item is hidden when flag is false */
  featureFlag?: string;
  /** Minimum plan tier required */
  minPlan?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Feature flags — control visibility of unreleased features.
 * Move to env vars or a config service when ready.
 */
export const FEATURE_FLAGS: Record<string, boolean> = {
  FEATURE_AI_TOOLS: true,
  FEATURE_AI_RECOMMENDATIONS: true,
  FEATURE_MOCKUP_GENERATOR: true,
  FEATURE_VISION_AI: true,
};

/**
 * Canonical navigation sections — 7 balanced sections (5–7 items each).
 * Order = display order in both sidebar and mobile nav.
 *
 * Changelog (latest session):
 *   - Renamed "Money" → "Finance & Billing" (professional)
 *   - Moved "Is This Worth It?" → "Field & Sales" alongside Door Knocking
 *   - Restored "Contacts" page in "Network & Comms"
 *   - Merged "Command Center" + analytics into "Dashboard & Intel"
 *   - Rebalanced all sections to 5–7 items
 *   - Moved Notifications to footer / topbar (always accessible, not nav-locked)
 */
export const navSections: NavSection[] = [
  {
    label: "Dashboard & Intel",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Storm Center", href: "/storm-center" },
      { label: "Analytics Hub", href: "/analytics" },
      { label: "Job Pipeline", href: "/pipeline" },
      { label: "Search", href: "/search" },
      { label: "Smart Actions", href: "/ai/smart-actions" },
    ],
  },
  {
    label: "Claims & Insurance",
    items: [
      { label: "Active Claims", href: "/claims" },
      { label: "⚡ Photos → Claim", href: "/claims/pipeline" },
      { label: "Supplement Builder", href: "/ai/tools/supplement" },
      { label: "Depreciation Builder", href: "/ai/tools/depreciation" },
      { label: "Rebuttal Builder", href: "/ai/tools/rebuttal" },
      { label: "Bad Faith Analysis", href: "/ai/bad-faith" },
      { label: "Weather Reports", href: "/weather" },
    ],
  },
  {
    label: "Field & Sales",
    items: [
      { label: "⚡ Field Mode", href: "/field" },
      { label: "Quick DOL Pull", href: "/quick-dol" },
      { label: "Lead Routing", href: "/leads" },
      { label: "Door Knocking", href: "/maps/door-knocking" },
      { label: "Weather Map", href: "/maps/weather-chains" },
      { label: "Property Profiles", href: "/property-profiles" },
      { label: "Map View", href: "/maps/map-view" },
    ],
  },
  {
    label: "Jobs & Operations",
    items: [
      { label: "Retail Workspace", href: "/jobs/retail" },
      { label: "Task Manager", href: "/tasks" },
      { label: "Appointments & Inspections", href: "/appointments" },
      { label: "Crew Manager", href: "/crews" },
      { label: "Work Orders", href: "/work-orders" },
      { label: "Estimates", href: "/estimates" },
    ],
  },
  {
    label: "Build & Design",
    items: [
      { label: "Project Plan Builder", href: "/ai/roofplan-builder" },
      { label: "Mockup Generator", href: "/ai/mockup", featureFlag: "FEATURE_MOCKUP_GENERATOR" },
      { label: "Vision Labs", href: "/vision-lab", featureFlag: "FEATURE_VISION_AI" },
      { label: "Material Estimator", href: "/materials/estimator" },
      { label: "Material Orders", href: "/vendors/orders" },
    ],
  },
  {
    label: "Documents & Reports",
    items: [
      { label: "Reports Hub", href: "/reports/hub" },
      { label: "Report History", href: "/reports/history" },
      { label: "Quick Reports", href: "/reports/templates/pdf-builder" },
      { label: "Templates & Marketplace", href: "/reports/templates" },
      { label: "Smart Documents", href: "/smart-docs" },
      { label: "Contracts", href: "/contracts" },
      { label: "Permits", href: "/permits" },
    ],
  },
  {
    label: "Finance & Billing",
    items: [
      { label: "Financial Overview", href: "/finance/overview" },
      { label: "Invoices", href: "/invoices" },
      { label: "Commissions", href: "/commissions" },
      { label: "Mortgage Checks", href: "/mortgage-checks" },
      { label: "Billing & Plans", href: "/settings/billing" },
    ],
  },
  {
    label: "Network & Comms",
    items: [
      { label: "Clients", href: "/clients" },
      { label: "Contacts", href: "/contacts" },
      { label: "Trades Network Hub", href: "/trades" },
      { label: "Connections", href: "/company/connections" },
      { label: "Work Requests", href: "/network/work-requests" },
      { label: "Messages Hub", href: "/messages" },
      { label: "Invitations", href: "/invitations" },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "My Profile & Company", href: "/trades/profile" },
      { label: "Company Branding", href: "/settings/branding" },
      { label: "Company Settings", href: "/settings" },
      { label: "Team Leaderboard", href: "/leaderboard" },
      { label: "Team & Company Seats", href: "/teams" },
      { label: "Notifications", href: "/notifications" },
      { label: "Help & Support", href: "/support" },
    ],
  },
];

/** Helper: check if a nav item should be visible given current feature flags */
export function isNavItemVisible(item: NavItem): boolean {
  if (item.featureFlag && !FEATURE_FLAGS[item.featureFlag]) return false;
  return true;
}
