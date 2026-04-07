/**
 * Pro Trades User Menu
 * Custom dropdown that sits next to (or replaces) the Clerk UserButton
 * with quick-access links: View Profile, Messages, Settings, Job Board, Logout.
 * Also shows profile strength indicator if profile is incomplete.
 */

"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  Briefcase,
  ChevronDown,
  CreditCard,
  Hammer,
  LogOut,
  MessageCircle,
  Rocket,
  Settings,
  User,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { calculateProStrength } from "@/lib/profile-strength";

interface TradesProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  avatar?: string | null;
  profilePhoto?: string | null;
  tradeType?: string | null;
  companyName?: string | null;
  onboardingStep?: string | null;
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  licenseNumber?: string | null;
  isBonded?: boolean | null;
  isInsured?: boolean | null;
  coverageTypes?: string[];
  jobTitle?: string | null;
  yearsExperience?: number | null;
}

/**
 * Wraps the shared calculateProStrength with label/color derivation
 * so the nav dropdown stays in sync with the profile page banner.
 */
function calculateProfileStrength(profile: TradesProfile | null): {
  percent: number;
  label: string;
  color: string;
  missing: string[];
} {
  if (!profile)
    return { percent: 0, label: "Not Started", color: "red", missing: ["Create your profile"] };

  const { percent, missing } = calculateProStrength(profile as unknown as Record<string, unknown>);

  let label = "Just Getting Started";
  let color = "red";
  if (percent >= 95) {
    label = "All-Star";
    color = "emerald";
  } else if (percent >= 75) {
    label = "Strong";
    color = "blue";
  } else if (percent >= 50) {
    label = "Good Start";
    color = "amber";
  } else if (percent >= 25) {
    label = "Needs Work";
    color = "orange";
  }

  return { percent, label, color, missing };
}

export default function ProTradesUserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [tradesProfile, setTradesProfile] = useState<TradesProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch trades profile
  useEffect(() => {
    if (!isLoaded || !user) return;
    void (async () => {
      try {
        const res = await fetch("/api/trades/onboarding");
        if (res.ok) {
          const data = await res.json();
          if (data.hasProfile && data.employee) {
            setTradesProfile(data.employee);
          }
        }
      } catch {
        // Silently fail — the menu still works without profile data
      } finally {
        setProfileLoaded(true);
      }
    })();
  }, [isLoaded, user]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!isLoaded || !user) return null;

  const hasProfile = !!tradesProfile;
  const strength = calculateProfileStrength(tradesProfile);
  const displayName = tradesProfile
    ? `${tradesProfile.firstName} ${tradesProfile.lastName}`.trim()
    : `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
  const avatarUrl = tradesProfile?.avatar || user.imageUrl;
  const initials = (displayName[0] || "U").toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
        aria-label="Pro Trades menu"
        aria-expanded={open}
      >
        {/* Avatar */}
        <div className="relative h-8 w-8 overflow-hidden rounded-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
              {initials}
            </div>
          )}
          {/* Strength dot indicator */}
          {profileLoaded && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-800 ${
                strength.percent >= 80
                  ? "bg-emerald-500"
                  : strength.percent >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
          )}
        </div>

        {/* Trades icon */}
        <Wrench className="h-4 w-4 text-blue-600" />
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {/* Profile Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {displayName}
                </p>
                {tradesProfile?.companyName && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {tradesProfile.companyName}
                  </p>
                )}
                {tradesProfile?.tradeType && (
                  <p className="truncate text-xs text-blue-600 dark:text-blue-400">
                    {tradesProfile.tradeType}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Strength Bar */}
            {profileLoaded && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    Profile Strength
                  </span>
                  <span
                    className={`font-semibold ${
                      strength.color === "emerald"
                        ? "text-emerald-600"
                        : strength.color === "blue"
                          ? "text-blue-600"
                          : strength.color === "amber"
                            ? "text-amber-600"
                            : strength.color === "orange"
                              ? "text-orange-600"
                              : "text-red-600"
                    }`}
                  >
                    {strength.percent}% — {strength.label}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      strength.color === "emerald"
                        ? "bg-emerald-500"
                        : strength.color === "blue"
                          ? "bg-blue-500"
                          : strength.color === "amber"
                            ? "bg-amber-500"
                            : strength.color === "orange"
                              ? "bg-orange-500"
                              : "bg-red-500"
                    }`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
                {strength.missing.length > 0 && strength.percent < 90 && (
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                    Add: {strength.missing.slice(0, 3).join(", ")}
                    {strength.missing.length > 3 && ` +${strength.missing.length - 3} more`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {hasProfile ? (
              <>
                <MenuLink
                  href="/trades/profile"
                  icon={<User className="h-4 w-4" />}
                  label="View Profile"
                  onClick={() => setOpen(false)}
                />
                <MenuLink
                  href="/trades/profile/edit"
                  icon={<Settings className="h-4 w-4" />}
                  label="Profile Settings"
                  onClick={() => setOpen(false)}
                  badge={strength.percent < 70 ? "!" : undefined}
                />
                <MenuLink
                  href="/messages"
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="Messages"
                  onClick={() => setOpen(false)}
                />
                <MenuLink
                  href="/trades/jobs"
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Job Board"
                  onClick={() => setOpen(false)}
                />
                <MenuLink
                  href="/trades/company"
                  icon={<Hammer className="h-4 w-4" />}
                  label="My Company"
                  onClick={() => setOpen(false)}
                />
                <MenuLink
                  href="/settings/billing"
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Manage Plan"
                  onClick={() => setOpen(false)}
                />
              </>
            ) : (
              /* No profile yet — show onboarding CTA */
              <div className="px-4 py-3">
                <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-center text-white shadow-md">
                  <Rocket className="mx-auto mb-2 h-8 w-8" />
                  <p className="text-sm font-bold">Start Your Pro Trades Journey Today!</p>
                  <p className="mt-1 text-xs text-blue-100">
                    Set up your profile, showcase your work, and connect with the network.
                  </p>
                </div>
                <Link
                  href="/trades/onboarding"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Wrench className="h-4 w-4" />
                  Create My Profile
                </Link>
              </div>
            )}
          </div>

          {/* Divider + Logout */}
          <div className="border-t border-slate-100 py-1 dark:border-slate-700">
            <button
              onClick={() => {
                setOpen(false);
                void signOut({ redirectUrl: "/" });
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helper ─── */
function MenuLink({
  href,
  icon,
  label,
  onClick,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
    >
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
