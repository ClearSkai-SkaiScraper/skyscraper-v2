import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PipelineSummary {
  totalLeads: number;
  activeLeads: number;
  stagesProgress: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  recentUpdates: {
    id: string;
    leadId: string;
    fromStage: string;
    toStage: string;
    updatedAt: Date;
    updatedBy: string;
  }[];
  nextActions: {
    leadId: string;
    customerName: string;
    currentStage: string;
    suggestedAction: string;
    priority: "high" | "medium" | "low";
    daysInStage: number;
  }[];
}

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {
    // Get all leads for the organization
    const leads = await prisma.leads.findMany({
      where: { orgId },
      include: {
        contacts: true,
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 2000, // Safety limit — orgs with 2000+ leads need pagination
    });

    const totalLeads = leads.length;
    const activeLeads = leads.filter(
      (lead) => lead.stage !== "won" && lead.stage !== "lost"
    ).length;

    // Calculate stage distribution
    const stageGroups = leads.reduce(
      (acc, lead) => {
        const currentStage = lead.stage || "new";
        acc[currentStage] = (acc[currentStage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const stagesProgress = Object.entries(stageGroups).map(([stage, count]) => ({
      stage,
      count: count as number,
      percentage: totalLeads > 0 ? Math.round(((count as number) / totalLeads) * 100) : 0,
    }));

    // For recent updates, we'll use the activities as a proxy since there's no separate stage update table
    const recentActivities = await prisma.activities.findMany({
      where: {
        orgId,
        type: "stage_change",
      },
      include: {
        leads: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Resolve author display names from user registry
    const userIds = [...new Set(recentActivities.map((a) => a.userId).filter(Boolean))];
    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const users = await prisma.users.findMany({
        where: { clerkUserId: { in: userIds as string[] } },
        select: { clerkUserId: true, name: true, email: true },
      });
      for (const u of users) {
        userMap.set(u.clerkUserId, u.name || u.email || "Unknown");
      }
    }

    const formattedRecentUpdates = recentActivities.map((activity) => {
      const metadata = (activity.metadata || {}) as Record<string, unknown>;
      return {
        id: activity.id,
        leadId: activity.leadId || "",
        fromStage: (metadata?.fromStage as string) || "",
        toStage: (metadata?.toStage as string) || "",
        updatedAt: activity.createdAt,
        updatedBy:
          activity.userName || (activity.userId ? userMap.get(activity.userId) : null) || "System",
      };
    });

    // Generate next actions based on lead age and stage
    const nextActions = leads
      .filter((lead) => lead.stage !== "won" && lead.stage !== "lost")
      .map((lead) => {
        const daysInStage = Math.floor(
          (Date.now() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const currentStage = lead.stage;

        let suggestedAction = "Review lead status";
        let priority: "high" | "medium" | "low" = "medium";

        // Business logic for suggested actions
        if (currentStage === "new" && daysInStage > 2) {
          suggestedAction = "Initial contact overdue";
          priority = "high";
        } else if (currentStage === "qualified" && daysInStage > 7) {
          suggestedAction = "Schedule follow-up call";
          priority = "high";
        } else if (currentStage === "proposal" && daysInStage > 5) {
          suggestedAction = "Send proposal";
          priority = "medium";
        } else if (currentStage === "negotiation" && daysInStage > 10) {
          suggestedAction = "Follow up on proposal";
          priority = "high";
        } else if (daysInStage > 14) {
          suggestedAction = "Check if lead is still active";
          priority = "medium";
        } else {
          priority = "low";
        }

        return {
          leadId: lead.id,
          customerName: lead.contacts
            ? `${lead.contacts.firstName} ${lead.contacts.lastName}`
            : "Unknown",
          currentStage,
          suggestedAction,
          priority,
          daysInStage,
        };
      })
      .filter((action) => action.priority === "high" || action.daysInStage > 3)
      .sort((a, b) => {
        if (a.priority === "high" && b.priority !== "high") return -1;
        if (b.priority === "high" && a.priority !== "high") return 1;
        return b.daysInStage - a.daysInStage;
      })
      .slice(0, 8);

    const summary: PipelineSummary = {
      totalLeads,
      activeLeads,
      stagesProgress,
      recentUpdates: formattedRecentUpdates,
      nextActions,
    };

    return NextResponse.json(summary);
  } catch (error: unknown) {
    logger.error("Error fetching pipeline summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
