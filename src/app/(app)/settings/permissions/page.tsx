// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { CheckCircle, Crown, Shield, ShieldAlert, User, Users, XCircle } from "lucide-react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ── Role definitions ── */

const ROLE_META: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  owner: {
    label: "Owner",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    icon: Crown,
  },
  admin: {
    label: "Admin",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
    icon: ShieldAlert,
  },
  member: {
    label: "Member",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: User,
  },
};

/* ── Role capabilities matrix ── */

interface Capability {
  name: string;
  owner: boolean;
  admin: boolean;
  member: boolean;
}

const CAPABILITIES: Capability[] = [
  { name: "View claims & reports", owner: true, admin: true, member: true },
  { name: "Create new claims", owner: true, admin: true, member: true },
  { name: "Edit claim details", owner: true, admin: true, member: false },
  { name: "Delete claims", owner: true, admin: false, member: false },
  { name: "Manage team members", owner: true, admin: true, member: false },
  { name: "Invite / remove users", owner: true, admin: true, member: false },
  { name: "View billing & subscription", owner: true, admin: true, member: false },
  { name: "Change subscription plan", owner: true, admin: false, member: false },
  { name: "Manage branding & settings", owner: true, admin: true, member: false },
  { name: "Export organization data", owner: true, admin: true, member: false },
  { name: "Delete organization", owner: true, admin: false, member: false },
];

function PermCheck({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <CheckCircle className="h-4 w-4 text-emerald-500" />
  ) : (
    <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />
  );
}

/* ── Page ── */

export default async function PermissionsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const ctx = await safeOrgContext();
  if (!ctx.orgId || ctx.status !== "ok") redirect("/settings");

  /* Fetch team members from user_registry where orgId matches */
  let members: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    imageUrl: string | null;
    createdAt: Date;
  }[] = [];
  try {
    const rawMembers = await prisma.user_registry.findMany({
      where: { orgId: ctx.orgId },
      select: {
        id: true,
        displayName: true,
        email: true,
        userType: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    members = rawMembers.map((m) => ({
      id: m.id,
      name: m.displayName,
      email: m.email,
      role: m.userType,
      imageUrl: m.avatarUrl,
      createdAt: m.createdAt,
    }));
  } catch (error) {
    logger.error("[PermissionsPage] Failed to fetch team members:", error);
  }

  /* Normalize role string */
  function roleKey(raw: string | null): string {
    const lower = (raw ?? "member").toLowerCase();
    if (lower.includes("owner")) return "owner";
    if (lower.includes("admin")) return "admin";
    return "member";
  }

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="settings"
        title="Permissions & Team Roles"
        subtitle="Manage team member access and role-based permissions"
        icon={<Shield className="h-5 w-5" />}
      />

      <div className="grid gap-6">
        {/* ─── Team Members ─── */}
        <PageSectionCard
          title="Team Members"
          subtitle={`${members.length} member${members.length !== 1 ? "s" : ""} in your organization`}
        >
          {members.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[color:var(--border)] py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No team members found. Invite teammates from the Team settings.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--border)]">
              {members.map((member) => {
                const rk = roleKey(member.role);
                const meta = ROLE_META[rk] ?? ROLE_META.member;
                const RoleIcon = meta.icon;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt={member.name ?? ""}
                          className="h-10 w-10 rounded-full border border-slate-200 object-cover dark:border-slate-700"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                          {(member.name?.[0] ?? member.email?.[0] ?? "U").toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-[color:var(--text)]">
                          {member.name || "Unnamed User"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {member.email ?? "—"}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold ${meta.color}`}
                    >
                      <RoleIcon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </PageSectionCard>

        {/* ─── Role Capabilities Matrix ─── */}
        <PageSectionCard
          title="Role Capabilities"
          subtitle="What each role can do within your organization"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="pb-3 pr-6">Capability</th>
                  <th className="pb-3 pr-6 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Crown className="h-3 w-3 text-amber-500" />
                      Owner
                    </span>
                  </th>
                  <th className="pb-3 pr-6 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <ShieldAlert className="h-3 w-3 text-indigo-500" />
                      Admin
                    </span>
                  </th>
                  <th className="pb-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <User className="h-3 w-3 text-slate-500" />
                      Member
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {CAPABILITIES.map((cap) => (
                  <tr key={cap.name}>
                    <td className="py-3 pr-6 text-[color:var(--text)]">{cap.name}</td>
                    <td className="py-3 pr-6 text-center">
                      <span className="flex justify-center">
                        <PermCheck allowed={cap.owner} />
                      </span>
                    </td>
                    <td className="py-3 pr-6 text-center">
                      <span className="flex justify-center">
                        <PermCheck allowed={cap.admin} />
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <span className="flex justify-center">
                        <PermCheck allowed={cap.member} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSectionCard>
      </div>
    </PageContainer>
  );
}
