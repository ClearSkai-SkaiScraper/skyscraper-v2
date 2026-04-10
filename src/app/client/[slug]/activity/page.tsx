import { Activity, CheckCircle, Clock, FileText, MessageSquare } from "lucide-react";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface ClientActivityPageProps {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export default async function ClientActivityPage({ params }: ClientActivityPageProps) {
  const { slug } = params;

  // Fetch client-visible timeline events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let activities: any[] = [];

  try {
    // Get all client-visible timeline events for claims related to this client
    const claimsForClient = await prisma.claims.findMany({
      where: { clientId: slug },
      select: { id: true },
    });

    const claimIds = claimsForClient.map((c) => c.id);

    if (claimIds.length > 0) {
      activities = await prisma.claim_timeline_events.findMany({
        where: {
          claim_id: { in: claimIds },
          visible_to_client: true,
        },
        orderBy: { occurred_at: "desc" },
        take: 50,
      });
    }
  } catch (error) {
    logger.error("[ClientActivityPage] Error fetching activities:", error);
    // Gracefully handle DB errors
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case "claim_created":
      case "status_changed":
        return <CheckCircle className="h-5 w-5" />;
      case "file_uploaded":
      case "document_shared":
      case "report_generated":
        return <FileText className="h-5 w-5" />;
      case "message_added":
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  }

  function getActivityColor(type: string) {
    switch (type) {
      case "claim_created":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
      case "status_changed":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
      case "file_uploaded":
      case "document_shared":
      case "report_generated":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400";
      case "message_added":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Activity</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Recent updates and progress on your projects.
        </p>
      </header>

      {activities.length === 0 ? (
        <div className="rounded-lg border bg-card p-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Activity className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">No activity yet</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                As your projects progress, updates will appear here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute bottom-0 left-5 top-0 w-px bg-slate-200 dark:bg-slate-700" />

            {activities.map((activity) => (
              <div key={activity.id} className="relative flex gap-4">
                {/* Timeline dot */}
                <div
                  className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${getActivityColor(activity.type)}`}
                >
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground">{activity.title}</h3>
                      {activity.body && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {activity.body}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
