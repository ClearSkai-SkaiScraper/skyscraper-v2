import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/smart-actions — AI Smart Actions Engine
 * Analyzes claims, leads, pipeline, and scopes to generate
 * intelligent action recommendations for the user.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const identifier = getRateLimitIdentifier(ctx.userId!, req);
    const allowed = await rateLimiters.ai.check(10, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const orgId = ctx.orgId;

    // Fetch all relevant data in parallel
    const [claims, leads, schedules] = await Promise.all([
      prisma.claims.findMany({
        where: { orgId },
        select: {
          id: true,
          claimNumber: true,
          title: true,
          status: true,
          estimatedValue: true,
          carrier: true,
          dateOfLoss: true,
          createdAt: true,
          updatedAt: true,
          damageType: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.leads.findMany({
        where: { orgId },
        select: {
          id: true,
          stage: true,
          value: true,
          jobCategory: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.crewSchedule.findMany({
        where: { orgId },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          scopeOfWork: true,
        },
        take: 20,
      }),
    ]);

    // Generate smart actions based on real data analysis
    const actions: Array<{
      id: string;
      type: "urgent" | "opportunity" | "follow-up" | "optimization" | "risk";
      priority: "high" | "medium" | "low";
      title: string;
      description: string;
      metric?: string;
      actionLabel: string;
      actionHref: string;
      category: "claims" | "leads" | "pipeline" | "crew" | "finance";
    }> = [];

    // --- CLAIMS ANALYSIS ---
    const newClaims = claims.filter((c) => c.status === "new" || c.status === "pending");
    const staleClaims = claims.filter((c) => {
      const daysSinceUpdate =
        (Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 14 && c.status !== "completed" && c.status !== "closed";
    });
    const highValueClaims = claims.filter((c) => (c.estimatedValue || 0) > 10000);
    const approvedClaims = claims.filter((c) => c.status === "approved");

    if (newClaims.length > 0) {
      actions.push({
        id: "new-claims-review",
        type: "urgent",
        priority: "high",
        title: `${newClaims.length} New Claim${newClaims.length > 1 ? "s" : ""} Need Review`,
        description: `You have ${newClaims.length} claim${newClaims.length > 1 ? "s" : ""} in "New" status that haven't been triaged yet. Review and assign to move the pipeline forward.`,
        metric: `$${(newClaims.reduce((s, c) => s + (c.estimatedValue || 0), 0) / 100).toLocaleString()} potential value`,
        actionLabel: "Review Claims",
        actionHref: "/claims",
        category: "claims",
      });
    }

    if (staleClaims.length > 0) {
      actions.push({
        id: "stale-claims-followup",
        type: "follow-up",
        priority: "high",
        title: `${staleClaims.length} Stale Claim${staleClaims.length > 1 ? "s" : ""} — No Activity 14+ Days`,
        description: `These claims haven't been updated in over two weeks. Follow up with carriers or homeowners to prevent delays.`,
        metric: `${staleClaims.length} claims at risk`,
        actionLabel: "View Stale Claims",
        actionHref: "/claims",
        category: "claims",
      });
    }

    if (highValueClaims.length > 0) {
      actions.push({
        id: "high-value-claims",
        type: "opportunity",
        priority: "medium",
        title: `${highValueClaims.length} High-Value Claim${highValueClaims.length > 1 ? "s" : ""} in Pipeline`,
        description: `You have ${highValueClaims.length} claims over $10K. Prioritize these for maximum revenue impact.`,
        metric: `$${(highValueClaims.reduce((s, c) => s + (c.estimatedValue || 0), 0) / 100).toLocaleString()} total value`,
        actionLabel: "Prioritize Claims",
        actionHref: "/claims",
        category: "claims",
      });
    }

    if (approvedClaims.length > 0) {
      actions.push({
        id: "approved-claims-schedule",
        type: "optimization",
        priority: "medium",
        title: `${approvedClaims.length} Approved Claim${approvedClaims.length > 1 ? "s" : ""} Ready to Schedule`,
        description: `These claims are approved and ready for crew scheduling. Don't leave money on the table.`,
        actionLabel: "Schedule Crews",
        actionHref: "/crews",
        category: "claims",
      });
    }

    // --- LEADS ANALYSIS ---
    const newLeads = leads.filter((l) => l.stage === "new" || l.stage === "contacted");
    const retailLeads = leads.filter(
      (l) =>
        l.jobCategory === "out_of_pocket" ||
        l.jobCategory === "financed" ||
        l.jobCategory === "repair"
    );
    const unconvertedLeads = leads.filter((l) => {
      const daysSinceCreated =
        (Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 7 && (l.stage === "new" || l.stage === "contacted");
    });

    if (newLeads.length > 0) {
      actions.push({
        id: "new-leads-contact",
        type: "urgent",
        priority: "high",
        title: `${newLeads.length} Lead${newLeads.length > 1 ? "s" : ""} Awaiting First Contact`,
        description: `New leads convert 5x better when contacted within 24 hours. Act fast.`,
        metric: `$${(newLeads.reduce((s, l) => s + (l.value || 0), 0) / 100).toLocaleString()} pipeline`,
        actionLabel: "Contact Leads",
        actionHref: "/leads",
        category: "leads",
      });
    }

    if (retailLeads.length > 0) {
      actions.push({
        id: "retail-opportunities",
        type: "opportunity",
        priority: "medium",
        title: `${retailLeads.length} Retail Job${retailLeads.length > 1 ? "s" : ""} in Pipeline`,
        description: `Out-of-pocket, financed, and repair jobs can be closed faster than insurance claims. Focus on these for quick wins.`,
        metric: `$${(retailLeads.reduce((s, l) => s + (l.value || 0), 0) / 100).toLocaleString()} retail value`,
        actionLabel: "View Retail Jobs",
        actionHref: "/jobs/retail",
        category: "leads",
      });
    }

    if (unconvertedLeads.length > 0) {
      actions.push({
        id: "aging-leads",
        type: "risk",
        priority: "medium",
        title: `${unconvertedLeads.length} Lead${unconvertedLeads.length > 1 ? "s" : ""} Going Cold (7+ Days)`,
        description: `These leads have been in early stages for over a week. They need immediate attention before they go elsewhere.`,
        actionLabel: "Follow Up Now",
        actionHref: "/leads",
        category: "leads",
      });
    }

    // --- CREW ANALYSIS ---
    const upcomingSchedules = schedules.filter(
      (s) => s.status === "scheduled" && new Date(s.scheduledDate) > new Date()
    );
    const overdueSchedules = schedules.filter(
      (s) => s.status === "scheduled" && new Date(s.scheduledDate) < new Date()
    );

    if (overdueSchedules.length > 0) {
      actions.push({
        id: "overdue-crews",
        type: "urgent",
        priority: "high",
        title: `${overdueSchedules.length} Overdue Crew Schedule${overdueSchedules.length > 1 ? "s" : ""}`,
        description: `Scheduled crew jobs have passed their date. Update their status or reschedule.`,
        actionLabel: "Update Schedules",
        actionHref: "/crews",
        category: "crew",
      });
    }

    if (upcomingSchedules.length > 0) {
      actions.push({
        id: "upcoming-crews",
        type: "optimization",
        priority: "low",
        title: `${upcomingSchedules.length} Upcoming Crew Job${upcomingSchedules.length > 1 ? "s" : ""}`,
        description: `You have ${upcomingSchedules.length} jobs scheduled. Confirm crews are prepared and materials are ordered.`,
        actionLabel: "View Schedule",
        actionHref: "/crews",
        category: "crew",
      });
    }

    // --- PIPELINE HEALTH ---
    const totalPipelineValue =
      claims.reduce((s, c) => s + (c.estimatedValue || 0), 0) / 100 +
      leads.reduce((s, l) => s + (l.value || 0), 0) / 100;

    if (claims.length === 0 && leads.length === 0) {
      actions.push({
        id: "empty-pipeline",
        type: "risk",
        priority: "high",
        title: "Your Pipeline is Empty",
        description:
          "Start building your pipeline by adding your first claim or lead. Every job starts here.",
        actionLabel: "Add First Claim",
        actionHref: "/claims/new",
        category: "pipeline",
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return NextResponse.json({
      success: true,
      data: {
        actions,
        summary: {
          totalActions: actions.length,
          urgent: actions.filter((a) => a.priority === "high").length,
          opportunities: actions.filter((a) => a.type === "opportunity").length,
          pipelineValue: totalPipelineValue,
          totalClaims: claims.length,
          totalLeads: leads.length,
        },
      },
    });
  } catch (err) {
    logger.error("[API] smart-actions error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
