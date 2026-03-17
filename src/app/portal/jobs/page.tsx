"use client";

import { ArrowRight, Briefcase, Loader2, Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Job {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  tradeType?: string;
  urgency?: string;
}

export default function PortalJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/portal/jobs");
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      logger.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "in_progress":
      case "active":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="text-slate-500 dark:text-slate-400">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PortalPageHero
        title="My Jobs"
        subtitle="Track your work requests and projects with contractors."
        icon={Briefcase}
        badge="Jobs"
        gradient="blue"
        stats={[
          { label: "Total Jobs", value: jobs.length },
          {
            label: "Active",
            value: jobs.filter((j) =>
              ["active", "in_progress", "pending"].includes(j.status.toLowerCase())
            ).length,
          },
          {
            label: "Completed",
            value: jobs.filter((j) => j.status.toLowerCase() === "completed").length,
          },
        ]}
        action={
          <Link href="/portal/post-job">
            <Button variant="secondary" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Post a Job
            </Button>
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <Card className="border-2 border-dashed bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/10 dark:to-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Wrench className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold dark:text-white">No jobs yet</h3>
            <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">
              Post a job to find qualified contractors in your area, or browse your active work
              requests in My Jobs.
            </p>
            <div className="flex gap-3">
              <Link href="/portal/post-job">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Post a Job
                </Button>
              </Link>
              <Link href="/portal/find-a-pro">
                <Button variant="outline">Find a Pro</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Link key={job.id} href={`/portal/jobs/${job.id}`}>
              <Card className="h-full transition-all hover:scale-[1.01] hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {job.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                      {job.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      {job.tradeType && (
                        <Badge variant="outline" className="text-xs">
                          {job.tradeType}
                        </Badge>
                      )}
                      {job.urgency && (
                        <Badge variant="outline" className="text-xs">
                          {job.urgency}
                        </Badge>
                      )}
                    </div>
                    <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-sm font-medium text-blue-600">
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
