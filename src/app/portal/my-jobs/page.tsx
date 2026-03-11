"use client";

import { logger } from "@/lib/logger";
import { format, isValid } from "date-fns";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Hammer,
  Inbox,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Send,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { SubmitWorkRequestModal } from "@/components/portal/SubmitWorkRequestModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * My Jobs Page - Standalone Portal (no slug required)
 * Shows client's work requests and shared projects
 */

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  tradeType?: string;
  urgency?: string;
}

interface SharedClaim {
  id: string;
  claimNumber: string;
  address: string;
  status: string;
  sharedAt?: string;
  title?: string;
  description?: string;
  category?: string;
  urgency?: string;
  photos?: string[];
  contractor?: {
    id: string;
    name: string;
    logo?: string | null;
    phone?: string | null;
    trade?: string | null;
  } | null;
}

interface WorkRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  urgency?: string;
  category?: string;
  contractor?: { name: string; logo?: string } | null;
}

// Demo job to show homeowners the flow - with generic contractor
const DEMO_JOB: Job = {
  id: "demo-job-1",
  title: "Security Cameras & Driveway Lighting",
  description:
    "Your contractor is scheduled to assess your property for security camera placement and smart driveway lighting installation. They'll determine optimal camera angles and lighting zones.",
  status: "in_progress",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  tradeType: "Smart Home & Technology",
  urgency: "normal",
};

// Demo shared project to show the tracking flow
const DEMO_SHARED_CLAIM: SharedClaim = {
  id: "demo-claim-1",
  claimNumber: "WR-DEMO01",
  address: "123 Memory Ln, Phoenix, AZ 85001",
  status: "in_progress",
  sharedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  title: "Security Cameras & Driveway Lighting",
  description: "Site assessment for optimal camera placement and smart driveway lighting.",
  category: "Smart Home & Technology",
  contractor: {
    id: "demo-contractor-1",
    name: "Demo Contractor",
    logo: null,
    trade: "Smart Home",
  },
};

export default function MyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sharedClaims, setSharedClaims] = useState<SharedClaim[]>([]);
  const [workRequests, setWorkRequests] = useState<WorkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWorkRequestModal, setShowWorkRequestModal] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(true);
  const [demoReady, setDemoReady] = useState(false);
  const [showDemoJob, setShowDemoJob] = useState(false);
  const [showDemoClaim, setShowDemoClaim] = useState(false);
  const [showDemoJobDetail, setShowDemoJobDetail] = useState(false);
  const [showDemoProjectDetail, setShowDemoProjectDetail] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("portalDemoMode");
    if (stored !== null) {
      setDemoEnabled(stored === "true");
    }
    setDemoReady(true);

    const handleDemoChange = () => {
      const updated = window.localStorage.getItem("portalDemoMode");
      setDemoEnabled(updated !== "false");
    };

    window.addEventListener("portal-demo-mode-changed", handleDemoChange);
    return () => window.removeEventListener("portal-demo-mode-changed", handleDemoChange);
  }, []);

  useEffect(() => {
    if (demoReady) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoReady, demoEnabled]);

  async function fetchData() {
    try {
      // Fetch work requests
      const jobsRes = await fetch("/api/portal/work-requests");
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        const realJobs = jobsData.requests || [];
        setJobs(realJobs);
        // Also populate the Work Requests tab with all requests
        setWorkRequests(realJobs);
        // Show demo job if no real jobs exist
        setShowDemoJob(demoEnabled && realJobs.length === 0);
      } else {
        setShowDemoJob(demoEnabled);
      }

      // Fetch shared claims
      const claimsRes = await fetch("/api/portal/shared-claims");
      if (claimsRes.ok) {
        const claimsData = await claimsRes.json();
        const realClaims = claimsData.claims || [];
        setSharedClaims(realClaims);
        // Show demo claim if no real claims exist
        setShowDemoClaim(demoEnabled && realClaims.length === 0);
      } else {
        setShowDemoClaim(demoEnabled);
      }
    } catch (error) {
      logger.error("Failed to fetch data:", error);
      setShowDemoJob(demoEnabled);
      setShowDemoClaim(demoEnabled);
    } finally {
      setLoading(false);
    }
  }

  // Display jobs - include demo job if no real jobs
  const displayJobs = showDemoJob && demoEnabled && jobs.length === 0 ? [DEMO_JOB] : jobs;

  // Display claims - include demo claim if no real claims
  const displayClaims =
    showDemoClaim && demoEnabled && sharedClaims.length === 0 ? [DEMO_SHARED_CLAIM] : sharedClaims;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return isValid(date) ? format(date, "MMM d, yyyy") : "N/A";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "in_progress":
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  // Stats calculations
  const pendingJobs = jobs.filter((j) => j.status.toLowerCase() === "pending").length;
  const activeJobs = jobs.filter((j) =>
    ["in_progress", "active"].includes(j.status.toLowerCase())
  ).length;
  const completedJobs = jobs.filter((j) => j.status.toLowerCase() === "completed").length;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="My Jobs"
        subtitle="Track your work requests, view shared claims, and manage all your home improvement projects in one place."
        icon={Briefcase}
        badge="Project Management"
        gradient="violet"
        stats={[
          { label: "Total Jobs", value: jobs.length },
          { label: "Pending", value: pendingJobs },
          { label: "In Progress", value: activeJobs },
          { label: "Completed", value: completedJobs },
        ]}
        action={
          <Button
            size="lg"
            onClick={() => setShowWorkRequestModal(true)}
            className="bg-white text-violet-700 shadow-lg hover:bg-violet-50 dark:bg-slate-800/50 dark:text-violet-300"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Work Request
          </Button>
        }
      />

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:flex lg:w-auto lg:grid-cols-none">
          <TabsTrigger value="requests" className="gap-2">
            <Wrench className="h-4 w-4" />
            My Projects ({displayJobs.length})
          </TabsTrigger>
          <TabsTrigger value="shared" className="gap-2">
            <FileText className="h-4 w-4" />
            Shared Projects ({sharedClaims.length})
          </TabsTrigger>
          <TabsTrigger value="work-requests" className="gap-2">
            <Inbox className="h-4 w-4" />
            Work Requests ({workRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-6">
          {/* Demo Mode Banner */}
          {showDemoJob && jobs.length === 0 && (
            <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800">
                  <span className="text-xl">👋</span>
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Preview Mode</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This is a demo project showing how your requests will appear. Submit your first
                    real request to get started!
                  </p>
                </div>
              </div>
            </div>
          )}

          {displayJobs.length === 0 ? (
            <Card className="border-2 bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-900/10 dark:to-slate-900">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                  <Hammer className="h-10 w-10 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold dark:text-white">No projects yet</h3>
                <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">
                  Submit a project request to connect with contractors for your home projects.
                </p>
                <Button
                  onClick={() => setShowWorkRequestModal(true)}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Submit Project Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayJobs.map((job) => (
                <Link key={job.id} href={`/portal/jobs/${job.id}`} className="block">
                  <Card
                    className={`group relative overflow-hidden transition-all hover:shadow-lg ${job.id.startsWith("demo") ? "border-2 border-amber-300 dark:border-amber-700" : ""}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                            <Wrench className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {job.id.startsWith("demo") ? "🏠 " + job.title : job.title}
                            </CardTitle>
                            {job.tradeType && (
                              <CardDescription>
                                {job.id.startsWith("demo")
                                  ? "ClearSkai Technologies"
                                  : job.tradeType}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <Badge
                          className={`${getStatusColor(job.status)} ${job.id.startsWith("demo") ? "bg-blue-100 text-blue-800" : ""}`}
                        >
                          {job.id.startsWith("demo") ? (
                            <Clock className="mr-1 h-3 w-3" />
                          ) : job.status === "in_progress" ? (
                            <Clock className="mr-1 h-3 w-3" />
                          ) : job.status === "completed" ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : null}
                          {job.id.startsWith("demo")
                            ? "In Progress"
                            : job.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {job.description && (
                        <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                          {job.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Created {formatDate(job.createdAt)}</span>
                        {job.id.startsWith("demo") ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 text-xs text-emerald-600"
                          >
                            Click to view details
                          </Badge>
                        ) : (
                          job.urgency && (
                            <Badge
                              variant="outline"
                              className={`text-xs ${job.urgency === "urgent" ? "border-red-300 text-red-600" : ""}`}
                            >
                              {job.urgency}
                            </Badge>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="mt-6">
          {/* Demo Mode Banner for Claims */}
          {showDemoClaim && sharedClaims.length === 0 && (
            <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800">
                  <span className="text-xl">📂</span>
                </div>
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">Preview Mode</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This is a demo project showing how shared projects will appear with document
                    tracking. When a contractor shares a real project with you, it will show here!
                  </p>
                </div>
              </div>
            </div>
          )}

          {displayClaims.length === 0 ? (
            <Card className="border-2 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-slate-900">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/30">
                  <FileText className="h-10 w-10 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold dark:text-white">
                  No shared projects yet
                </h3>
                <p className="mb-4 max-w-md text-slate-500 dark:text-slate-400">
                  When a contractor accepts your work request, the project will appear here so you
                  can track progress, upload photos, and communicate.
                </p>
                <Button
                  onClick={() => setShowWorkRequestModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Submit a Work Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayClaims.map((claim) => (
                <Card
                  key={claim.id}
                  className={`group relative overflow-hidden transition-all hover:shadow-lg ${claim.id.startsWith("demo") ? "border-2 border-amber-300 dark:border-amber-700" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {claim.contractor?.logo ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                            <img
                              src={claim.contractor.logo}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
                            <Wrench className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-lg">
                            {claim.title || claim.claimNumber}
                          </CardTitle>
                          <CardDescription>
                            {claim.contractor?.name || "Contractor"}
                            {claim.contractor?.trade && ` • ${claim.contractor.trade}`}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={`${getStatusColor(claim.status)} ${claim.id.startsWith("demo") ? "bg-amber-100 text-amber-800" : ""}`}
                      >
                        {claim.status === "in_progress" && <Clock className="mr-1 h-3 w-3" />}
                        {claim.status === "completed" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {claim.id.startsWith("demo") ? "🎯 DEMO" : claim.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {claim.description && (
                      <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                        {claim.description}
                      </p>
                    )}
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{claim.address}</span>
                    </div>
                    {claim.category && (
                      <Badge variant="outline" className="mb-3 text-xs">
                        {claim.category.replace(/_/g, " ")}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Shared {claim.sharedAt ? formatDate(claim.sharedAt) : ""}
                      </span>
                      <Link href={`/portal/claims/${claim.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 group-hover:border-indigo-300 group-hover:bg-indigo-50"
                        >
                          View{" "}
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Work Requests Tab — Timeline view of all submitted requests */}
        <TabsContent value="work-requests" className="mt-6">
          {workRequests.length === 0 ? (
            <Card className="border-2 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-slate-900">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                  <Send className="h-10 w-10 text-white" />
                </div>
                <h3 className="mb-2 text-xl font-semibold dark:text-white">No work requests yet</h3>
                <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">
                  Submit a work request to get quotes from contractors or send directly to a trusted
                  pro.
                </p>
                <Button
                  onClick={() => setShowWorkRequestModal(true)}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Work Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {workRequests.map((wr) => (
                <Card
                  key={wr.id}
                  className="group relative overflow-hidden transition-all hover:shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-start gap-4">
                        {wr.contractor?.logo ? (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                            <img
                              src={wr.contractor.logo}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                            <Send className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-foreground">{wr.title}</h4>
                          {wr.contractor && (
                            <p className="text-sm text-muted-foreground">
                              Sent to: {wr.contractor.name}
                            </p>
                          )}
                          {!wr.contractor && (
                            <p className="text-sm text-muted-foreground">Posted to Job Board</p>
                          )}
                          {wr.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                              {wr.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(wr.createdAt)}
                            </span>
                            {wr.category && (
                              <Badge variant="outline" className="text-xs">
                                {wr.category.replace(/_/g, " ")}
                              </Badge>
                            )}
                            {wr.urgency && wr.urgency !== "normal" && (
                              <Badge
                                variant="outline"
                                className={`text-xs ${wr.urgency === "emergency" ? "border-red-300 text-red-600" : wr.urgency === "urgent" ? "border-orange-300 text-orange-600" : ""}`}
                              >
                                {wr.urgency}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(wr.status)}>
                          {wr.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                          {wr.status === "accepted" && <CheckCircle className="mr-1 h-3 w-3" />}
                          {wr.status.replace(/_/g, " ")}
                        </Badge>
                        <Link href={`/portal/jobs/${wr.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            View <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SubmitWorkRequestModal
        isOpen={showWorkRequestModal}
        onClose={() => setShowWorkRequestModal(false)}
        slug=""
      />

      {/* Demo Job Detail Modal */}
      <Dialog open={showDemoJobDetail} onOpenChange={setShowDemoJobDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Wrench className="h-5 w-5" />
              </div>
              🏠 Security Cameras & Driveway Lighting
            </DialogTitle>
            <DialogDescription>Project with ClearSkai Technologies</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Banner */}
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">In Progress</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Site assessment scheduled
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Active</Badge>
              </div>
            </div>

            {/* Contractor Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contractor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white">
                    CS
                  </div>
                  <div>
                    <p className="font-semibold">ClearSkai Technologies, LLC</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Smart Home & Technology
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="h-4 w-4" />
                    (480) 555-SKAI
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <MapPin className="h-4 w-4" />
                    Phoenix, AZ
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-slate-600 dark:text-slate-400">
                  ClearSkai Technologies will assess your property to determine optimal camera
                  placements for full coverage and identify the best zones for smart driveway
                  lighting installation.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    Scheduled: Tomorrow, 9-11am
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <User className="h-4 w-4" />
                    Technician: Damien Braun
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="h-full w-0.5 bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="pb-4">
                      <p className="font-medium dark:text-white">Request Submitted</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Yesterday at 2:30 PM
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="h-full w-0.5 bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="pb-4">
                      <p className="font-medium dark:text-white">Contractor Responded</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Yesterday at 4:15 PM
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium dark:text-white">Site Assessment</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Scheduled for tomorrow, 9-11am
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/portal/messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message Contractor
                </Link>
              </Button>
              <Button onClick={() => setShowDemoJobDetail(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
