import { Activity, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import TeamInvitationsList from "@/components/team/TeamInvitationsList";
import TeamInviteForm from "@/components/team/TeamInviteForm";
import { guarded } from "@/lib/buildPhase";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

// Use activities model directly since that's what exists in schema
const ActivityModel = prisma.activities;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function MembershipMissing() {
  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow-lg">
      <h1 className="mb-4 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-3xl font-bold text-transparent">
        Team Workspace Setup
      </h1>
      <p className="mb-6 text-slate-700 dark:text-slate-300">
        No organization membership detected. Initialize your workspace to invite team members and
        manage collaboration.
      </p>
      <div className="space-y-4">
        <Link
          href="/onboarding/start"
          className="rounded-lg bg-[var(--primary)] px-5 py-3 font-medium text-white shadow"
        >
          Initialize Workspace
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[color:var(--border)] px-5 py-3 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default async function TeamPage() {
  const orgCtx = await safeOrgContext();
  const organizationId = orgCtx.orgId || null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userId = orgCtx.userId;
  if (orgCtx.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (orgCtx.status !== "ok" || !organizationId) {
    return <NoOrgMembershipBanner title="Team Management" />;
  }

  // Dynamic counts with guarded fallbacks (no crashes if tables missing).
  const [memberCount, pendingInvitesCount, todayActivityCount] = await guarded(
    "team-stats",
    async () => {
      try {
        // Count members from both users table AND user_organizations join table
        const directMembers = organizationId
          ? await prisma.users.count({ where: { orgId: organizationId } }).catch(() => 0)
          : 0;
        const orgMembers = organizationId
          ? await prisma.user_organizations
              .count({ where: { organizationId: organizationId } })
              .catch(() => 0)
          : 0;
        const members = Math.max(directMembers, orgMembers);

        // Count pending invitations from team_invitations table
        const invites = organizationId
          ? await prisma.$queryRaw<[{ count: number }]>`
              SELECT count(*)::int as count FROM team_invitations
              WHERE org_id = ${organizationId} AND status = 'pending' AND expires_at > NOW()
            `
              .then((r) => r[0]?.count ?? 0)
              .catch(() => 0)
          : 0;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const activity =
          organizationId && ActivityModel
            ? await ActivityModel.count({
                where: { orgId: organizationId, createdAt: { gte: startOfDay } },
              }).catch(() => 0)
            : 0;
        return [members, invites, activity];
      } catch (e) {
        logger.error("[TEAM PAGE] stats error", e);
        return [0, 0, 0];
      }
    },
    [0, 0, 0]
  ).catch(() => [0, 0, 0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-3xl font-bold text-transparent">
          <span className="text-2xl">👥</span> Team Management
        </h1>
        <p className="mt-2 text-slate-700 dark:text-slate-300">
          Invite team members, manage roles, and track collaboration activity
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Team Members</h3>
          </div>
          <p className="text-3xl font-bold text-[color:var(--text)]">{memberCount}</p>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Active users</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
              <UserPlus className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pending Invites
            </h3>
          </div>
          <p className="text-3xl font-bold text-[color:var(--text)]">{pendingInvitesCount}</p>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Awaiting acceptance</p>
        </div>

        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Activity Today
            </h3>
          </div>
          <p className="text-3xl font-bold text-[color:var(--text)]">{todayActivityCount}</p>
          <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Actions logged</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Invite Form */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-[color:var(--text)]">Invite New Member</h2>
          <TeamInviteForm />
        </div>

        {/* Invitations List */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-[color:var(--text)]">Recent Invitations</h2>
          <TeamInvitationsList />
        </div>
      </div>

      {/* Activity Link */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-sky-50 to-blue-50 p-6 dark:from-sky-950/30 dark:to-blue-950/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-[color:var(--text)]">
              <Activity className="h-5 w-5" />
              Team Activity Feed
            </h3>
            <p className="text-slate-700 dark:text-slate-300">
              Track all team actions, claim updates, and collaboration events
            </p>
          </div>
          <Link
            href="/team/activity"
            className="rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-6 py-3 font-semibold text-white shadow-[var(--glow)] transition hover:scale-[1.02]"
          >
            View Activity
          </Link>
        </div>
      </div>
    </div>
  );
}
