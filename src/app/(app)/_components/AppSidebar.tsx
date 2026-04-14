"use client";

import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { RemoteViewSelector } from "@/components/remote-view/RemoteViewSelector";
import { isNavItemVisible, navSections } from "@/config/navConfig";
import { getUiTheme } from "@/config/uiTheme";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const mode = theme === "dark" ? "dark" : "light";
  const t = getUiTheme(mode);

  // ── Collapsible sections ──
  // Start with Dashboard & Intel OPEN, all others collapsed. Persist to localStorage.
  const defaultCollapsed = Object.fromEntries(
    navSections.map((s) => [s.label, s.label !== "Dashboard & Intel"])
  );
  const [collapsedSections, setCollapsedSections] =
    useState<Record<string, boolean>>(defaultCollapsed);
  const [_hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("skai-nav-collapsed");
      if (saved) setCollapsedSections(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem("skai-nav-collapsed", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [badges, setBadges] = useState<{
    unreadMessages: number;
    upcomingAppointments: number;
    unreadNotifications: number;
    pendingInvitations: number;
    pendingWorkRequests: number;
  }>({
    unreadMessages: 0,
    upcomingAppointments: 0,
    unreadNotifications: 0,
    pendingInvitations: 0,
    pendingWorkRequests: 0,
  });

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await fetch("/api/nav/badges");
        const data = await res.json();
        if (data.success) {
          setBadges(data.data);
        }
      } catch (error) {
        logger.error("Failed to fetch badge counts:", error);
      }
    };

    void fetchBadges();
    // Refresh badges every 30 seconds
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  const getBadgeCount = (href: string): number | null => {
    if (href === "/messages" || href === "/trades/messages") return badges.unreadMessages || null;
    if (href === "/appointments") return badges.upcomingAppointments || null;
    if (href === "/invitations") return badges.pendingInvitations || null;
    if (href === "/invitations/analytics") return badges.pendingInvitations || null;
    if (href === "/notifications") return badges.unreadNotifications || null;
    if (href === "/network/work-requests") return badges.pendingWorkRequests || null;
    return null;
  };

  // Get the most specific (longest) matching href from all nav items
  const getActiveHref = (): string | null => {
    if (!pathname) return null;
    const allItems = navSections.flatMap((s) => s.items);

    // First try exact match
    const exactMatch = allItems.find((item) => pathname === item.href);
    if (exactMatch) return exactMatch.href;

    // Then try prefix matches, preferring longer paths first
    // This ensures /ai/rebuttal-builder matches Rebuttal Builder, not AI Hub
    const prefixMatches = allItems
      .filter((item) => item.href !== "/" && pathname.startsWith(item.href + "/"))
      .sort((a, b) => b.href.length - a.href.length);

    if (prefixMatches.length > 0) return prefixMatches[0].href;

    // Check if current path starts with a nav item path (for nested routes)
    // e.g., /ai/rebuttal-builder should match /ai/rebuttal-builder
    // Sort by length descending to match the most specific path first
    const startsWithMatches = allItems
      .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
      .sort((a, b) => b.href.length - a.href.length);

    if (startsWithMatches.length > 0) return startsWithMatches[0].href;

    return null;
  };

  const activeHref = getActiveHref();

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        "hidden h-full w-64 shrink-0 flex-col border-r md:flex",
        t.bg.sidebar,
        t.border.sidebar
      )}
    >
      {/* Logo removed — shown in CRMTopbar header instead */}
      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto py-2">
        {navSections.map((section) => {
          const isCollapsed = collapsedSections[section.label] ?? false;
          // Auto-expand if active item is in this section
          const sectionHasActive = section.items.some((item) => activeHref === item.href);

          return (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between px-3 pb-1 pr-3 pt-4 text-[13px] font-extrabold uppercase tracking-wider transition-all hover:opacity-90",
                  !isCollapsed || sectionHasActive
                    ? cn(
                        "border-b-2",
                        section.label === "Claims & Insurance"
                          ? "border-blue-500 bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent"
                          : section.label === "Field & Sales"
                            ? "border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                            : section.label === "Jobs & Operations"
                              ? "border-amber-500 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent"
                              : section.label === "Dashboard & Intel"
                                ? "border-teal-500 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent"
                                : section.label === "Build & Design"
                                  ? "border-violet-500 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent"
                                  : section.label === "Documents & Reports"
                                    ? "border-purple-500 bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent"
                                    : section.label === "Finance & Billing"
                                      ? "border-emerald-500 bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
                                      : section.label === "Network & Comms"
                                        ? "border-indigo-500 bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent"
                                        : section.label === "Company"
                                          ? "border-slate-500 bg-gradient-to-r from-slate-600 to-zinc-600 bg-clip-text text-transparent"
                                          : "border-blue-500 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                      )
                    : "border-b border-transparent bg-gradient-to-r from-slate-400 to-slate-500 bg-clip-text text-transparent hover:from-blue-500 hover:to-purple-500"
                )}
                aria-expanded={!isCollapsed}
              >
                <span>{section.label}</span>
                <svg
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200",
                    isCollapsed ? "-rotate-90" : "rotate-0",
                    (!isCollapsed || sectionHasActive) &&
                      (section.label === "Claims & Insurance"
                        ? "text-blue-500"
                        : section.label === "Field & Sales"
                          ? "text-emerald-500"
                          : section.label === "Jobs & Operations"
                            ? "text-amber-500"
                            : section.label === "Dashboard & Intel"
                              ? "text-teal-500"
                              : section.label === "Build & Design"
                                ? "text-violet-500"
                                : section.label === "Documents & Reports"
                                  ? "text-purple-500"
                                  : section.label === "Finance & Billing"
                                    ? "text-emerald-500"
                                    : section.label === "Network & Comms"
                                      ? "text-indigo-500"
                                      : section.label === "Company"
                                        ? "text-slate-500"
                                        : "text-blue-500")
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {(!isCollapsed || sectionHasActive) && (
                <div className="space-y-0.5 rounded-b-lg bg-slate-50/80 px-2 py-1 dark:bg-slate-800/40">
                  {section.items.filter(isNavItemVisible).map((item) => {
                    const isActive = activeHref === item.href;
                    const badgeCount = getBadgeCount(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          t.sidebar.item.base,
                          isActive ? t.sidebar.item.active : t.sidebar.item.idle,
                          "flex items-center justify-between"
                        )}
                      >
                        <span>{item.label}</span>
                        {badgeCount && badgeCount > 0 && (
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                            )}
                          >
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      {/* Sprint 27: Remote View — admin/manager can view team member workspaces */}
      <div className={cn("border-t px-3 py-3", t.border.sidebar)}>
        <RemoteViewSelector />
      </div>
      {/* 
      <div className={cn("border-t px-3 py-3 text-xs", t.border.sidebar)}>
        <div className="flex items-center justify-between">
          <span className={cn("truncate", t.text.secondary)}>My Company</span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold",
              t.bg.card,
              t.text.secondary,
              t.border.default
            )}
          >
            v6.0
          </span>
        </div>
        <div className={cn("mt-1 flex items-center justify-between text-[11px]", t.text.secondary)}>
          <span>NAV_ITEMS: {navSections.reduce((sum, s) => sum + s.items.length, 0)}</span>
          <a href="/api/debug/whoami" target="_blank" className="text-blue-500 hover:underline">
            Debug
          </a>
        </div>
      </div>
      */}
    </aside>
  );
}
