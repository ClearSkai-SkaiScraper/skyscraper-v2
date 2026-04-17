// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Crown, Mail, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { CSVUploadDialog } from "@/components/team/CSVUploadDialog";
import TeamInviteForm from "@/components/team/TeamInviteForm";
import { TeamMemberActions } from "@/components/team/TeamMemberActions";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/auth/roleCompare";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Get org context
  const orgCtx = await safeOrgContext();
  if (!orgCtx.ok) {
    redirect("/onboarding/start");
  }

  const orgId = orgCtx.orgId;
  const currentClerkUserId = user.id;

  // Fetch real team members from database
  let teamMembers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    clerkUserId: string | null;
  }> = [];

  try {
    // Get users in this org
    const users = await prisma.users.findMany({
      where: { orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clerkUserId: true,
      },
    });

    teamMembers = users.map((u) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      role: u.role?.toLowerCase() || "user",
      status: "active",
      clerkUserId: u.clerkUserId,
    }));
  } catch (e) {
    logger.error("[TeamSettings] Error fetching users:", e);
  }

  // Fetch real pending invitations - Note: user_organizations doesn't have status/email fields
  // This is a placeholder that returns empty since the model doesn't support pending invitations
  let pendingInvitations: Array<{
    id: string;
    email: string;
    role: string;
    sentAt: string;
  }> = [];

  // user_organizations model only has: id, userId, organizationId, role, createdAt
  // It doesn't have status/email fields, so pending invitations feature needs a different model

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <PageHero
        section="settings"
        title="Team Settings"
        subtitle={`Manage team members and permissions • ${teamMembers.length} members • ${pendingInvitations.length} pending invites`}
        icon={<Users className="h-5 w-5" />}
      />

      {/* Invite Section - Using TeamInviteForm */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">
              Invite Team Members
            </h2>
          </div>
          <CSVUploadDialog />
        </div>
        <p className="mb-4 text-blue-700 dark:text-blue-300">
          Send an invitation to add a new member, or bulk import from a CSV file
        </p>
        <TeamInviteForm />
      </div>

      {/* Active Team Members */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-sm">
        <div className="border-b border-[color:var(--border)] bg-[var(--surface-2)] px-6 py-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-[color:var(--text)]">
            <Users className="h-6 w-6 text-[color:var(--text)]" />
            Active Team Members ({teamMembers.filter((m) => m.status === "active").length})
          </h2>
        </div>
        <div className="divide-y divide-slate-200">
          {teamMembers
            .filter((m) => m.status === "active")
            .map((member) => (
              <div key={member.id} className="px-6 py-4 transition hover:bg-[var(--surface-2)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-lg font-bold text-white">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-[color:var(--text)]">
                        {member.name}
                        {isAdminRole(member.role) && (
                          <span title="Admin">
                            <Crown className="h-4 w-4 text-amber-500" />
                          </span>
                        )}
                        {member.clerkUserId === currentClerkUserId && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            You
                          </span>
                        )}
                      </h3>
                      <p className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
                        <Mail className="h-4 w-4" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <TeamMemberActions
                    memberId={member.id}
                    memberName={member.name}
                    memberEmail={member.email}
                    currentRole={member.role}
                    isCurrentUser={member.clerkUserId === currentClerkUserId}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-sm">
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-amber-900">
              <Mail className="h-6 w-6 text-amber-700" />
              Pending Invitations ({pendingInvitations.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4 transition hover:bg-[var(--surface-2)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[color:var(--text)]">{invitation.email}</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Invited as {invitation.role} • Sent {invitation.sentAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm">Resend</Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-700 hover:bg-red-50 hover:text-red-600 dark:text-slate-300"
                      title="Cancel invitation"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles & Permissions Info */}
      <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[color:var(--text)]">
          <Shield className="h-6 w-6 text-blue-600" />
          Roles & Permissions
        </h2>
        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Crown className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="mb-0.5 font-semibold text-[color:var(--text)]">Owner</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Full platform access. Manages billing, team, and all settings.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="mb-0.5 font-semibold text-[color:var(--text)]">Admin</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Full access except ownership transfer. Manages team and settings.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="mb-0.5 font-semibold text-[color:var(--text)]">Manager</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Manages projects, claims, and team workflows. Cannot modify billing.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="mb-0.5 font-semibold text-[color:var(--text)]">
                Project Manager / Sales / Field Tech / Finance
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Specialized roles scoped to specific workflows — assigned projects, leads, field
                updates, or financial reports.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <h3 className="mb-0.5 font-semibold text-[color:var(--text)]">Member</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Standard team member. Can view and interact with assigned work.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <h3 className="mb-0.5 font-semibold text-[color:var(--text)]">Viewer</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Read-only access. Can view dashboards and reports but cannot modify anything.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
