/**
 * Claim Activity Log Page
 * Full audit trail for claim events (Pro view)
 */

import { format } from "date-fns";
import {
  Activity,
  CheckCircle,
  CheckSquare,
  Clock,
  Edit,
  Eye,
  FileText,
  MessageSquare,
  Upload,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageHero } from "@/components/layout/PageHero";
import { getClaimActivity } from "@/lib/claims/activityLog";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

interface ActivityPageProps {
  params: { claimId: string };
}

const getIconForType = (type: string) => {
  if (type.includes("task_created") || type.includes("task_completed")) return CheckSquare;
  if (type.includes("file") || type.includes("upload")) return Upload;
  if (type.includes("message")) return MessageSquare;
  if (type.includes("status")) return CheckCircle;
  if (type.includes("viewed") || type.includes("portal")) return Eye;
  if (type.includes("note") || type.includes("update")) return Edit;
  if (type.includes("contractor") || type.includes("review")) return Users;
  return FileText;
};

const getColorForType = (type: string) => {
  if (type.includes("task_created")) return "bg-indigo-500";
  if (type.includes("task_completed")) return "bg-emerald-500";
  if (type.includes("file") || type.includes("upload")) return "bg-blue-500";
  if (type.includes("message")) return "bg-green-500";
  if (type.includes("status")) return "bg-purple-500";
  if (type.includes("viewed")) return "bg-yellow-500";
  if (type.includes("contractor")) return "bg-orange-500";
  return "bg-primary";
};

export default async function ClaimActivityPage({ params }: ActivityPageProps) {
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok" || !ctx.orgId) {
    return <NoOrgMembershipBanner title="Claim Activity" />;
  }

  // Verify claim belongs to org
  const claim = await prisma.claims.findFirst({
    where: {
      id: params.claimId,
      orgId: ctx.orgId,
    },
    select: {
      id: true,
      title: true,
      claimNumber: true,
      status: true,
    },
  });

  if (!claim) {
    notFound();
  }

  // Get full activity log (including hidden events for pros)
  const activities = await getClaimActivity(claim.id, true);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8">
      <PageHero
        title="Activity Log"
        subtitle={`Complete audit trail for ${claim.title} (#${claim.claimNumber})`}
        icon={<Activity className="h-6 w-6" />}
      />

      {activities.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-8 py-12 text-center shadow-sm">
          <Clock className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No Activity Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Events will appear here as work progresses on this claim.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-6">
            {activities.map((event, idx) => {
              const Icon = getIconForType(event.type);
              const colorClass = getColorForType(event.type);
              const isLast = idx === activities.length - 1;

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Timeline line */}
                  {!isLast && <div className="absolute left-5 top-12 h-full w-0.5 bg-border" />}

                  {/* Icon */}
                  <div
                    className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-foreground">{event.title}</p>
                          {!event.visibleToClient && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                              Internal Only
                            </span>
                          )}
                        </div>
                        {event.body && (
                          <p className="mt-1 text-sm text-muted-foreground">{event.body}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Event Type: <code className="rounded bg-muted px-1">{event.type}</code>
                        </p>
                      </div>
                      <time className="ml-4 text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "MMM d, yyyy h:mm a")}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-medium text-muted-foreground">Total Events</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{activities.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-medium text-muted-foreground">Client-Visible</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {activities.filter((a) => a.visibleToClient).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-sm font-medium text-muted-foreground">Internal Only</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {activities.filter((a) => !a.visibleToClient).length}
          </p>
        </div>
      </div>
    </div>
  );
}
