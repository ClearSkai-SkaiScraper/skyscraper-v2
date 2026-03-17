"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { StandardButton } from "@/components/ui/StandardButton";

export default function MarketingNavbar() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/pro_portal_logo.png"
            alt="SkaiScraper"
            className="h-12 w-auto"
          />
          <span className="bg-gradient-to-r from-[#117CFF] to-[#FFC838] bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            SkaiScraper
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center space-x-8 text-sm font-semibold md:flex">
          <Link
            href="/features"
            className="text-slate-700 transition-colors hover:text-[#117CFF] dark:text-slate-300 dark:hover:text-[#117CFF]"
          >
            Features
          </Link>
          <Link
            href="/skaistack"
            className="text-slate-700 transition-colors hover:text-[#117CFF] dark:text-slate-300 dark:hover:text-[#117CFF]"
          >
            SkaiStack
          </Link>
          <Link
            href="/pricing"
            className="text-slate-700 transition-colors hover:text-[#117CFF] dark:text-slate-300 dark:hover:text-[#117CFF]"
          >
            Pricing
          </Link>
          <Link
            href="/network"
            className="text-slate-700 transition-colors hover:text-[#117CFF] dark:text-slate-300 dark:hover:text-[#117CFF]"
          >
            Network
          </Link>
          <Link
            href="/about"
            className="text-slate-700 transition-colors hover:text-[#117CFF] dark:text-slate-300 dark:hover:text-[#117CFF]"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-slate-700 transition-colors hover:text-[#117CFF] dark:text-slate-300 dark:hover:text-[#117CFF]"
          >
            Contact
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="hidden md:inline-flex"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Client Login - Always show */}
          <Link href="/client/sign-in" className="hidden md:inline-block">
            <Button variant="outline" size="sm" className="font-semibold">
              Client Login
            </Button>
          </Link>

          {/* When signed OUT - show Pro Login + Get Started */}
          <SignedOut>
            <Link href="/sign-in" className="hidden md:inline-block">
              <Button variant="ghost" className="font-semibold">
                Pro Login
              </Button>
            </Link>
            <Link href="/sign-up" className="hidden md:inline-block">
              <StandardButton variant="success" gradient className="rounded-full font-semibold">
                Get Started
              </StandardButton>
            </Link>
          </SignedOut>

          {/* When signed IN - show Dashboard button + User avatar */}
          <SignedIn>
            <Link href="/dashboard" className="hidden md:inline-block">
              <StandardButton variant="secondary" gradient className="rounded-full font-semibold">
                Dashboard
              </StandardButton>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <nav className="container mx-auto flex flex-col space-y-4 px-4 py-6">
            <Link
              href="/features"
              className="text-base font-semibold text-slate-700 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/skaistack"
              className="text-base font-semibold text-slate-700 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              SkaiStack
            </Link>
            <Link
              href="/pricing"
              className="text-base font-semibold text-slate-700 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-base font-semibold text-slate-700 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/network"
              className="text-base font-semibold text-slate-700 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              Network
            </Link>
            <Link
              href="/contact"
              className="text-base font-semibold text-slate-700 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              {/* ALWAYS show login buttons in mobile */}
              <Link
                href="/client/sign-in"
                className="mb-3 block rounded-lg border-2 border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-center font-semibold text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                Client Login
              </Link>
              <Link
                href="/sign-in"
                className="mb-3 block rounded-lg border-2 border-[#117CFF]/50 bg-[#117CFF]/10 px-4 py-3 text-center font-semibold text-[#117CFF] dark:border-[#117CFF]/30 dark:bg-[#117CFF]/20"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pro Login
              </Link>

              {/* When signed in, show Dashboard button */}
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="block rounded-lg bg-gradient-blue px-4 py-3 text-center font-semibold text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Go to Dashboard
                </Link>
              </SignedIn>

              {/* Only show Get Started when signed out */}
              <SignedOut>
                <Link
                  href="/sign-up"
                  className="block rounded-lg bg-gradient-success px-4 py-3 text-center font-semibold text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started Free
                </Link>
              </SignedOut>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
