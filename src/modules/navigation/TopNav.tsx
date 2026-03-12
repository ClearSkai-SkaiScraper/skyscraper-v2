"use client";

/**
 * Global Top Navigation
 * Main routes: Dashboard, Claims, Retail, Reports, Trades, Pipeline, Settings
 */

import { UserButton } from "@clerk/nextjs";
import {
  Briefcase,
  ChevronDown,
  FileText,
  Hammer,
  LayoutDashboard,
  Settings,
  Shield,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

import { ROUTES } from "@/config/routes";
import { isDemoMode } from "@/lib/demoMode";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  children?: { label: string; href: string; description?: string }[];
}

export function TopNav() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: ROUTES.dashboard,
      icon: LayoutDashboard,
    },
    {
      label: "Claims",
      href: "/claims",
      icon: Shield,
    },
    {
      label: "Retail",
      href: "/jobs/retail",
      icon: Briefcase,
    },
    {
      label: "Reports",
      icon: FileText,
      children: [
        { label: "Reports Hub", href: "/reports/hub", description: "All reports in one place" },
        {
          label: "Report Builder",
          href: "/reports/templates/pdf-builder",
          description: "Build custom reports",
        },
        {
          label: "Templates & Marketplace",
          href: "/reports/templates",
          description: "Browse & manage templates",
        },
        {
          label: "Contractor Packet",
          href: ROUTES.contractorPacket,
          description: "Generate contractor reports",
        },
      ],
    },
    {
      label: "Tools",
      icon: Hammer,
      children: [
        {
          label: "Supplement Builder",
          href: "/ai/tools/supplement",
          description: "Build supplements",
        },
        { label: "Rebuttal Builder", href: "/ai/tools/rebuttal", description: "Create rebuttals" },
        { label: "Vision Labs", href: "/vision-lab", description: "AI-powered photo analysis" },
        {
          label: "Weather Analytics",
          href: "/weather/analytics",
          description: "Weather verification",
        },
      ],
    },
    {
      label: "Trades",
      href: ROUTES.tradesHub,
      icon: Hammer,
    },
    {
      label: "Pipeline",
      href: "/pipeline",
      icon: TrendingUp,
    },
    {
      label: "Settings",
      icon: Settings,
      children: [
        { label: "Company Settings", href: ROUTES.settings, description: "Company configuration" },
        { label: "Branding", href: ROUTES.branding, description: "Logo, colors, identity" },
        { label: "Team & Seats", href: ROUTES.teams, description: "Manage team members" },
        { label: "Billing", href: "/settings/billing", description: "Plan & billing" },
      ],
    },
  ];

  function isActive(item: NavItem): boolean {
    if (!pathname) return false;
    if (item.href) {
      return pathname === item.href || pathname.startsWith(item.href + "/");
    }
    if (item.children) {
      return item.children.some(
        (child) => pathname === child.href || pathname.startsWith(child.href + "/")
      );
    }
    return false;
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-white/40 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:bg-slate-900/40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href={ROUTES.dashboard} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-cyan text-base font-bold text-white shadow-lg">
              SK
            </div>
            <span className="hidden text-lg font-bold text-slate-900 dark:text-white sm:block">
              SkaiScraper
            </span>
          </Link>

          {/* Main Nav */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              if (item.children) {
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      type="button"
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        active
                          ? "bg-sky-600/10 text-sky-600 shadow-[0_0_15px_-5px_rgba(14,165,233,0.5)] dark:bg-sky-500/20 dark:text-sky-400"
                          : "text-slate-700 hover:bg-slate-100 hover:shadow-sm dark:text-slate-200 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>

                    {openDropdown === item.label && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/20 bg-white/90 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-900/90">
                        <div className="py-2">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="mx-2 block rounded-xl px-5 py-3 text-sm transition-all hover:bg-sky-50 dark:hover:bg-sky-950/30"
                            >
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {child.label}
                              </div>
                              {child.description && (
                                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                                  {child.description}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-sky-600/10 text-sky-600 shadow-[0_0_15px_-5px_rgba(14,165,233,0.5)] dark:bg-sky-500/20 dark:text-sky-400"
                      : "text-slate-700 hover:bg-slate-100 hover:shadow-sm dark:text-slate-200 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {isDemoMode() && (
              <div className="hidden items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 lg:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  DEMO MODE
                </span>
              </div>
            )}
            <div className="hidden items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 lg:flex">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Online</span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  );
}
