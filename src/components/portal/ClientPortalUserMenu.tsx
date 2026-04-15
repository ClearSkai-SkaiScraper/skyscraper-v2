/**
 * Client Portal User Menu
 * Custom dropdown that replaces the bare Clerk UserButton
 * with profile info, quick-access links, and profile strength.
 * Mirrors the ProTradesUserMenu but for client-side users.
 */

"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  Briefcase,
  ChevronDown,
  Heart,
  Home,
  LogOut,
  MessageSquare,
  Search,
  Shield,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { calculateClientStrength } from "@/lib/profile-strength";

interface ClientProfile {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  address?: string;
  city?: string;
  state?: string;
  postal?: string;
  bio?: string;
  category?: string;
  propertyPhotoUrl?: string | null;
  onboardingComplete?: boolean;
}

function deriveStrength(profile: ClientProfile | null): {
  percent: number;
  label: string;
  color: string;
  missing: string[];
} {
  if (!profile)
    return { percent: 0, label: "Not Started", color: "red", missing: ["Complete your profile"] };

  const { percent, missing } = calculateClientStrength({
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zip: profile.postal,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    propertyPhotoUrl: profile.propertyPhotoUrl,
  });

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

export default function ClientPortalUserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch client profile
  useEffect(() => {
    if (!isLoaded || !user) return;
    void (async () => {
      try {
        const res = await fetch("/api/portal/profile");
        if (res.ok) {
          const data = await res.json();
          const p = data.profile || data;
          setProfile({
            id: p.id,
            firstName: p.firstName || user.firstName || "",
            lastName: p.lastName || user.lastName || "",
            email: p.email || user.primaryEmailAddress?.emailAddress || "",
            phone: p.phone || "",
            avatarUrl: p.avatarUrl || user.imageUrl || null,
            address: p.address || "",
            city: p.city || "",
            state: p.state || "",
            postal: p.postal || p.zip || "",
            bio: p.bio || "",
            category: p.category || "Homeowner",
            propertyPhotoUrl: p.propertyPhotoUrl || null,
            onboardingComplete: p.onboardingComplete ?? false,
          });
        } else {
          // API returned non-OK — build profile from Clerk data so strength
          // reflects what we actually know about the user
          setProfile({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.primaryEmailAddress?.emailAddress || "",
            phone: "",
            avatarUrl: user.imageUrl || null,
            address: "",
            city: "",
            state: "",
            postal: "",
            bio: "",
            category: "Homeowner",
            propertyPhotoUrl: null,
            onboardingComplete: false,
          });
        }
      } catch {
        // Network error — build profile from Clerk data
        setProfile({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.primaryEmailAddress?.emailAddress || "",
          phone: "",
          avatarUrl: user.imageUrl || null,
          address: "",
          city: "",
          state: "",
          postal: "",
          bio: "",
          category: "Homeowner",
          propertyPhotoUrl: null,
          onboardingComplete: false,
        });
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

  const strength = deriveStrength(profile);
  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
    : `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
  const avatarUrl = profile?.avatarUrl || user.imageUrl;
  const initials = (displayName[0] || "U").toUpperCase();
  const location =
    profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : undefined;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2 py-1.5 shadow-sm transition-all hover:border-white/40 hover:bg-white/20"
        aria-label="Client menu"
        aria-expanded={open}
      >
        {/* Avatar */}
        <div className="relative h-8 w-8 overflow-hidden rounded-full">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white">
              {initials}
            </div>
          )}
          {/* Strength dot indicator */}
          {profileLoaded && (
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-800 ${
                strength.percent >= 80
                  ? "bg-emerald-500"
                  : strength.percent >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
            />
          )}
        </div>

        {/* Name (hidden on small screens) */}
        <span className="hidden max-w-[120px] truncate text-sm font-medium text-white lg:inline">
          {displayName}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {/* Profile Header */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-full">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate font-semibold text-slate-900 dark:text-white">
                  {displayName}
                </p>
                {profile?.email && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {profile.email}
                  </p>
                )}
                {location && (
                  <p className="truncate text-xs text-blue-600 dark:text-blue-400">{location}</p>
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
            <MenuLink
              href="/portal"
              icon={<Home className="h-4 w-4" />}
              label="Dashboard"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/portal/profile"
              icon={<User className="h-4 w-4" />}
              label="My Profile"
              onClick={() => setOpen(false)}
              badge={strength.percent < 70 ? "!" : undefined}
            />
            <MenuLink
              href="/portal/messages"
              icon={<MessageSquare className="h-4 w-4" />}
              label="Messages"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/portal/claims"
              icon={<Shield className="h-4 w-4" />}
              label="My Claims"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/portal/jobs"
              icon={<Briefcase className="h-4 w-4" />}
              label="My Jobs"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/portal/find-a-pro"
              icon={<Search className="h-4 w-4" />}
              label="Find a Pro"
              onClick={() => setOpen(false)}
            />
            <MenuLink
              href="/portal/contractors"
              icon={<Heart className="h-4 w-4" />}
              label="My Pros"
              onClick={() => setOpen(false)}
            />
          </div>

          {/* Divider + Sign Out */}
          <div className="border-t border-slate-100 py-1 dark:border-slate-700">
            <button
              onClick={() => {
                setOpen(false);
                void signOut({ redirectUrl: "/client/sign-in" });
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
