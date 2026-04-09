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
import { navSections as canonicalSections, isNavItemVisible } from "@/config/navConfig";
import { cn } from "@/lib/utils";

// Icon assignments for mobile nav rendering — keyed by href
const iconMap: Record<string, React.ElementType> = {
  "/dashboard": LayoutDashboard,
  "/storm-center": Cloud,
  "/pipeline": Briefcase,
  "/analytics": BarChart3,
  "/ai/smart-actions": Sparkles,
  "/quick-dol": Cloud,
  "/notifications": Zap,
  "/claims": ClipboardList,
  "/analytics/claims-timeline": Clock,
  "/claims-ready-folder": FolderOpen,
  "/ai/tools/supplement": Wrench,
  "/ai/tools/depreciation": Wrench,
  "/ai/tools/rebuttal": Shield,
  "/ai/bad-faith": Shield,
  "/jobs/retail": Store,
  "/leads": Zap,
  "/analytics/dashboard": BarChart3,
  "/tasks": ClipboardList,
  "/appointments": Calendar,
  "/crews": HardHat,
  "/maps/map-view": MapPin,
  "/maps/door-knocking": MapPin,
  "/ai/roofplan-builder": Sparkles,
  "/ai/mockup": Sparkles,
  "/vision-lab": Camera,
  "/materials/estimator": Package,
  "/vendors/orders": Package,
  "/reports/hub": FileText,
  "/reports/history": History,
  "/reports/templates/pdf-builder": FileText,
  "/reports/templates": FolderOpen,
  "/reports/contractor-packet": FileText,
  "/smart-docs": FileText,
  "/ai/exports": FileText,
  "/hoa/notices": FileText,
  "/settings/company-documents": FileText,
  "/permits": ClipboardList,
  "/finance/overview": CreditCard,
  "/invoices": Receipt,
  "/commissions": CreditCard,
  "/mortgage-checks": Landmark,
  "/messages": MessageSquare,
  "/trades": Users,
  "/company/connections": Users,
  "/network/work-requests": ClipboardList,
  "/trades/jobs": Briefcase,
  "/vendor-network": Building2,
  "/invitations": Users,
  "/trades/profile": Users,
  "/settings/branding": Building2,
  "/settings": Settings,
  "/leaderboard": BarChart3,
  "/teams": Users,
  "/teams/hierarchy": Users,
  "/archive": FolderOpen,
};

// Derive mobile nav from canonical config — adds icons and filters by feature flags
const navSections = canonicalSections.map((section) => ({
  label: section.label,
  items: section.items.filter(isNavItemVisible).map((item) => ({
    label: item.label,
    href: item.href,
    icon: iconMap[item.href],
  })),
}));

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
