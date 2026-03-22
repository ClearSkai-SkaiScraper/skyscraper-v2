// Navigation configuration - single source of truth
export type NavItem = {
  href: string;
  label: string;
  icon?: string; // Lucide icon name
  match?: RegExp;
  roles?: Array<"admin" | "manager" | "member">;
  plans?: Array<"solo" | "business" | "enterprise">;
  children?: NavItem[]; // Support for dropdown/nested items
};

export const CORE_NAV: NavItem[] = [
  // AI Hub (aggregated landing for AI features)
  { href: "/ai", label: "AI Hub", icon: "Sparkles", match: /^\/ai$/ },
  // Visual Intelligence Dashboard — embedding coverage, similarity, pattern detection
  {
    href: "/intelligence/dashboard",
    label: "Visual Intelligence",
    icon: "Brain",
    match: /^\/intelligence\/dashboard(\/.*)?$/,
  },
  // AI Smart Actions Engine
  {
    href: "/ai/smart-actions",
    label: "AI Smart Actions",
    icon: "Brain",
    match: /^\/ai\/smart-actions(\/.*)?$/,
  },
  // Claims-Ready Folder - carrier-compliant packet assembly
  {
    href: "/claims-ready-folder",
    label: "Claims-Ready Folder",
    icon: "FolderCheck",
    match: /^\/claims-ready-folder(\/.*)?$/,
  },
  // AI Tools (individual tool pages under /ai/tools/)
  {
    href: "/ai/tools/depreciation",
    label: "Depreciation Calculator",
    icon: "Calculator",
    match: /^\/ai\/tools\/depreciation(\/.*)?$/,
  },
  {
    href: "/ai/tools/rebuttal",
    label: "Rebuttal Builder",
    icon: "FileText",
    match: /^\/ai\/tools\/rebuttal(\/.*)?$/,
  },
  {
    href: "/vision-lab",
    label: "Vision Labs",
    icon: "Scan",
    match: /^\/vision-lab(\/.*)?$/,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    match: /^\/dashboard(\/.*)?$/,
  },

  // Reports Section (Grouped with Dropdown)
  {
    href: "/reports",
    label: "Reports",
    icon: "FileText",
    match: /^\/reports(\/.*)?$/,
    children: [
      {
        href: "/reports/claims/new",
        label: "Generate Report",
        icon: "FilePlus",
        match: /^\/reports\/claims\/new(\/.*)?$/,
      },
      {
        href: "/reports/history",
        label: "View All Reports",
        icon: "Archive",
        match: /^\/reports\/history(\/.*)?$/,
      },
      {
        href: "/reports/ai-claims-builder",
        label: "AI Claims Builder",
        icon: "Sparkles",
        match: /^\/reports\/ai-claims-builder(\/.*)?$/,
      },
      {
        href: "/reports/new?type=retail",
        label: "Retail Proposals",
        icon: "FileBarChart",
        match: /^\/reports\/retail(\/.*)?$/,
      },
    ],
  },

  {
    href: "/ai/damage-builder",
    label: "AI Damage Builder",
    icon: "Scan",
    match: /^\/ai\/damage-builder(\/.*)?$/,
  },
  // AI Agent Tools — rebuttal moved to /ai/tools/rebuttal above
  {
    href: "/ai/claims-analysis",
    label: "Claims Analysis",
    icon: "Search",
    match: /^\/ai\/claims-analysis(\/.*)?$/,
  },

  {
    href: "/ai/bad-faith",
    label: "Bad Faith Detector",
    icon: "Shield",
    match: /^\/ai\/bad-faith(\/.*)?$/,
  },
  {
    href: "/settings/security-audit",
    label: "Security Audit",
    icon: "ShieldCheck",
    match: /^\/settings\/security-audit(\/.*)?$/,
  },
  { href: "/claims", label: "Claims", icon: "FileText", match: /^\/claims(\/.*)?$/ },
  {
    href: "/tasks",
    label: "Tasks",
    icon: "CheckSquare",
    match: /^\/tasks(\/.*)?$/,
  },
  {
    href: "/clients",
    label: "Clients",
    icon: "Users",
    match: /^\/clients(\/.*)?$/,
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: "Receipt",
    match: /^\/invoices(\/.*)?$/,
  },
  {
    href: "/contracts",
    label: "Contracts",
    icon: "FileSignature",
    match: /^\/contracts(\/.*)?$/,
  },
  {
    href: "/work-orders",
    label: "Work Orders",
    icon: "ClipboardCheck",
    match: /^\/work-orders(\/.*)?$/,
  },
  {
    href: "/pipeline",
    label: "Job Pipeline",
    icon: "TrendingUp",
    match: /^\/pipeline(\/.*)?$/,
  },
  {
    href: "/jobs/retail",
    label: "Retail Jobs",
    icon: "Wrench",
    match: /^\/jobs\/retail(\/.*)?$/,
  },
  {
    href: "/crews",
    label: "Crew Manager",
    icon: "HardHat",
    match: /^\/crews(\/.*)?$/,
  },
  {
    href: "/notifications/delivery",
    label: "Client Notifications",
    icon: "Bell",
    match: /^\/notifications\/delivery(\/.*)?$/,
  },
  {
    href: "/leads",
    label: "Lead Routing",
    icon: "Users",
    match: /^\/leads(\/.*)?$/,
    children: [
      {
        href: "/analytics/dashboard",
        label: "Analytics Dashboard",
        icon: "BarChart3",
        match: /^\/analytics\/dashboard(\/.*)?$/,
      },
    ],
  },
  { href: "/client-leads", label: "Client Leads", icon: "Inbox", match: /^\/client-leads(\/.*)?$/ },
  {
    href: "/opportunities",
    label: "Bid Opportunities",
    icon: "Briefcase",
    match: /^\/opportunities(\/.*)?$/,
  },
  {
    href: "/appointments",
    label: "Appointments",
    icon: "Calendar",
    match: /^\/appointments(\/.*)?$/,
  },
  {
    href: "/invitations",
    label: "Network Invitations",
    icon: "UserPlus",
    match: /^\/invitations(\/.*)?$/,
    children: [
      {
        href: "/invitations/analytics",
        label: "Invitation Analytics",
        icon: "BarChart3",
        match: /^\/invitations\/analytics(\/.*)?$/,
      },
    ],
  },
  {
    href: "/contacts",
    label: "Company Contacts",
    icon: "UserCircle2",
    match: /^\/contacts(\/.*)?$/,
  },
  {
    href: "/weather-chains",
    label: "Weather Chains",
    icon: "CloudSun",
    match: /^\/weather-chains(\/.*)?$/,
  },
  // Unified maps hub route (previously /map and /maps duplicated)
  { href: "/maps", label: "Maps", icon: "Map", match: /^\/maps(\/.*)?$/ },
  // Routes — consolidated under /route-optimization and /maps/routes
  { href: "/teams", label: "Teams", icon: "UserSquare2", match: /^\/teams(\/.*)?$/ },
  {
    href: "/supplements",
    label: "Supplement Builder",
    icon: "ClipboardList",
    match: /^\/supplements(\/.*)?\/\$/,
  },
  // Smart Documents — e-sign, templates, document sending
  {
    href: "/smart-docs",
    label: "Smart Documents",
    icon: "FileSignature",
    match: /^\/smart-docs(\/.*)?$/,
  },
  // Measurements — GAF QuickMeasure, EagleView, manual
  {
    href: "/measurements",
    label: "Measurements",
    icon: "Ruler",
    match: /^\/measurements(\/.*)?$/,
  },
  {
    href: "/depreciation",
    label: "Depreciation Builder",
    icon: "FileMinus2",
    match: /^\/depreciation(\/.*)?$/,
  },
  {
    href: "/route-optimization",
    label: "Route Optimizer",
    icon: "Route",
    match: /^\/route-optimization(\/.*)?\/\$/,
  },
  // Material Intelligence is placeholder; gate to admin until features shipped
  {
    href: "/materials",
    label: "Material Intelligence",
    icon: "Package",
    match: /^\/materials(\/.*)?$/,
    roles: ["admin"],
  },
  {
    href: "/trades",
    label: "Trades Network",
    icon: "Share2",
    match: /^\/trades(\/.*)?$/,
    children: [
      { href: "/trades", label: "Feed", icon: "Rss", match: /^\/trades$/ },
      {
        href: "/trades/profile",
        label: "My Profile",
        icon: "User",
        match: /^\/trades\/profile(\/.*)?$/,
      },
      {
        href: "/company/connections",
        label: "My Connections",
        icon: "Users",
        match: /^\/company\/connections(\/.*)?$/,
      },
      {
        href: "/trades/companies",
        label: "Network Companies",
        icon: "Building2",
        match: /^\/trades\/companies(\/.*)?$/,
      },
      { href: "/trades/jobs", label: "Jobs", icon: "Briefcase", match: /^\/trades\/jobs(\/.*)?$/ },
      {
        href: "/trades/messages",
        label: "Messages",
        icon: "MessageSquare",
        match: /^\/trades\/messages(\/.*)?$/,
      },
    ],
  },
  { href: "/vendors", label: "Vendors", icon: "Store", match: /^\/vendors(\/.*)?$/ },
  {
    href: "/vendor-network",
    label: "Vendor Network",
    icon: "Network",
    match: /^\/vendor-network(\/.*)?$/,
    children: [
      {
        href: "/vendor-network",
        label: "Browse Vendors",
        icon: "Store",
        match: /^\/vendor-network$/,
      },
      {
        href: "/vendor-network/ai-match",
        label: "AI Match",
        icon: "Sparkles",
        match: /^\/vendor-network\/ai-match(\/.*)?$/,
      },
      {
        href: "/vendor-network/cart",
        label: "Materials Cart",
        icon: "ShoppingCart",
        match: /^\/vendor-network\/cart(\/.*)?$/,
      },
      {
        href: "/vendor-network/receipts",
        label: "Receipts",
        icon: "Receipt",
        match: /^\/vendor-network\/receipts(\/.*)?$/,
      },
      {
        href: "/vendor-network/connectors",
        label: "Connectors",
        icon: "Plug",
        match: /^\/vendor-network\/connectors(\/.*)?$/,
      },
      {
        href: "/vendor-network/admin",
        label: "Admin",
        icon: "Settings",
        match: /^\/vendor-network\/admin(\/.*)?$/,
        roles: ["admin"],
      },
    ],
  },
  { href: "/settings", label: "Settings", icon: "Settings", match: /^\/settings(\/.*)?$/ },
] as const;

export const CONTEXT_NAV: Record<string, NavItem[]> = {
  "/dashboard": [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/activity", label: "Activity" },
    { href: "/analytics/dashboard", label: "KPIs" },
  ],
  "/leads": [
    { href: "/leads/new", label: "New Lead" },
    { href: "/leads/import", label: "Import" },
    { href: "/leads/settings", label: "Settings", roles: ["admin", "manager"] },
  ],
  "/claims": [
    { href: "/claims/new", label: "New Claim" },
    { href: "/claims/reports", label: "Reports" },
    { href: "/ai/tools/rebuttal", label: "Rebuttal Builder" },
  ],
  "/ai": [
    { href: "/ai/claims-analysis", label: "Claims Analysis" },
    { href: "/ai/bad-faith", label: "Bad Faith Detector" },
    { href: "/ai/damage-builder", label: "Damage Builder" },
  ],
  "/reports/history": [
    { href: "/reports/claims", label: "Claims PDF" },
    { href: "/reports/retail", label: "Retail Proposal Builder" },
  ],
  "/trades": [
    { href: "/trades/feed", label: "Trades Feed" },
    { href: "/trades/analytics", label: "Analytics" },
  ],
  "/vendor-network": [
    { href: "/vendor-network", label: "Browse" },
    { href: "/vendor-network/ai-match", label: "AI Match" },
    { href: "/vendor-network/cart", label: "Cart" },
    { href: "/vendor-network/receipts", label: "Receipts" },
    { href: "/vendor-network/connectors", label: "Connectors" },
    { href: "/vendor-network/admin", label: "Admin", roles: ["admin"] },
  ],
  "/smart-docs": [
    { href: "/smart-docs", label: "All Documents" },
    { href: "/esign/on-site", label: "On-Site Signing" },
  ],
  "/measurements": [{ href: "/measurements", label: "All Orders" }],
  "/settings": [
    { href: "/settings", label: "General" },
    { href: "/settings/billing", label: "Billing" },
    { href: "/settings/integrations", label: "Integrations" },
    { href: "/settings/security-audit", label: "Security" },
  ],
};

// Legacy support - deprecated
export const MAIN_TABS = CORE_NAV;
export type NavTab = NavItem;
