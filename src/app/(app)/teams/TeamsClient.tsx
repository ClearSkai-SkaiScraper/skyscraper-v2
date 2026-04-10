"use client";

import { AlertCircle, MoreVertical, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  createdAt: string | Date;
  lastSeenAt: string | Date | null;
  headshotUrl?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  title?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jobHistory?: any;
}

interface TeamsClientProps {
  members: Member[];
  role: string | null;
  needsInitialization: boolean;
  errorMessage: string | null;
}

export default function TeamsClient({
  members,
  role,
  needsInitialization,
  errorMessage,
}: TeamsClientProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return members;
    const q = query.toLowerCase();
    return members.filter(
      (m) => (m.name || m.email).toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [query, members]);

  if (needsInitialization) {
    return (
      <div className="rounded-2xl border border-yellow-200/50 bg-yellow-50/80 p-8 backdrop-blur-xl dark:border-yellow-800/50 dark:bg-yellow-900/20">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200">
            Account Setup Required
          </h3>
        </div>
        <p className="mb-4 text-sm text-yellow-800 dark:text-yellow-300">
          Complete setup to manage your team.
        </p>
        <Button asChild className="rounded-xl">
          <Link href="/onboarding">Complete Setup</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <Input
            placeholder="Search team..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm bg-white dark:bg-slate-950"
          />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {filtered.length} member{filtered.length !== 1 && "s"}
          </div>
        </div>
        {role === "admin" || role === "manager" ? (
          <Button asChild className="rounded-xl shadow-lg shadow-sky-500/20">
            <Link href="/teams/invite">
              <Plus className="mr-2 h-4 w-4" /> Invite Member
            </Link>
          </Button>
        ) : null}
      </div>
      {errorMessage && (
        <div className="rounded-xl border border-red-200/50 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur-xl dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
          {errorMessage}
        </div>
      )}
      <div className="grid gap-4">
        {filtered.map((member) => {
          const lastSeen = member.lastSeenAt ? new Date(member.lastSeenAt) : null;
          const isActive = lastSeen ? Date.now() - lastSeen.getTime() < 1000 * 60 * 60 * 24 : false;
          const joined = new Date(member.createdAt).toLocaleDateString();
          const historyArr = Array.isArray(member.jobHistory) ? member.jobHistory : [];
          const totalProjects = historyArr.length;
          const recentRole = historyArr[0]?.role || null;
          return (
            <Link
              href={`/teams/${member.id}`}
              key={member.id}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/50 bg-white/80 p-6 backdrop-blur-xl transition hover:shadow-lg hover:shadow-sky-500/10 dark:border-slate-800/50 dark:bg-slate-900/70"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  {member.headshotUrl || member.imageUrl || member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(member.headshotUrl || member.imageUrl || member.avatarUrl) as string}
                      alt={member.name || member.email}
                      className="h-12 w-12 rounded-full border object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {member.name || "Team Member"}
                    </h3>
                    {member.title && (
                      <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">
                        {member.title}
                      </span>
                    )}
                  </div>
                  <p className="flex flex-col text-sm text-slate-600 dark:text-slate-400">
                    <span>{member.email}</span>
                    {member.phone && <span className="mt-0.5 text-xs">{member.phone}</span>}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {isActive && lastSeen
                      ? `Active • ${lastSeen.toLocaleTimeString()}`
                      : lastSeen
                        ? `Last seen ${lastSeen.toLocaleDateString()}`
                        : "No activity"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                    {totalProjects > 0
                      ? `Projects: ${totalProjects}${recentRole ? ` • Latest role: ${recentRole}` : ""}`
                      : "No project history yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div
                    className={`rounded-xl px-3 py-1 text-xs font-medium capitalize ${
                      member.role === "admin"
                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                        : member.role === "manager"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "bg-slate-500/10 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {member.role || "member"}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Joined {joined}</p>
                </div>
                <div className="rounded-lg p-2 text-slate-600 transition group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-200">
                  <MoreVertical className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-slate-200/50 bg-white/80 p-12 text-center backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/70">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10">
              <Users className="h-8 w-8 text-sky-600 dark:text-sky-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No members match that search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
