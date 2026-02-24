"use client";

import { Brain, Clock, DollarSign, FileText, Image, LayoutDashboard, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ClaimLayoutClientProps {
  children: React.ReactNode;
  claimId: string;
}

const navItems = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/photos", label: "Photos", icon: Image },
  { href: "/report", label: "Damage", icon: Wrench },
  { href: "/reports", label: "AI Reports", icon: Brain },
  { href: "/financial", label: "Financial", icon: DollarSign },
  { href: "/activity", label: "Timeline", icon: Clock },
];

export function ClaimLayoutClient({ children, claimId }: ClaimLayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Claim Workspace</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{claimId.slice(0, 8)}</p>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const href = `/claims/${claimId}${item.href}`;
              const isActive = pathname === href;
              const Icon = item.icon;

              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
