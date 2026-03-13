"use client";

/**
 * MobileNav
 *
 * Hamburger menu navigation for mobile devices.
 * Shows FULL navigation (synced with AppSidebar) in a slide-out drawer.
 */

import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  ClipboardList,
  Clock,
  Cloud,
  CreditCard,
  FileText,
  FolderOpen,
  HardHat,
  History,
  Landmark,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Store,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// SYNCED with AppSidebar.tsx — Information Architecture (Consolidated v6)
const navSections: NavSection[] = [
  {
    label: "Storm Command Center",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "KPI Dashboard", href: "/dashboard/kpis", icon: BarChart3 },
      { label: "Storm Center", href: "/storm-center", icon: Cloud },
      { label: "Job Pipeline", href: "/pipeline", icon: Briefcase },
      { label: "Analytics Dashboard", href: "/analytics/dashboard", icon: BarChart3 },
      { label: "Smart Actions", href: "/ai/smart-actions", icon: Sparkles },
      { label: "Quick DOL", href: "/quick-dol", icon: Cloud },
    ],
  },
  {
    label: "Claims & Supplements",
    items: [
      { label: "Active Claims", href: "/claims", icon: ClipboardList },
      { label: "Claims Timeline", href: "/analytics/claims-timeline", icon: Clock },
      { label: "ClaimIQ Assembly", href: "/claims-ready-folder", icon: FolderOpen },
      { label: "Supplement Builder", href: "/ai/tools/supplement", icon: Wrench },
      { label: "Supplement Tracker", href: "/supplements", icon: History },
      { label: "Depreciation Builder", href: "/ai/tools/depreciation", icon: Wrench },
      { label: "Rebuttal Builder", href: "/ai/tools/rebuttal", icon: Shield },
      { label: "Bad Faith Analysis", href: "/ai/bad-faith", icon: Shield },
    ],
  },
  {
    label: "Jobs & Field Ops",
    items: [
      { label: "Retail Workspace", href: "/jobs/retail", icon: Store },
      { label: "Lead Routing", href: "/leads", icon: Zap },
      { label: "Appointments & Inspections", href: "/appointments", icon: Calendar },
      { label: "Crew Manager", href: "/crews", icon: HardHat },
      { label: "Map View", href: "/maps/map-view", icon: MapPin },
      { label: "Permits", href: "/permits", icon: ClipboardList },
    ],
  },
  {
    label: "Build Tools & Materials",
    items: [
      { label: "Project Plan Builder", href: "/ai/roofplan-builder", icon: Sparkles },
      { label: "Mockup Generator", href: "/ai/mockup", icon: Sparkles },
      { label: "Vision Labs", href: "/vision-lab", icon: Camera },
      { label: "Material Estimator", href: "/materials/estimator", icon: Package },
      { label: "Material Orders", href: "/vendors/orders", icon: Package },
    ],
  },
  {
    label: "Reports & Documents",
    items: [
      { label: "Reports Hub", href: "/reports/hub", icon: FileText },
      { label: "Report History", href: "/reports/history", icon: History },
      { label: "Quick Reports", href: "/reports/templates/pdf-builder", icon: FileText },
      { label: "Templates & Marketplace", href: "/reports/templates", icon: FolderOpen },
      { label: "Bid Package", href: "/reports/contractor-packet", icon: FileText },
      { label: "Smart Documents", href: "/smart-docs", icon: FileText },
      { label: "Carrier Exports", href: "/ai/exports", icon: FileText },
      { label: "Company Documents", href: "/settings/company-documents", icon: FileText },
    ],
  },
  {
    label: "Finance & Messages",
    items: [
      { label: "Financial Overview", href: "/finance/overview", icon: CreditCard },
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Commissions", href: "/commissions", icon: CreditCard },
      { label: "Mortgage Checks", href: "/mortgage-checks", icon: Landmark },
      { label: "Messages Hub", href: "/messages", icon: MessageSquare },
    ],
  },
  {
    label: "Company & Network",
    items: [
      { label: "My Profile & Company", href: "/trades/profile", icon: Users },
      { label: "Trades Network Hub", href: "/trades", icon: Users },
      { label: "Job Board", href: "/trades/jobs", icon: Briefcase },
      { label: "Vendor Intelligence", href: "/vendor-network", icon: Building2 },
      { label: "Company Settings", href: "/settings", icon: Settings },
      { label: "Team & Company Seats", href: "/teams", icon: Users },
    ],
  },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer — solid background, no transparency */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform shadow-2xl transition-transform duration-200 ease-in-out",
          "bg-white dark:bg-slate-900",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-lg font-bold text-slate-900 dark:text-white">SkaiScraper</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Mobile navigation"
          className="h-[calc(100vh-4rem)] overflow-y-auto bg-white pb-20 dark:bg-slate-900"
        >
          {navSections.map((section) => (
            <div
              key={section.label}
              className="border-b border-slate-100 py-3 dark:border-slate-800"
            >
              <div className="px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.label}
              </div>
              <div className="mt-1 space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/")) ||
                    (item.href !== "/dashboard" && pathname === item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-slate-400 dark:text-slate-500"
                          )}
                        />
                      )}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
