/**
 * Trades Job Detail Page
 * Shows full details of a ClientWorkRequest for contractors to review and respond
 */

import { currentUser } from "@clerk/nextjs/server";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const URGENCY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  emergency: {
    label: "Emergency",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: "⚡",
  },
  urgent: {
    label: "Urgent",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: "🔴",
  },
  normal: {
    label: "Standard",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: "🟢",
  },
  flexible: {
    label: "Flexible",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: "🔵",
  },
};

export default async function TradesJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { jobId } = await params;
  const { action } = await searchParams;

  // Get the contractor's profile
  const proProfile = await prisma.tradesCompanyMember
    .findFirst({
      where: { userId: user.id },
      include: {
        company: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    })
    .catch(() => null);

  // Fetch the job request — try clientWorkRequest first, then jobs table
  const workRequest = await prisma.clientWorkRequest
    .findUnique({
      where: { id: jobId },
      include: {
        Client: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            city: true,
            state: true,
            avatarUrl: true,
            category: true,
          },
        },
        ClientJobResponse: {
          where: proProfile?.id ? { contractorId: proProfile.id } : { contractorId: "none" },
          select: {
            id: true,
            status: true,
            message: true,
            estimatedPrice: true,
            estimatedTimeline: true,
            createdAt: true,
          },
        },
        ClientJobDocument: {
          select: {
            id: true,
            title: true,
            type: true,
            url: true,
          },
          take: 10,
        },
      },
    })
    .catch(() => null);

  // Fallback: check the jobs table (job board lists from jobs table)
  const orgJob = !workRequest
    ? await prisma.jobs
        .findUnique({
          where: { id: jobId },
          include: {
            properties: {
              select: { street: true, city: true, state: true },
            },
            Org: { select: { name: true } },
          },
        })
        .catch(() => null)
    : null;

  // Normalize into a single shape
  const job = workRequest
    ? workRequest
    : orgJob
      ? {
          ...orgJob,
          urgency: orgJob.priority || "normal",
          category: orgJob.jobType || "General",
          budget: orgJob.estimatedCost ? `$${orgJob.estimatedCost.toLocaleString()}` : null,
          timeline: null as string | null,
          summary: null as string | null,
          serviceArea: null as string | null,
          preferredDate: null as Date | null,
          viewCount: 0,
          responseCount: 0,
          requirements: [] as string[],
          lookingFor: [] as string[],
          propertyPhotos: [] as string[],
          city: orgJob.properties?.city || null,
          state: orgJob.properties?.state || null,
          Client: null as any,
          ClientJobResponse: [] as any[],
          ClientJobDocument: [] as any[],
        }
      : null;

  if (!job) notFound();

  const urgency = URGENCY_CONFIG[job.urgency] || URGENCY_CONFIG.normal;
  const hasResponded = (job.ClientJobResponse ?? []).length > 0;
  const myResponse = (job.ClientJobResponse ?? [])[0];
  const clientName =
    job.Client?.firstName && job.Client?.lastName
      ? `${job.Client.firstName} ${job.Client.lastName[0]}.`
      : job.Client?.name || (orgJob ? orgJob.Org?.name : null) || "Homeowner";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20 p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Back Nav */}
        <Link
          href="/trades/jobs"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Job Board
        </Link>

        {/* Header Card */}
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className={urgency.color}>
                    {urgency.icon} {urgency.label}
                  </Badge>
                  <Badge className="bg-white/20 text-white">{job.category}</Badge>
                  {job.status === "pending" && (
                    <Badge className="bg-green-500/20 text-green-100">
                      <CheckCircle className="mr-1 h-3 w-3" /> Open for Quotes
                    </Badge>
                  )}
                </div>
                <h1 className="mb-2 text-3xl font-bold">{job.title}</h1>
                <div className="flex items-center gap-4 text-blue-100">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {clientName}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {job.city || job.Client?.city || "Unknown"},{" "}
                    {job.state || job.Client?.state || ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {job.viewCount !== undefined && (
                <div className="text-right text-sm text-blue-200">
                  {job.viewCount} views • {job.responseCount} responses
                </div>
              )}
            </div>
          </div>

          <CardContent className="p-8">
            {/* Quick Stats Grid */}
            <div className="mb-8 grid gap-4 md:grid-cols-4">
              {job.budget && (
                <div className="rounded-xl border bg-green-50 p-4 dark:bg-green-950/30">
                  <div className="mb-1 flex items-center gap-2 text-sm text-green-600">
                    <DollarSign className="h-4 w-4" />
                    Budget Range
                  </div>
                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                    {job.budget}
                  </p>
                </div>
              )}
              {job.timeline && (
                <div className="rounded-xl border bg-blue-50 p-4 dark:bg-blue-950/30">
                  <div className="mb-1 flex items-center gap-2 text-sm text-blue-600">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </div>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {job.timeline}
                  </p>
                </div>
              )}
              {job.preferredDate && (
                <div className="rounded-xl border bg-purple-50 p-4 dark:bg-purple-950/30">
                  <div className="mb-1 flex items-center gap-2 text-sm text-purple-600">
                    <Calendar className="h-4 w-4" />
                    Preferred Start
                  </div>
                  <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                    {new Date(job.preferredDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {job.serviceArea && (
                <div className="rounded-xl border bg-amber-50 p-4 dark:bg-amber-950/30">
                  <div className="mb-1 flex items-center gap-2 text-sm text-amber-600">
                    <MapPin className="h-4 w-4" />
                    Service Area
                  </div>
                  <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    {job.serviceArea}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="mb-3 text-xl font-semibold">Project Description</h2>
              <div className="rounded-xl border bg-slate-50 p-6 dark:bg-slate-800/50">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300">
                  {job.description}
                </p>
              </div>
            </div>

            {/* Summary */}
            {job.summary && (
              <div className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Summary
                </h2>
                <p className="text-slate-600 dark:text-slate-400">{job.summary}</p>
              </div>
            )}

            {/* Requirements & Looking For */}
            <div className="mb-8 grid gap-6 md:grid-cols-2">
              {(job.requirements ?? []).length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Shield className="h-5 w-5 text-blue-500" />
                    Requirements
                  </h3>
                  <ul className="space-y-2">
                    {(job.requirements ?? []).map((req, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(job.lookingFor ?? []).length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-semibold">
                    <Tag className="h-5 w-5 text-green-500" />
                    Looking For
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(job.lookingFor ?? []).map((item, i) => (
                      <Badge key={i} variant="outline">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Property Photos */}
            {(job.propertyPhotos ?? []).length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-xl font-semibold">Property Photos</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {(job.propertyPhotos ?? []).map((photo, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl border"
                    >
                      <Image
                        src={photo}
                        alt={`Property photo ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {(job.ClientJobDocument ?? []).length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-xl font-semibold">Attached Documents</h2>
                <div className="space-y-2">
                  {(job.ClientJobDocument ?? []).map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                        📄
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-slate-500">{doc.type}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {hasResponded ? "Your Response" : "Submit a Quote"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasResponded ? (
              <div className="rounded-xl border bg-green-50 p-6 dark:bg-green-950/30">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    Quote Submitted
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {myResponse.status}
                  </Badge>
                </div>
                {myResponse.estimatedPrice && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>Estimated Price:</strong> {myResponse.estimatedPrice}
                  </p>
                )}
                {myResponse.estimatedTimeline && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <strong>Timeline:</strong> {myResponse.estimatedTimeline}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {myResponse.message}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Submitted {new Date(myResponse.createdAt).toLocaleDateString()}
                </p>
              </div>
            ) : proProfile?.company ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        Ready to quote as {proProfile.company.name}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Your company info and reviews will be visible to the client.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href={`/trades/jobs/${jobId}?action=quote`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                      <Send className="mr-2 h-5 w-5" />
                      Send Quote
                    </Button>
                  </Link>
                  <Link href="/trades/messages">
                    <Button variant="outline" size="lg">
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Message Client
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:bg-amber-950/30">
                <p className="mb-2 font-medium text-amber-800 dark:text-amber-200">
                  Complete your company profile to submit quotes
                </p>
                <Link href="/trades/onboarding">
                  <Button variant="outline">Set Up Profile</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
