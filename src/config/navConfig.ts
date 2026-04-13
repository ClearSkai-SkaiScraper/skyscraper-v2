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
 * Canonical navigation sections — 8 sections, streamlined grouping.
 * Order = display order in both sidebar and mobile nav.
 *
 * Changelog (latest session):
 *   - Merged "Reports" into "Documents & Reports"
 *   - Moved Messages Hub → Network & Comms
 *   - Removed duplicate analytics link (was in Command Center + Close More Jobs)
 *   - Grouped financial items tighter under "Money"
 */
export const navSections: NavSection[] = [
  {
    label: "Command Center",
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Storm Center", href: "/storm-center" },
      { label: "Job Pipeline", href: "/pipeline" },
      { label: "Analytics Hub", href: "/analytics" },
      { label: "Smart Actions", href: "/ai/smart-actions" },
      { label: "Is This Worth It?", href: "/quick-dol" },
      { label: "🌩️ Storm → Leads", href: "/storm-leads" },
      { label: "Search", href: "/search" },
      { label: "Weather Map", href: "/maps/weather-chains" },
      { label: "Notifications", href: "/notifications" },
    ],
  },
  {
    label: "Win More Claims",
    items: [
      { label: "Active Claims", href: "/claims" },
      { label: "⚡ Photos → Claim", href: "/claims/pipeline" },
      { label: "Claims Timeline", href: "/analytics/claims-timeline" },
      { label: "Generate Claim Packet", href: "/claims-ready-folder" },
      { label: "Find More Damage", href: "/ai/tools/supplement" },
      { label: "Recover Depreciation", href: "/ai/tools/depreciation" },
      { label: "Fight the Adjuster", href: "/ai/tools/rebuttal" },
      { label: "Bad Faith Analysis", href: "/ai/bad-faith" },
      { label: "Weather Reports", href: "/weather" },
    ],
  },
  {
    label: "Close More Jobs",
    items: [
      { label: "⚡ Field Mode", href: "/field" },
      { label: "Retail Workspace", href: "/jobs/retail" },
      { label: "Lead Routing", href: "/leads" },
      { label: "Task Manager", href: "/tasks" },
      { label: "Appointments & Inspections", href: "/appointments" },
      { label: "Crew Manager", href: "/crews" },
      { label: "Work Orders", href: "/work-orders" },
      { label: "Map View", href: "/maps/map-view" },
      { label: "Door Knocking", href: "/maps/door-knocking" },
    ],
  },
  {
    label: "Build & Estimate",
    items: [
      { label: "Project Plan Builder", href: "/ai/roofplan-builder" },
      { label: "Mockup Generator", href: "/ai/mockup", featureFlag: "FEATURE_MOCKUP_GENERATOR" },
      { label: "Vision Labs", href: "/vision-lab", featureFlag: "FEATURE_VISION_AI" },
      { label: "Material Estimator", href: "/materials/estimator" },
      { label: "Material Orders", href: "/vendors/orders" },
      { label: "Estimates", href: "/estimates" },
    ],
  },
  {
    label: "Documents & Reports",
    items: [
      { label: "Reports Hub", href: "/reports/hub" },
      { label: "Report History", href: "/reports/history" },
      { label: "Quick Reports", href: "/reports/templates/pdf-builder" },
      { label: "Templates & Marketplace", href: "/reports/templates" },
      { label: "Bid Package", href: "/reports/contractor-packet" },
      { label: "Smart Documents", href: "/smart-docs" },
      { label: "Carrier Exports", href: "/ai/exports" },
      { label: "HOA Storm Notices", href: "/hoa/notices" },
      { label: "Company Documents", href: "/settings/company-documents" },
      { label: "Permits", href: "/permits" },
      { label: "Contracts", href: "/contracts" },
    ],
  },
  {
    label: "Money",
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
      { label: "Trades Network Hub", href: "/trades" },
      { label: "Connections", href: "/company/connections" },
      { label: "Work Requests", href: "/network/work-requests" },
      { label: "Job Board", href: "/trades/jobs" },
      { label: "Vendor Intelligence", href: "/vendor-network" },
      { label: "Invitations", href: "/invitations" },
      { label: "Clients", href: "/clients" },
      { label: "Messages Hub", href: "/messages" },
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
      { label: "Help & Support", href: "/support" },
    ],
  },
];

/** Helper: check if a nav item should be visible given current feature flags */
export function isNavItemVisible(item: NavItem): boolean {
  if (item.featureFlag && !FEATURE_FLAGS[item.featureFlag]) return false;
  return true;
}
