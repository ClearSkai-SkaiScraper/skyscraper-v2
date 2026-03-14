import { currentUser } from "@clerk/nextjs/server";
import {
  Archive,
  ArrowLeft,
  Calendar,
  Camera,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Plus,
  Send,
  Sparkles,
  Upload,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import RetailAssistant from "@/components/ai/RetailAssistant";
import { DocActionsMenu } from "@/components/documents/DocActionsMenu";
import { ArchiveJobButton } from "@/components/jobs/ArchiveJobButton";
import { ClientShareWidget } from "@/components/jobs/ClientShareWidget";
import { RequestCloseoutButton } from "@/components/jobs/RequestCloseoutButton";
import { TransferJobDropdown } from "@/components/jobs/TransferJobDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getResolvedOrgResult } from "@/lib/auth/getResolvedOrgId";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getWorkflowStatusInfo, mapToWorkflowStatus } from "@/lib/statusMapping";

import { EditableInfoCardsWrapper } from "./EditableInfoCards";
import { RetailJobClient } from "./RetailJobClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Types
interface RetailJob {
  id: string;
  title: string;
  description: string | null;
  source: string;
  value: number | null;
  probability: number | null;
  stage: string;
  temperature: string;
  assignedTo: string | null;
  createdBy: string | null;
  followUpDate: Date | null;
  closedAt: Date | null;
  jobCategory: string;
  jobType: string | null;
  workType: string | null;
  urgency: string | null;
  budget: number | null;
  warmthScore: number | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contactId: string;
  orgId: string;
  clientId: string | null;
}

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  userName: string;
  createdAt: Date;
}

interface Document {
  id: string;
  title: string | null;
  type: string | null;
  publicUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: Date;
}

interface Photo {
  id: string;
  photoUrl: string;
  caption: string | null;
  category: string | null;
  createdAt: Date;
}

// Helper functions
async function getRetailJob(id: string, orgId: string) {
  // Retail jobs are: out_of_pocket, financed, or repair
  // (NOT claim - those go to /claims/)

  let lead;
  try {
    lead = await prisma.leads.findFirst({
      where: {
        id,
        orgId,
        jobCategory: {
          in: ["out_of_pocket", "financed", "repair"],
        },
      },
    });
  } catch (err) {
    logger.error("[getRetailJob] Error finding lead:", err);
    return null;
  }

  if (!lead) return null;

  let contact: any = null;
  try {
    contact = await prisma.contacts.findUnique({
      where: { id: lead.contactId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        street: true,
        city: true,
        state: true,
        zipCode: true,
      },
    });
  } catch (err) {
    logger.error("[getRetailJob] Error finding contact:", err);
    // Continue without contact data
  }

  let activities: Activity[] = [];
  try {
    const activityRows = await prisma.activities.findMany({
      where: { leadId: id, orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        userName: true,
        createdAt: true,
      },
    });
    activities = activityRows as Activity[];
  } catch {
    // Table might not exist or have different structure
  }

  // Get documents from FileAsset model
  let documents: Document[] = [];
  try {
    const fileAssets = await prisma.file_assets.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        publicUrl: true,
        sizeBytes: true,
        createdAt: true,
        category: true,
      },
    });
    documents = fileAssets.map((f) => ({
      id: f.id,
      title: f.filename,
      type: f.category,
      publicUrl: f.publicUrl,
      fileSize: f.sizeBytes,
      mimeType: f.mimeType,
      createdAt: f.createdAt,
    }));
  } catch {
    // Table might not exist
  }

  // Get photos from FileAsset with image mimeTypes
  let photos: Photo[] = [];
  try {
    const photoRecords = await prisma.file_assets.findMany({
      where: {
        leadId: id,
        mimeType: { startsWith: "image/" },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        publicUrl: true,
        note: true,
        category: true,
        createdAt: true,
      },
    });
    photos = photoRecords.map((p) => ({
      id: p.id,
      photoUrl: p.publicUrl,
      caption: p.note,
      category: p.category,
      createdAt: p.createdAt,
    }));
  } catch {
    // Table might not exist or have different structure
  }

  return {
    job: lead as RetailJob,
    contact,
    activities: activities as Activity[],
    documents,
    photos,
  };
}

function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    proposal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "in-progress": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    completed: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  };
  return (
    colors[stage.toLowerCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  );
}

function getUrgencyColor(urgency: string | null): string {
  if (!urgency) return "bg-gray-100 text-gray-800";
  const colors: Record<string, string> = {
    low: "bg-slate-100 text-slate-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };
  return colors[urgency.toLowerCase()] || "bg-gray-100 text-gray-800";
}

// Page component
export default async function RetailJobWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Await params (Next.js 14+ requirement)
  const { id } = await params;

  // Use the proper org resolution - redirects if no org
  const orgResult = await getResolvedOrgResult();

  // Guard: ensure we have a valid org before proceeding
  if (!orgResult.ok) {
    // This shouldn't happen with "required" mode, but guard just in case
    logger.error("[RetailJobWorkspace] Failed to resolve org:", orgResult);
    redirect("/onboarding");
  }

  let result;
  try {
    result = await getRetailJob(id, orgResult.orgId);
  } catch (err) {
    logger.error("[RetailJobWorkspace] Database error:", err);
    throw new Error(
      `Failed to load retail job: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  }

  if (!result) notFound();

  const { job, contact, activities, documents, photos } = result;

  const fullAddress = [
    contact?.street,
    [contact?.city, contact?.state].filter(Boolean).join(", "),
    contact?.zipCode,
  ]
    .filter(Boolean)
    .join(" ");

  const customerName = contact
    ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
    : "Unknown Customer";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header - Amber/Orange gradient matching Retail Workspace */}
      <header className="sticky top-0 z-10 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 px-6 py-4 text-white shadow-xl">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/jobs/retail"
                className="rounded-lg bg-white/10 p-2 text-white/90 hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{job.title || "Retail Job"}</h1>
                  <Badge className="border-white/20 bg-white/20 text-white">
                    {getWorkflowStatusInfo(mapToWorkflowStatus(job.stage)).emoji}{" "}
                    {getWorkflowStatusInfo(mapToWorkflowStatus(job.stage)).label}
                  </Badge>
                  {job.urgency && (
                    <Badge className="border-amber-200/30 bg-amber-200/20 text-white">
                      {job.urgency}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-2 text-sm text-amber-100">
                  <User className="h-4 w-4" />
                  {customerName}
                  {fullAddress && (
                    <>
                      <span className="text-amber-200/50">•</span>
                      <MapPin className="h-4 w-4" />
                      {fullAddress}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Value Badge */}
              {(() => {
                const val = (job as any).estimatedJobValue || job.value;
                if (!val || val <= 0) return null;
                const dollars = val / 100;
                return (
                  <div className="hidden items-center gap-2 sm:flex">
                    <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-sm">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                        <DollarSign className="h-3.5 w-3.5" />
                        {dollars.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-amber-200">
                        Job Value
                      </span>
                    </div>
                  </div>
                );
              })()}
              <TransferJobDropdown jobId={job.id} currentCategory={job.jobCategory || "retail"} />
              <ArchiveJobButton jobId={job.id} jobTitle={job.title} type="lead" />
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href={`/leads/${job.id}/edit?returnTo=retail`}>Edit Job</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main workspace area */}
          <div className="space-y-6 lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="scope">Scope</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Job Summary Card - Editable */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Job Summary
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Click to edit
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RetailJobClient
                      jobId={job.id}
                      initialJob={{
                        title: job.title,
                        description: job.description,
                        value: job.value,
                        budget: job.budget,
                        stage: job.stage,
                        workType: job.workType,
                      }}
                    />
                    <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Created
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {formatDate(job.createdAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Editable Property & Customer Info Cards */}
                <EditableInfoCardsWrapper
                  contactId={contact?.id || null}
                  initialContact={contact}
                  jobSource={job.source}
                  followUpDate={job.followUpDate}
                />

                {/* Closeout Lifecycle */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Archive className="h-5 w-5" />
                      Lifecycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RequestCloseoutButton
                      entityId={job.id}
                      entityType="lead"
                      entityTitle={job.title}
                      currentStatus={job.stage}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Scope Tab */}
              <TabsContent value="scope" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Scope of Work
                      </CardTitle>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/leads/${job.id}/retail-builder`}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Line Item
                        </Link>
                      </Button>
                    </div>
                    <CardDescription>Define the work to be performed for this job</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                      <Wrench className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        No scope items defined
                      </h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Add line items to define the scope of work for this job
                      </p>
                      <Button className="mt-4" variant="outline" asChild>
                        <Link href={`/leads/${job.id}/retail-builder`}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Item
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Estimate Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Estimate / Proposal
                      </CardTitle>
                      <Button size="sm" asChild>
                        <Link href={`/leads/${job.id}/retail-builder`}>
                          <Send className="mr-2 h-4 w-4" />
                          Generate Proposal
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Subtotal
                        </p>
                        <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(job.value)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Tax
                        </p>
                        <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
                          $0.00
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          Total
                        </p>
                        <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(job.value)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Photos ({photos.length})
                      </CardTitle>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/uploads?leadId=${job.id}&type=photo`}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Photos
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {photos.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                        <Camera className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          No photos yet
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Upload photos to document the property and work
                        </p>
                        <Button className="mt-4" variant="outline" asChild>
                          <Link href={`/uploads?leadId=${job.id}&type=photo`}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload First Photo
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <img
                              src={photo.photoUrl}
                              alt={photo.caption || "Job photo"}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                            {photo.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="text-xs text-white">{photo.caption}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documents ({documents.length})
                      </CardTitle>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/uploads?leadId=${job.id}&type=document`}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Document
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {documents.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                        <FileText className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          No documents yet
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Upload contracts, proposals, and other documents
                        </p>
                        <Button className="mt-4" variant="outline" asChild>
                          <Link href={`/uploads?leadId=${job.id}&type=document`}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload First Document
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-slate-400" />
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {doc.title || "Untitled"}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {doc.type} • {formatDate(doc.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {doc.publicUrl && (
                                <DocActionsMenu
                                  doc={{
                                    id: doc.id,
                                    title: doc.title || "Untitled",
                                    url: doc.publicUrl,
                                    mimeType: doc.mimeType,
                                  }}
                                  showArchive={false}
                                  showDelete={false}
                                  showAttach={false}
                                  compact
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                        <Clock className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          No activity yet
                        </h3>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Activity will appear here as you work on this job
                        </p>
                      </div>
                    ) : (
                      <div className="relative space-y-4">
                        <div className="absolute bottom-0 left-4 top-0 w-px bg-slate-200 dark:bg-slate-700" />
                        {activities.map((activity) => (
                          <div key={activity.id} className="relative flex gap-4 pl-10">
                            <div className="absolute left-2 top-1 h-4 w-4 rounded-full border-2 border-white bg-slate-400 dark:border-slate-900" />
                            <div className="flex-1 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  {activity.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {formatDate(activity.createdAt)}
                                </p>
                              </div>
                              {activity.description && (
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                                  {activity.description}
                                </p>
                              )}
                              <p className="mt-2 text-xs text-slate-400">by {activity.userName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Assistant Tab */}
              <TabsContent value="ai" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      Retail AI Assistant
                    </CardTitle>
                    <CardDescription>
                      Get AI-powered help with estimates, pricing, scheduling, and customer
                      communication
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RetailAssistant jobId={job.id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                  <Link href={`/appointments/schedule?retailJobId=${job.id}`}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Job
                  </Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link href={`/leads/${job.id}/retail-builder`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Proposal
                  </Link>
                </Button>
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/uploads?leadId=${job.id}&type=photo`}>
                    <Camera className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Link>
                </Button>
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/uploads?leadId=${job.id}&type=document`}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Documents
                  </Link>
                </Button>
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/leads/${job.id}/edit?returnTo=retail`}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Edit Job Details
                  </Link>
                </Button>
                <Separator className="my-3" />
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/reports/new?leadId=${job.id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Report
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Client Share Widget */}
            <ClientShareWidget
              jobId={job.id}
              jobType="lead"
              clientId={job.clientId}
              clientName={customerName}
              clientEmail={contact?.email || undefined}
            />

            {/* Job Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Job Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Stage</span>
                    <Badge
                      className={getWorkflowStatusInfo(mapToWorkflowStatus(job.stage)).badgeColor}
                    >
                      {getWorkflowStatusInfo(mapToWorkflowStatus(job.stage)).emoji}{" "}
                      {getWorkflowStatusInfo(mapToWorkflowStatus(job.stage)).label}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Temperature</span>
                    <Badge variant="outline" className="capitalize">
                      {job.temperature || "N/A"}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Probability</span>
                    <span className="text-sm font-medium">
                      {job.probability ? `${job.probability}%` : "Not set"}
                    </span>
                  </div>
                  {job.warmthScore && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Warmth Score
                        </span>
                        <span className="text-sm font-medium">{job.warmthScore}/100</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Key Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Created</span>
                    <span className="text-sm">{formatDate(job.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Last Updated</span>
                    <span className="text-sm">{formatDate(job.updatedAt)}</span>
                  </div>
                  {job.followUpDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Follow-up</span>
                      <span className="text-sm">{formatDate(job.followUpDate)}</span>
                    </div>
                  )}
                  {job.closedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Closed</span>
                      <span className="text-sm">{formatDate(job.closedAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
