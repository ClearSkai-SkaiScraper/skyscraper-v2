"use client";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { AlertCircle, Briefcase, CheckCircle2, Clock, Plus } from "lucide-react";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  title: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  claimNumber?: string;
  contractorName?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    icon: Clock,
  },
  active: {
    label: "Active",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    icon: CheckCircle2,
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortalProjectsPage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/portal/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects ?? data ?? []);
        }
      } catch {
        // silently fail — empty state will show
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  /* ── Loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-400 border-t-transparent" />
      </div>
    );
  }

  const active = projects.filter((p) => p.status === "active");
  const completed = projects.filter((p) => p.status === "completed");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <PortalPageHero
        title="My Projects"
        subtitle="Track your restoration and repair projects from start to finish."
        icon={Briefcase}
        gradient="violet"
        stats={[
          { label: "Total", value: projects.length },
          { label: "Active", value: active.length },
          { label: "Completed", value: completed.length },
        ]}
        action={
          <Button asChild>
            <a href="/portal/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </a>
          </Button>
        }
      />

      {projects.length === 0 ? (
        /* ── Empty state ───────────────────────────────────── */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 p-4 dark:from-violet-900/40 dark:to-purple-900/40">
              <Briefcase className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No projects yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Start a new project to track your home restoration work, connect with contractors, and
              manage timelines.
            </p>
            <Button className="mt-4" asChild>
              <a href="/portal/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Start a Project
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ── Project list ──────────────────────────────────── */
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Project Row                                                        */
/* ------------------------------------------------------------------ */

function ProjectRow({ project }: { project: Project }) {
  const cfg = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/40">
          <Briefcase className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900 dark:text-white">{project.title}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            {new Date(project.updatedAt).toLocaleDateString()}
            {project.contractorName && <span>• {project.contractorName}</span>}
            {project.claimNumber && (
              <Badge variant="outline" className="text-[10px]">
                Claim #{project.claimNumber}
              </Badge>
            )}
          </div>
        </div>
        <Badge className={cfg.color}>
          <Icon className="mr-1 h-3 w-3" />
          {cfg.label}
        </Badge>
      </CardContent>
    </Card>
  );
}
