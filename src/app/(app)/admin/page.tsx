// ============================================================================
// #180: Platform Admin Dashboard
// ============================================================================
// Server component — requires owner/admin role.
// Shows platform stats: total orgs, users, claims, revenue.
// Quick links to key admin actions.
// ============================================================================

import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  DollarSign,
  ExternalLink,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { checkRole } from "@/lib/auth/rbac";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  // 🛡️ RBAC: Require admin (owner implicitly passes)
  const { hasAccess, role, orgId } = await checkRole("admin");

  if (!hasAccess) {
    return (
      <AccessDenied
        requiredRole="admin"
        currentRole={role}
        message="Only administrators and org owners can access the admin dashboard."
      />
    );
  }

  if (!orgId) {
    return (
      <PageContainer maxWidth="7xl">
        <PageSectionCard title="Organization Required">
          <p className="text-sm text-slate-500">An active organization is required.</p>
        </PageSectionCard>
      </PageContainer>
    );
  }

  // ── Gather platform stats (scoped to org for multi-tenant safety) ──
  let stats = {
    totalUsers: 0,
    totalClaims: 0,
    totalLeads: 0,
    totalProperties: 0,
    totalReports: 0,
    claimsByStatus: {} as Record<string, number>,
    totalClaimValue: 0,
    recentActivity: [] as Record<string, unknown>[],
  };

  try {
    const [
      usersCount,
      claimsCount,
      leadsCount,
      propertiesCount,
      reportsCount,
      claimsRaw,
      recentActivities,
    ] = await Promise.all([
      prisma.user_organizations.count({ where: { organizationId: orgId } }),
      prisma.claims.count({ where: { orgId } }),
      prisma.leads.count({ where: { orgId } }).catch(() => 0),
      prisma.properties.count({ where: { orgId } }),
      prisma.ai_reports.count({ where: { orgId } }).catch(() => 0),
      prisma.claims.findMany({
        where: { orgId },
        select: { status: true, estimatedValue: true },
      }),
      prisma.activities
        .findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            action: true,
            description: true,
            createdAt: true,
            userName: true,
          } as unknown as Record<string, boolean>,
        })
        .catch(() => []),
    ]);

    // Status distribution
    const statusMap: Record<string, number> = {};
    let totalValue = 0;
    for (const c of claimsRaw) {
      const s = c.status || "unknown";
      statusMap[s] = (statusMap[s] || 0) + 1;
      totalValue += c.estimatedValue || 0;
    }

    stats = {
      totalUsers: usersCount,
      totalClaims: claimsCount,
      totalLeads: leadsCount,
      totalProperties: propertiesCount,
      totalReports: reportsCount,
      claimsByStatus: statusMap,
      totalClaimValue: totalValue,
      recentActivity: (recentActivities as Record<string, unknown>[]).map(
        (a: Record<string, unknown>) => ({
          ...a,
          createdAt: (a.createdAt as Date)?.toISOString() || null,
        })
      ),
    };
  } catch (err) {
    logger.error("[AdminDashboard] Stats query failed:", err?.message);
  }

  const statCards = [
    {
      label: "Team Members",
      value: stats.totalUsers,
      icon: Users,
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/50",
      textColor: "text-blue-600",
    },
    {
      label: "Total Claims",
      value: stats.totalClaims,
      icon: ClipboardList,
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
      textColor: "text-emerald-600",
    },
    {
      label: "Claims Value",
      value: `$${(stats.totalClaimValue / 100).toLocaleString()}`,
      icon: DollarSign,
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/50",
      textColor: "text-amber-600",
    },
    {
      label: "Properties",
      value: stats.totalProperties,
      icon: Building2,
      color: "from-purple-500 to-violet-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/50",
      textColor: "text-purple-600",
    },
    {
      label: "Leads",
      value: stats.totalLeads,
      icon: TrendingUp,
      color: "from-sky-500 to-cyan-600",
      bgColor: "bg-sky-100 dark:bg-sky-900/50",
      textColor: "text-sky-600",
    },
    {
      label: "AI Reports",
      value: stats.totalReports,
      icon: FileText,
      color: "from-rose-500 to-pink-600",
      bgColor: "bg-rose-100 dark:bg-rose-900/50",
      textColor: "text-rose-600",
    },
  ];

  const quickLinks = [
    { label: "Claims", href: "/claims", icon: ClipboardList },
    { label: "Pipeline", href: "/pipeline", icon: BarChart3 },
    { label: "Teams", href: "/teams", icon: Users },
    { label: "Leads", href: "/leads", icon: TrendingUp },
    { label: "Integrations", href: "/integrations", icon: Settings },
    { label: "Reports", href: "/claims/reports", icon: FileText },
  ];

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="command"
        title="Admin Dashboard"
        subtitle="Organization overview, stats, and management tools"
        icon={<Shield className="h-5 w-5" />}
      >
        <div className="flex items-center gap-2">
          <Badge className="border-white/30 bg-white/20 text-white">{role?.toUpperCase()}</Badge>
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/settings">
              <Settings className="mr-1 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl ${card.bgColor} p-3`}>
                  <Icon className={`h-6 w-6 ${card.textColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Claims Status Breakdown */}
        <PageSectionCard title="Claims by Status" subtitle="Distribution of claims across stages">
          {Object.keys(stats.claimsByStatus).length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No claims data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.claimsByStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => {
                  const pct =
                    stats.totalClaims > 0 ? Math.round((count / stats.totalClaims) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="capitalize">{status.replace(/_/g, " ")}</span>
                        <span className="font-medium">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </PageSectionCard>

        {/* Recent Activity */}
        <PageSectionCard title="Recent Activity" subtitle="Latest actions across the organization">
          {stats.recentActivity.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((activity) => {
                const a = activity as {
                  id?: string;
                  description?: string;
                  action?: string;
                  userName?: string;
                  createdAt?: string | Date;
                };
                return (
                  <div
                    key={a.id ?? String(Math.random())}
                    className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] p-3"
                  >
                    <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/50">
                      <Activity className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.description || a.action}</p>
                      <p className="text-xs text-slate-500">
                        {a.userName && <span>{a.userName} · </span>}
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageSectionCard>
      </div>

      {/* Quick Links */}
      <PageSectionCard title="Quick Actions" subtitle="Jump to key admin areas">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-[color:var(--border)] p-4 text-center transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
              >
                <Icon className="h-6 w-6 text-blue-500" />
                <span className="text-sm font-medium">{link.label}</span>
                <ExternalLink className="h-3 w-3 text-slate-400" />
              </Link>
            );
          })}
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
