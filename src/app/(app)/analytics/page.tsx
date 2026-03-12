"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CloudSun,
  FileBarChart,
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

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  },
  {
    title: "Onboarding Funnel",
    description: "Step-by-step drop-off analysis, time-to-activate, and conversion rates.",
    href: "/settings/onboarding-analytics",
    icon: Zap,
    badge: "New",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  },
  {
    title: "Go / No-Go Readiness",
    description: "Launch checklist — infra, security, billing, and compliance gates.",
    href: "/settings/go-no-go",
    icon: CheckCircle2,
    badge: "Launch",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
  },
];

// ─── Hub Page ───────────────────────────────────────────────────────────────

export default function AnalyticsHubPage() {
  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="reports"
        title="Analytics Hub"
        subtitle="Every metric in one place — operations, executive insights, and platform health"
        icon={<BarChart3 className="h-6 w-6" />}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-blue-600 hover:bg-blue-50">
            <Link href="/analytics/dashboard">
              <FileBarChart className="mr-2 h-4 w-4" />
              KPI Dashboard
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/analytics/performance">
              <TrendingUp className="mr-2 h-4 w-4" />
              Performance
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Operations Section */}
      <AnalyticsSection
        title="Operations"
        description="Day-to-day claims processing and team performance"
        icon={Settings2}
        color="indigo"
        pages={OPERATIONS}
      />

      {/* Executive Section */}
      <AnalyticsSection
        title="Executive"
        description="High-level business intelligence and growth metrics"
        icon={Gauge}
        color="purple"
        pages={EXECUTIVE}
      />

      {/* Platform Health Section */}
      <AnalyticsSection
        title="Platform Health"
        description="Pilot readiness, onboarding funnels, and launch gates"
        icon={Rocket}
        color="emerald"
        pages={PLATFORM_HEALTH}
      />
    </PageContainer>
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
      gradient: "from-indigo-500 to-blue-600",
      iconBg: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400",
      border: "border-indigo-200 dark:border-indigo-800",
    },
    purple: {
      gradient: "from-purple-500 to-violet-600",
      iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
    emerald: {
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
    },
  };

  return (
    <section className="mb-10">
      <div className="mb-5 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-md",
            colorMap[color].gradient
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <Link href={page.href} className="group relative overflow-hidden">
      <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-md group-hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-600 dark:bg-slate-700 dark:text-slate-400 dark:group-hover:bg-blue-900/50 dark:group-hover:text-blue-400">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            {page.badge && (
              <Badge
                variant="secondary"
                className={cn("text-[10px] font-semibold", page.badgeColor)}
              >
                {page.badge}
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
          </div>
        </div>
        <h3 className="mt-4 text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white">
          {page.title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {page.description}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 h-1 w-0 rounded-b-xl bg-gradient-to-r from-blue-500 to-indigo-500 transition-all group-hover:w-full" />
    </Link>
  );
}
