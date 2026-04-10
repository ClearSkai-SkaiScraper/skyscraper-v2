import { Calendar, Hammer, MapPin } from "lucide-react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface ClientProjectsPageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage({ params }: ClientProjectsPageProps) {
  const { slug } = params;

  let projects: any[] = [];

  try {
    // Fetch claims/projects for this client
    projects = await prisma.claims.findMany({
      where: { clientId: slug },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (error) {
    logger.error("[ClientProjectsPage] Error:", error);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Track jobs, repairs, and improvements connected to your home.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-lg border bg-card p-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Hammer className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">No projects yet</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                When your contractor creates projects for you, they&apos;ll appear here with timelines
                and status updates.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Hammer className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">
                    {project.claimNumber || "Project"}
                  </h3>
                  {project.propertyAddress && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {project.propertyAddress}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1 capitalize dark:bg-slate-800">
                      {project.status || "Active"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
