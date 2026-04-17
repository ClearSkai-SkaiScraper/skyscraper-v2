/**
 * Team Member Profile Page
 * Dynamic route: /team/member/[memberId]
 *
 * Displays comprehensive employee profile with:
 * - Headshot and basic info
 * - Role and verification status
 * - Resume/job history
 * - Team activity
 * - Trades Network readiness
 */

import { isAdminRole, isManagerOrAbove } from "@/lib/auth/roleCompare";
import {
  Activity,
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Edit,
  FileText,
  Mail,
  Network,
  Shield,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getOrg } from "@/lib/org/getOrg";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface PageProps {
  params: {
    memberId: string;
  };
}

export default async function TeamMemberProfilePage({ params }: PageProps) {
  const ctx = await getOrg({ mode: "required" });
  // If we get here, org exists (mode: "required" redirects if no org)
  if (!ctx.ok) throw new Error("Unreachable: mode required should redirect");
  const orgId = ctx.orgId;

  // Fetch team member with extended profile data (headshotUrl optional)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let member = null as any;
  try {
    member = await prisma.users.findFirst({
      where: {
        id: params.memberId,
        orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clerkUserId: true,
        createdAt: true,
        lastSeenAt: true,
        headshot_url: true,
      },
    });
  } catch (e) {
    logger.error(
      "[TeamMemberProfilePage] Failed to fetch member (possible missing headshot_url column)",
      e
    );
  }

  if (!member) {
    redirect("/teams");
  }

  // Calculate activity metrics
  const daysSinceJoined = Math.floor(
    (Date.now() - new Date(member.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(member.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isActive = daysSinceActive <= 7;

  // Fetch member's recent activities
  const recentActivities = await prisma.claim_activities
    .findMany({
      where: { user_id: member.id },
      orderBy: { created_at: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        message: true,
        created_at: true,
        claim_id: true,
      },
    })
    .catch(() => []);

  // Fetch claims assigned to this member
  const assignedClaims = await prisma.claims
    .findMany({
      where: {
        orgId,
        assignedTo: member.id,
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        damageType: true,
        updatedAt: true,
      },
    })
    .catch(() => []);

  // Check Trades Network profile readiness
  // TODO: Check if user has all required fields for public contractor profile
  const hasHeadshot = !!member?.headshotUrl;
  const hasResume = false; // member.resumeUrl
  const hasJobHistory = false; // member.jobHistory && member.jobHistory.length > 0
  const isVerified = false; // member.workVerificationStatus === 'VERIFIED'
  const tradesNetworkReady = hasHeadshot && hasResume && hasJobHistory && isVerified;

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/teams"
              className="mb-2 inline-flex items-center text-sm text-slate-700 transition hover:text-[color:var(--text)] dark:text-slate-300"
            >
              ← Back to Teams
            </Link>
            <h1 className="bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-4xl font-bold text-transparent">
              Team Member Profile
            </h1>
          </div>
          <Link href={`/teams/edit/${member.id}`}>
            <Button variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] pb-16">
                <div className="flex flex-col items-center text-center">
                  {/* Headshot placeholder */}
                  <div className="mb-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-white text-5xl font-bold text-[var(--primary)] shadow-xl">
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                  {isActive && (
                    <Badge className="bg-green-500 text-white">
                      <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-white" />
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="-mt-8 space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[color:var(--text)]">
                    {member.name || "Team Member"}
                  </h2>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{member.email}</p>
                </div>

                {/* Role Badge */}
                <div className="flex justify-center">
                  <Badge
                    className={`px-4 py-1 text-sm font-semibold ${
                      isAdminRole(member.role)
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : isManagerOrAbove(member.role)
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <Shield className="mr-1 h-4 w-4" />
                    {member.role}
                  </Badge>
                </div>

                {/* Verification Status */}
                <div className="rounded-lg border-2 border-dashed p-4 text-center">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    {isVerified ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Clock className="h-6 w-6 text-yellow-600" />
                    )}
                    <span className="font-semibold text-[color:var(--text)]">
                      Verification Status
                    </span>
                  </div>
                  <Badge variant={isVerified ? "default" : "secondary"}>
                    {isVerified ? "Verified" : "Pending Verification"}
                  </Badge>
                </div>

                {/* Contact Info */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-[color:var(--text)]">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-slate-700 dark:text-slate-300">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Activity className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {isActive
                        ? daysSinceActive === 0
                          ? "Active today"
                          : `Active ${daysSinceActive}d ago`
                        : `Last seen ${new Date(member.lastSeenAt).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 border-t pt-4">
                  <div className="rounded-lg bg-[var(--surface-1)] p-3 text-center">
                    <div className="text-2xl font-bold text-[color:var(--text)]">
                      {assignedClaims.length}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">Active Claims</div>
                  </div>
                  <div className="rounded-lg bg-[var(--surface-1)] p-3 text-center">
                    <div className="text-2xl font-bold text-[color:var(--text)]">
                      {daysSinceJoined}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300">Days Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Tabbed Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="network">Network</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Professional Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-700 dark:text-slate-300">
                      {/* member.bio || */}
                      No professional summary available yet. Update your profile to add a bio and
                      showcase your expertise.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Assigned Claims
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {assignedClaims.length === 0 ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        No claims currently assigned
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {assignedClaims.map((claim) => (
                          <Link
                            key={claim.id}
                            href={`/claims/${claim.id}`}
                            className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-[var(--surface-1)]"
                          >
                            <div>
                              <div className="font-medium text-[color:var(--text)]">
                                {claim.claimNumber}
                              </div>
                              <div className="text-xs text-slate-700 dark:text-slate-300">
                                {claim.typeOfLoss}
                              </div>
                            </div>
                            <Badge variant="outline">{claim.status}</Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Resume/History Tab */}
              <TabsContent value="resume" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Resume & Work History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasResume ? (
                      <div className="space-y-4">
                        <Button variant="outline" className="w-full">
                          <Download className="mr-2 h-4 w-4" />
                          Download Resume
                        </Button>
                        {/* Job history list */}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <FileText className="mx-auto mb-4 h-16 w-16 text-slate-700 dark:text-slate-300" />
                        <p className="mb-4 text-slate-700 dark:text-slate-300">
                          No resume uploaded yet
                        </p>
                        <Link href={`/teams/edit/${member.id}`}>
                          <Button>Upload Resume</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Professional Experience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Work history and professional experience will appear here once added.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivities.length === 0 ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        No recent activity
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recentActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start gap-3 rounded-lg border p-3"
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-1)]">
                              <Activity className="h-4 w-4 text-[var(--primary)]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-[color:var(--text)]">
                                {activity.description}
                              </p>
                              <p className="text-xs text-slate-700 dark:text-slate-300">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Network Readiness Tab */}
              <TabsContent value="network" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-5 w-5" />
                      Trades Network Profile Readiness
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Readiness Checklist */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          {hasHeadshot ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-medium">Professional Headshot</span>
                        </div>
                        <Badge variant={hasHeadshot ? "default" : "secondary"}>
                          {hasHeadshot ? "Complete" : "Pending"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          {hasResume ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-medium">Resume/CV Uploaded</span>
                        </div>
                        <Badge variant={hasResume ? "default" : "secondary"}>
                          {hasResume ? "Complete" : "Pending"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          {hasJobHistory ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-medium">Work History Documented</span>
                        </div>
                        <Badge variant={hasJobHistory ? "default" : "secondary"}>
                          {hasJobHistory ? "Complete" : "Pending"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          {isVerified ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          )}
                          <span className="text-sm font-medium">Work Verification</span>
                        </div>
                        <Badge variant={isVerified ? "default" : "secondary"}>
                          {isVerified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {/* Final Status */}
                    <div
                      className={`rounded-xl border-2 p-6 text-center ${
                        tradesNetworkReady
                          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                          : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-center gap-2">
                        {tradesNetworkReady ? (
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        ) : (
                          <AlertCircle className="h-8 w-8 text-yellow-600" />
                        )}
                        <h3 className="text-xl font-bold">
                          Profile Ready for Trades Network: {tradesNetworkReady ? "YES" : "NO"}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {tradesNetworkReady
                          ? "This profile meets all requirements and can be published to the Trades Network directory."
                          : "Complete the checklist above to make this profile eligible for the Trades Network."}
                      </p>
                      {tradesNetworkReady && (
                        <Button className="mt-4" size="lg">
                          <Network className="mr-2 h-4 w-4" />
                          Publish to Trades Network
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
