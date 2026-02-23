import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withAuth(async (req: NextRequest, { orgId }) => {
  try {

    // Fetch recent activities from multiple sources (with safe fallbacks for missing tables)
    type ClaimRecord = {
      id: string;
      claimNumber: string;
      status: string;
      createdAt: Date;
      damageType: string;
    };
    type LeadRecord = { id: string; stage: string; createdAt: Date; title: string };
    type ReportRecord = { id: string; type: string; createdAt: Date; status: string };
    type InspectionRecord = { id: string; type: string; createdAt: Date; status: string };

    // Fetch all activity sources in parallel (each with safe fallback)
    const [recentClaims, recentLeads, recentReports, recentInspections] = await Promise.all([
      prisma.claims
        .findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            claimNumber: true,
            status: true,
            createdAt: true,
            damageType: true,
          },
        })
        .catch((err) => {
          logger.error("[DASHBOARD_ACTIVITIES] Claims fetch failed:", err);
          return [] as ClaimRecord[];
        }),
      prisma.leads
        .findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            stage: true,
            createdAt: true,
            title: true,
          },
        })
        .catch((err) => {
          logger.error("[DASHBOARD_ACTIVITIES] Leads fetch failed:", err);
          return [] as LeadRecord[];
        }),
      prisma.ai_reports
        .findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            type: true,
            createdAt: true,
            status: true,
          },
        })
        .catch((err) => {
          logger.error("[DASHBOARD_ACTIVITIES] Reports table might not exist:", err);
          return [] as ReportRecord[];
        }),
      prisma.inspections
        .findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            type: true,
            createdAt: true,
            status: true,
          },
        })
        .catch((err) => {
          logger.error("[DASHBOARD_ACTIVITIES] Inspections table might not exist:", err);
          return [] as InspectionRecord[];
        }),
    ]);

    // Transform into unified activity feed
    const activities: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: Date;
      link: string;
    }> = [];

    recentClaims.forEach((claim) => {
      activities.push({
        id: `claim-${claim.id}`,
        type: "claim",
        description: `Created claim ${claim.claimNumber || "#" + claim.id.slice(0, 8)} - ${claim.damageType || claim.status}`,
        timestamp: claim.createdAt,
        link: `/claims/${claim.id}`,
      });
    });

    recentLeads.forEach((lead) => {
      activities.push({
        id: `lead-${lead.id}`,
        type: "lead",
        description: `New lead: ${lead.title || "Untitled"} - ${lead.stage}`,
        timestamp: lead.createdAt,
        link: `/leads/${lead.id}`,
      });
    });

    recentReports.forEach((report) => {
      activities.push({
        id: `report-${report.id}`,
        type: "report",
        description: `Generated ${report.type} report - ${report.status}`,
        timestamp: report.createdAt,
        link: `/reports/${report.id}`,
      });
    });

    recentInspections.forEach((inspection) => {
      activities.push({
        id: `inspection-${inspection.id}`,
        type: "inspection",
        description: `${inspection.type} inspection - ${inspection.status}`,
        timestamp: inspection.createdAt,
        link: `/inspections/${inspection.id}`,
      });
    });

    // Sort by most recent first
    activities.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Return top 10 activities
    return NextResponse.json({
      ok: true,
      activities: activities.slice(0, 10),
    });
  } catch (error) {
    logger.error("[Activity Feed API] Error:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch activities" }, { status: 500 });
  }
});
