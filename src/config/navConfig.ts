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
 * Canonical navigation sections — 9 sections, ~55 items.
 * Order = display order in both sidebar and mobile nav.
 */
export const navSections: NavSection[] = [
  {
    label: "Storm Command Center",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Storm Center", href: "/storm-center" },
      { label: "Job Pipeline", href: "/pipeline" },
      { label: "Analytics Hub", href: "/analytics" },
      { label: "Smart Actions", href: "/ai/smart-actions" },
      { label: "Quick DOL", href: "/quick-dol" },
      { label: "Notifications", href: "/notifications" },
    ],
  },
  {
    label: "Claims & Supplements",
    items: [
      { label: "Active Claims", href: "/claims" },
      { label: "Claims Timeline", href: "/analytics/claims-timeline" },
      { label: "Claims Assembly", href: "/claims-ready-folder" },
      { label: "Supplement Builder", href: "/ai/tools/supplement" },
      { label: "Depreciation Builder", href: "/ai/tools/depreciation" },
      { label: "Rebuttal Builder", href: "/ai/tools/rebuttal" },
      { label: "Bad Faith Analysis", href: "/ai/bad-faith" },
    ],
  },
  {
    label: "Jobs & Field Ops",
    items: [
      { label: "Retail Workspace", href: "/jobs/retail" },
      { label: "Lead Routing", href: "/leads" },
      { label: "Analytics Dashboard", href: "/analytics/dashboard" },
      { label: "Task Manager", href: "/tasks" },
      { label: "Appointments & Inspections", href: "/appointments" },
      { label: "Crew Manager", href: "/crews" },
      { label: "Map View", href: "/maps/map-view" },
      { label: "Door Knocking", href: "/maps/door-knocking" },
    ],
  },
  {
    label: "Build Tools & Materials",
    items: [
      { label: "Project Plan Builder", href: "/ai/roofplan-builder" },
      { label: "Mockup Generator", href: "/ai/mockup", featureFlag: "FEATURE_MOCKUP_GENERATOR" },
      { label: "Vision Labs", href: "/vision-lab", featureFlag: "FEATURE_VISION_AI" },
      { label: "Material Estimator", href: "/materials/estimator" },
      { label: "Material Orders", href: "/vendors/orders" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Reports Hub", href: "/reports/hub" },
      { label: "Report History", href: "/reports/history" },
      { label: "Quick Reports", href: "/reports/templates/pdf-builder" },
      { label: "Templates & Marketplace", href: "/reports/templates" },
      { label: "Bid Package", href: "/reports/contractor-packet" },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "Smart Documents", href: "/smart-docs" },
      { label: "Carrier Exports", href: "/ai/exports" },
      { label: "HOA Storm Notices", href: "/hoa/notices" },
      { label: "Company Documents", href: "/settings/company-documents" },
      { label: "Permits", href: "/permits" },
    ],
  },
  {
    label: "Finance & Messages",
    items: [
      { label: "Financial Overview", href: "/finance/overview" },
      { label: "Invoices", href: "/invoices" },
      { label: "Commissions", href: "/commissions" },
      { label: "Mortgage Checks", href: "/mortgage-checks" },
      { label: "Messages Hub", href: "/messages" },
    ],
  },
  {
    label: "Network",
    items: [
      { label: "Trades Network Hub", href: "/trades" },
      { label: "Connections & Contacts", href: "/company/connections" },
      { label: "Work Requests", href: "/network/work-requests" },
      { label: "Job Board", href: "/trades/jobs" },
      { label: "Vendor Intelligence", href: "/vendor-network" },
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
      { label: "Company Hierarchy", href: "/teams/hierarchy" },
      { label: "Archive", href: "/archive" },
    ],
  },
];

/** Helper: check if a nav item should be visible given current feature flags */
export function isNavItemVisible(item: NavItem): boolean {
  if (item.featureFlag && !FEATURE_FLAGS[item.featureFlag]) return false;
  return true;
}
