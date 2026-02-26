"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CloudSun,
  FileText,
  Gauge,
  LineChart,
  Rocket,
  Settings2,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

// ─── Analytics Page Catalog ─────────────────────────────────────────────────

interface AnalyticsPage {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const OPERATIONS: AnalyticsPage[] = [
  {
    title: "Claims Performance",
    description: "KPIs, close rates, cycle times, team productivity, and feature usage.",
    href: "/analytics/performance",
    icon: TrendingUp,
  },
  {
    title: "Claims Timeline",
    description: "Pipeline funnel view — claims by stage, aging, and progression.",
    href: "/analytics/claims-timeline",
    icon: LineChart,
  },
  {
    title: "AI Reports",
    description: "Report generation stats, AI accuracy, and processing volumes.",
    href: "/analytics/reports",
    icon: FileText,
  },
  {
    title: "KPI Overview",
    description: "Top-level dashboard with real-time claim and activity summaries.",
    href: "/analytics/dashboard",
    icon: BarChart3,
  },
];

const EXECUTIVE: AnalyticsPage[] = [
  {
    title: "Executive Intelligence",
    description: "C-suite KPI dashboard — revenue, churn risk, NPS, and growth metrics.",
    href: "/dashboard/kpis",
    icon: Gauge,
  },
  {
    title: "Team Activity",
    description: "Recent team actions, login frequency, and engagement patterns.",
    href: "/dashboard/activity",
    icon: Activity,
  },
  {
    title: "Invitation Performance",
    description: "Invite send rates, acceptance funnels, and viral coefficients.",
    href: "/invitations/analytics",
    icon: Users,
  },
  {
    title: "Vendor Performance",
    description: "Trade partner response times, completion rates, and satisfaction scores.",
    href: "/trades/analytics",
    icon: UserCheck,
  },
  {
    title: "Weather Analytics",
    description: "Weather-correlated claim patterns, storm tracking, and regional impact.",
    href: "/weather/analytics",
    icon: CloudSun,
  },
];

const PLATFORM_HEALTH: AnalyticsPage[] = [
  {
    title: "Pilot Dashboard",
    description: "Feedback collection, pilot cohort tracking, and activation scoring.",
    href: "/settings/pilot",
    icon: Rocket,
    badge: "Pilot",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    title: "Onboarding Funnel",
    description: "Step-by-step drop-off analysis, time-to-activate, and conversion rates.",
    href: "/settings/onboarding-analytics",
    icon: Zap,
    badge: "New",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  {
    title: "Go / No-Go Readiness",
    description: "Launch checklist — infra, security, billing, and compliance gates.",
    href: "/settings/go-no-go",
    icon: CheckCircle2,
    badge: "Launch",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
];

// ─── Hub Page ───────────────────────────────────────────────────────────────

export default function AnalyticsHubPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics Hub</h1>
            <p className="text-muted-foreground">
              Every metric in one place — operations, executive insights, and platform health.
            </p>
          </div>
        </div>
      </div>

      {/* Operations Section */}
      <AnalyticsSection
        title="Operations"
        description="Day-to-day claims processing and team performance."
        icon={Settings2}
        color="indigo"
        pages={OPERATIONS}
      />

      {/* Executive Section */}
      <AnalyticsSection
        title="Executive"
        description="High-level business intelligence and growth metrics."
        icon={Gauge}
        color="purple"
        pages={EXECUTIVE}
      />

      {/* Platform Health Section */}
      <AnalyticsSection
        title="Platform Health"
        description="Pilot readiness, onboarding funnels, and launch gates."
        icon={Rocket}
        color="emerald"
        pages={PLATFORM_HEALTH}
      />
    </div>
  );
}

// ─── Section Component ──────────────────────────────────────────────────────

function AnalyticsSection({
  title,
  description,
  icon: Icon,
  color,
  pages,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "indigo" | "purple" | "emerald";
  pages: AnalyticsPage[];
}) {
  const colorMap = {
    indigo: {
      icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
      line: "border-indigo-200 dark:border-indigo-900",
    },
    purple: {
      icon: "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
      line: "border-purple-200 dark:border-purple-900",
    },
    emerald: {
      icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
      line: "border-emerald-200 dark:border-emerald-900",
    },
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            colorMap[color].icon
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3")}>
        {pages.map((page) => (
          <AnalyticsCard key={page.href} page={page} />
        ))}
      </div>
    </section>
  );
}

// ─── Card Component ─────────────────────────────────────────────────────────

function AnalyticsCard({ page }: { page: AnalyticsPage }) {
  const Icon = page.icon;

  return (
    <Link href={page.href} className="group">
      <Card className="h-full transition-all duration-200 hover:border-primary/40 hover:shadow-md group-hover:-translate-y-0.5">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-2">
              {page.badge && (
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] font-medium", page.badgeColor)}
                >
                  {page.badge}
                </Badge>
              )}
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </div>
          <CardTitle className="mt-2 text-sm font-semibold">{page.title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-xs leading-relaxed">{page.description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
