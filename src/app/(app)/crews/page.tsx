import { Calendar, Clock, HardHat, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { guarded } from "@/lib/buildPhase";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { CrewCalendar } from "./CrewCalendar";
import { CrewScheduleCard } from "./CrewScheduleCard";
import { CrewScheduleForm } from "./CrewScheduleForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Crew Manager | SkaiScraper",
  description: "Manage crew assignments, schedules, and labor coordination.",
};

export default async function CrewsPage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated") redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) redirect("/dashboard");

  /* ── Fetch schedules, claims, and team members in parallel ── */
  const [schedules, claims, teamMembers] = await Promise.all([
    guarded(
      "crews",
      async () => {
        const data = await prisma.crewSchedule.findMany({
          where: { orgId: ctx.orgId! },
          orderBy: { scheduledDate: "asc" },
          take: 100,
          include: {
            claims: { select: { id: true, claimNumber: true, title: true } },
            users: { select: { id: true, name: true, email: true, headshot_url: true } },
          },
        });

        const allMemberIds = [...new Set(data.flatMap((s) => s.crewMemberIds))];
        const members =
          allMemberIds.length > 0
            ? await prisma.users.findMany({
                where: { id: { in: allMemberIds } },
                select: { id: true, name: true, headshot_url: true },
              })
            : [];
        const membersMap = new Map(members.map((m) => [m.id, m]));

        return data.map((s) => ({
          id: s.id,
          claimNumber: (s as any).claims?.claimNumber ?? "—",
          claimTitle: (s as any).claims?.title ?? "—",
          crewLead: (s as any).users,
          crewMembers: (s.crewMemberIds as string[]).map(
            (id) => membersMap.get(id) ?? { id, name: null, headshot_url: null }
          ),
          scheduledDate: (s.scheduledDate as Date).toISOString().split("T")[0],
          startTime: s.startTime as string | null,
          estimatedDuration: s.estimatedDuration as unknown as string | null,
          complexity: s.complexity as string | null,
          status: s.status as string,
          scopeOfWork: s.scopeOfWork as string | null,
          weatherRisk: s.weatherRisk as string | null,
        }));
      },
      [] as any[]
    ),

    /* ── Claims for the schedule form dropdown ── */
    guarded(
      "crews-claims",
      async () => {
        const data = await prisma.claims.findMany({
          where: { orgId: ctx.orgId! },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: { id: true, claimNumber: true, title: true },
        });
        return data.map((c) => ({
          id: c.id,
          claimNumber: c.claimNumber ?? "",
          title: c.title ?? "Untitled Claim",
        }));
      },
      [] as { id: string; claimNumber: string; title: string }[]
    ),

    /* ── Team members for crew lead / member assignment ── */
    guarded(
      "crews-members",
      async () => {
        const data = await prisma.users.findMany({
          where: { orgId: ctx.orgId! },
          select: { id: true, name: true },
          take: 200,
        });
        return data.map((u) => ({ id: u.id, name: u.name }));
      },
      [] as { id: string; name: string | null }[]
    ),
  ]);

  const summary = {
    total: schedules.length,
    scheduled: schedules.filter((s: any) => s.status === "scheduled").length,
    inProgress: schedules.filter((s: any) => s.status === "in_progress").length,
    completed: schedules.filter((s: any) => s.status === "completed").length,
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        title="Crew Manager"
        subtitle="Schedule crews, track availability, and manage labor assignments"
        icon={<HardHat className="h-5 w-5" />}
        section="trades"
      >
        <div className="flex gap-3">
          <Button
            asChild
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            <Link href="/claims">
              <Calendar className="mr-2 h-4 w-4" />
              View Claims
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Scheduled",
            value: summary.total,
            icon: <Calendar className="h-5 w-5 text-blue-500" />,
          },
          {
            label: "Upcoming",
            value: summary.scheduled,
            icon: <Clock className="h-5 w-5 text-yellow-500" />,
          },
          {
            label: "In Progress",
            value: summary.inProgress,
            icon: <HardHat className="h-5 w-5 text-orange-500" />,
          },
          {
            label: "Completed",
            value: summary.completed,
            icon: <Users className="h-5 w-5 text-green-500" />,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-5 backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center gap-2">
              {stat.icon}
              <span className="text-sm text-slate-600 dark:text-slate-300">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-[color:var(--text)]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Schedule Form — Labor / Delivery / Inspection ── */}
      <CrewScheduleForm claims={claims} teamMembers={teamMembers} />

      {/* Production Calendar */}
      <CrewCalendar schedules={schedules} />

      {/* Schedule Cards with full CRUD */}
      <div className="space-y-4">
        {schedules.length === 0 && (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-12 text-center backdrop-blur-xl">
            <HardHat className="mx-auto mb-3 h-12 w-12 text-slate-400" />
            <p className="text-slate-500">
              No crew schedules yet. Use the buttons above to schedule labor, deliveries, or
              inspections.
            </p>
          </div>
        )}
        {(schedules as any[]).map((s) => (
          <CrewScheduleCard key={s.id} schedule={s} teamMembers={teamMembers} />
        ))}
      </div>
    </PageContainer>
  );
}
