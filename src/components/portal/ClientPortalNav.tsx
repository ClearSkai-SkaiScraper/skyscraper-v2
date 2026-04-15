"use client";

import {
  Activity,
  Briefcase,
  Heart,
  Home,
  MessageSquare,
  Package,
  PlusCircle,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { SubmitWorkRequestModal } from "@/components/portal/SubmitWorkRequestModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const clientTabs = [
  { label: "Home", href: "", icon: Home },
  { label: "Products", href: "/products", icon: Package },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Claims", href: "/claims", icon: Shield },
  { label: "Find Pro", href: "/find-a-pro", icon: Search },
  { label: "My Pros", href: "/contractors", icon: Heart },
  { label: "Activity", href: "/feed", icon: Activity },
  { label: "Network", href: "/network", icon: Users },
  { label: "Profile", href: "/profile", icon: User },
];

export function ClientPortalNav() {
  const pathname = usePathname();
  const [showWorkRequestModal, setShowWorkRequestModal] = useState(false);

  // Always use /portal as base - we removed slug-based routing
  const baseHref = "/portal";

  return (
    <>
      <nav
        aria-label="Portal sections"
        className="scrollbar-none flex items-center gap-0.5 overflow-x-auto"
      >
        {clientTabs.map((tab) => {
          const fullHref = `${baseHref}${tab.href}`;
          const isActive =
            tab.href === ""
              ? pathname === baseHref
              : pathname === fullHref || pathname?.startsWith(fullHref + "/");
          const Icon = tab.icon;

          return (
            <Link
              key={tab.label}
              href={fullHref}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-1 text-[11px] font-medium transition-all lg:px-2 lg:py-1",
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </Link>
          );
        })}

        {/* Submit Work Request Button */}
        <Button
          size="sm"
          onClick={() => setShowWorkRequestModal(true)}
          className="ml-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
        >
          <PlusCircle className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">New Request</span>
        </Button>
      </nav>

      <SubmitWorkRequestModal
        isOpen={showWorkRequestModal}
        onClose={() => setShowWorkRequestModal(false)}
      />
    </>
  );
}
