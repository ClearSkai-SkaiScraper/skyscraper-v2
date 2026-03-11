"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { MobileNav } from "@/components/nav/MobileNav";
import ProTradesUserMenu from "@/components/nav/ProTradesUserMenu";
import UnifiedNotificationBell from "@/components/notifications/UnifiedNotificationBell";
import { Button } from "@/components/ui/button";

export default function CRMTopbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white dark:bg-slate-900">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile Hamburger */}
        <MobileNav />

        {/* Logo + Brand Name */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/pro_portal_logo.png"
            alt="SkaiScraper"
            className="h-10 w-auto object-contain"
          />
          <span className="hidden text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:inline">
            SkaiScraper
          </span>
        </Link>

        {/* CRM Navigation - Hidden on mobile */}
        <nav
          aria-label="Top navigation"
          className="hidden items-center space-x-6 text-sm font-medium lg:flex"
        >
          <Link
            href="/dashboard"
            className={`transition-colors hover:text-foreground/80 ${
              pathname === "/dashboard" ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/claims"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/claims") ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Claims
          </Link>
          <Link
            href="/leads"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/leads") ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Leads
          </Link>
          <Link
            href="/jobs/retail"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/jobs") ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Retail
          </Link>
          <Link
            href="/reports/hub"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/reports") && pathname !== "/reports/history"
                ? "text-foreground"
                : "text-foreground/60"
            }`}
          >
            Reports
          </Link>
          <Link
            href="/reports/history"
            className={`transition-colors hover:text-foreground/80 ${
              pathname === "/reports/history" ? "text-foreground" : "text-foreground/60"
            }`}
          >
            History
          </Link>
          <Link
            href="/tools"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/tools") ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Tools
          </Link>
          <Link
            href="/trades"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/trades") ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Trades
          </Link>
          <Link
            href="/pipeline"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/pipeline") ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Pipeline
          </Link>
          <Link
            href="/settings"
            className={`transition-colors hover:text-foreground/80 ${
              pathname?.startsWith("/settings") ? "text-foreground" : "text-foreground/60"
            }`}
          >
            Settings
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* + New Job Button - Hidden on small mobile */}
          <Link href="/jobs/retail/new" className="hidden sm:block">
            <Button size="sm" variant="outline" className="font-medium">
              <span className="mr-1.5 text-base">+</span> New Job
            </Button>
          </Link>

          {/* PHASE C: New Claim Button */}
          <Link href="/claims/new">
            <Button
              size="sm"
              className="bg-blue-600 font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <span className="mr-1.5 text-base">+</span>
              <span className="hidden sm:inline">New Claim</span>
              <span className="sm:hidden">Claim</span>
            </Button>
          </Link>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="hidden sm:flex"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Auth Controls */}
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/after-sign-in?mode=pro">
              <Button size="sm" variant="outline">
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UnifiedNotificationBell variant="pro" />
            <ProTradesUserMenu />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
