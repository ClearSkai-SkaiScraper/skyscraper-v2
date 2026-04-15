// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Calendar, CheckCircle, Clock, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TimeTrackingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();
  if (!orgId) return <NoOrgMembershipBanner title="Time Tracking" />;

  // ── Fetch real team members ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let members: any[] = [];
  try {
    members = await prisma.tradesCompanyMember.findMany({
      where: {
        company: { orgId },
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (e) {
    logger.error("[TimeTracking] Error fetching members:", e);
  }

  // ── Fetch real job schedules for the team ──────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schedules: any[] = [];
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    schedules = await prisma.job_schedules.findMany({
      where: {
        orgId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        date: true,
        crew: true,
        notes: true,
        claimId: true,
      },
    });
  } catch (e) {
    logger.error("[TimeTracking] Error fetching schedules:", e);
  }

  // ── Compute stats ────────────────────────────────────────────────
  const totalScheduled = schedules.length;
  const completedToday = schedules.filter((s) => {
    const today = new Date().toISOString().split("T")[0];
    const schedDate =
      s.date instanceof Date ? s.date.toISOString().split("T")[0] : String(s.date).split("T")[0];
    return schedDate === today;
  }).length;
  const pendingApprovals = schedules.filter((s) => {
    const d = s.date instanceof Date ? s.date : new Date(String(s.date));
    return d >= new Date();
  }).length;

  return (
    <div className="space-y-6 p-8">
      <PageHero
        section="jobs"
        title="Time Tracking & Scheduling"
        subtitle="Team schedules, job assignments, and work tracking"
        icon={<Clock className="h-5 w-5" />}
      >
        <Button asChild>
          <Link href="/appointments/schedule" className="gap-2">
            <Clock className="mr-2 h-5 w-5" />
            Schedule Job
          </Link>
        </Button>
      </PageHero>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">Team Members</span>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold">{members.length}</div>
            <div className="mt-1 text-sm text-gray-600">Active members</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">Scheduled This Week</span>
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold">{totalScheduled}</div>
            <div className="mt-1 text-sm text-gray-600">Job assignments</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold">{pendingApprovals}</div>
            <div className="mt-1 text-sm text-gray-600">Awaiting confirmation</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed Today</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold">{completedToday}</div>
            <div className="mt-1 text-sm text-gray-600">Jobs finished</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-6 text-center text-gray-500">
              No team members yet.{" "}
              <Link href="/teams" className="text-blue-600 hover:underline">
                Invite your team
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-sm font-medium text-gray-700"
                    >
                      Member
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-sm font-medium text-gray-700"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-sm font-medium text-gray-700"
                    >
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                            {(member.firstName?.[0] || "?").toUpperCase()}
                          </div>
                          <span className="font-medium">
                            {[member.firstName, member.lastName].filter(Boolean).join(" ") ||
                              "Team Member"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 capitalize">{member.role || "member"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Job Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="py-6 text-center text-gray-500">
              No job schedules yet.{" "}
              <Link href="/appointments/schedule" className="text-blue-600 hover:underline">
                Schedule your first job
              </Link>
              .
            </p>
          ) : (
            <div className="divide-y">
              {schedules.slice(0, 10).map((sched) => (
                <div key={sched.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{sched.notes || "Job Assignment"}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(sched.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    scheduled
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
