/**
 * AI Job Scanner API
 * Scans leads, claims, and retail jobs to provide intelligent recommendations
 * Runs in the background and provides actionable insights
 */

import { NextRequest, NextResponse } from "next/server";

import { getResolvedOrgId } from "@/lib/auth/getResolvedOrgId";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface JobRecommendation {
  id: string;
  type: "lead" | "claim" | "retail";
  entityId: string;
  entityTitle: string;
  recommendation: string;
  action: string;
  actionUrl: string;
  priority: "high" | "medium" | "low";
  category: "follow_up" | "document" | "schedule" | "scope" | "billing" | "quality";
  createdAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  try {
    const orgId = await getResolvedOrgId();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit AI requests
    const rl = await checkRateLimit(orgId, "AI");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const recommendations: JobRecommendation[] = [];

    // ===== SCAN CLAIMS =====
    const claims = await prisma.claims.findMany({
      where: { orgId },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        dateOfLoss: true,
        homeownerEmail: true,
        damageType: true,
        estimatedValue: true,
        // Note: photos/documents tracked via projects or reports relations
        reports: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    for (const claim of claims) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(claim.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const reportCount = claim.reports?.length || 0;

      // Check for stale claims
      if (daysSinceUpdate > 7 && claim.status !== "closed" && claim.status !== "paid") {
        recommendations.push({
          id: `claim-stale-${claim.id}`,
          type: "claim",
          entityId: claim.id,
          entityTitle: claim.title || `Claim #${claim.claimNumber}`,
          recommendation: `This claim hasn't been updated in ${daysSinceUpdate} days. Consider following up with the client or insurance adjuster.`,
          action: "Review & Follow Up",
          actionUrl: `/claims/${claim.id}`,
          priority: daysSinceUpdate > 14 ? "high" : "medium",
          category: "follow_up",
          createdAt: new Date(),
        });
      }

      // Check for missing reports/documentation
      if (reportCount < 1 && claim.status !== "draft") {
        recommendations.push({
          id: `claim-docs-${claim.id}`,
          type: "claim",
          entityId: claim.id,
          entityTitle: claim.title || `Claim #${claim.claimNumber}`,
          recommendation: `No reports generated yet. Generate AI analysis reports to strengthen documentation.`,
          action: "Generate Report",
          actionUrl: `/claims/${claim.id}?tab=reports`,
          priority: "medium",
          category: "document",
          createdAt: new Date(),
        });
      }

      // Check for missing scope/estimate
      if (!claim.estimatedValue && daysSinceCreation > 3 && claim.status !== "draft") {
        recommendations.push({
          id: `claim-scope-${claim.id}`,
          type: "claim",
          entityId: claim.id,
          entityTitle: claim.title || `Claim #${claim.claimNumber}`,
          recommendation: `No estimate value set yet. Use the AI Scope Builder to generate a professional scope of work.`,
          action: "Create Scope",
          actionUrl: `/claims/${claim.id}?action=scope`,
          priority: "high",
          category: "scope",
          createdAt: new Date(),
        });
      }

      // Check for missing client contact info
      if (!claim.homeownerEmail) {
        recommendations.push({
          id: `claim-contact-${claim.id}`,
          type: "claim",
          entityId: claim.id,
          entityTitle: claim.title || `Claim #${claim.claimNumber}`,
          recommendation: `No client email on file. Add contact info to enable client portal access and automated updates.`,
          action: "Add Contact Info",
          actionUrl: `/claims/${claim.id}/edit`,
          priority: "medium",
          category: "follow_up",
          createdAt: new Date(),
        });
      }

      // Check for scheduling needs
      if (claim.status === "active" || claim.status === "in_progress") {
        // Could check if there are scheduled appointments
        recommendations.push({
          id: `claim-schedule-${claim.id}`,
          type: "claim",
          entityId: claim.id,
          entityTitle: claim.title || `Claim #${claim.claimNumber}`,
          recommendation: `Active claim - ensure all inspections, material deliveries, and work dates are scheduled.`,
          action: "Check Schedule",
          actionUrl: `/appointments/schedule?claimId=${claim.id}`,
          priority: "low",
          category: "schedule",
          createdAt: new Date(),
        });
      }
    }

    // ===== SCAN LEADS =====
    const leads = await prisma.leads.findMany({
      where: { orgId },
      select: {
        id: true,
        title: true,
        source: true,
        stage: true,
        createdAt: true,
        updatedAt: true,
        value: true,
        contacts: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    for (const lead of leads) {
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const contact = lead.contacts;
      const leadName =
        [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") ||
        lead.title ||
        "New Lead";

      // Hot lead not followed up
      if (daysSinceCreation < 3 && (lead.stage === "new" || !lead.stage)) {
        recommendations.push({
          id: `lead-hot-${lead.id}`,
          type: "lead",
          entityId: lead.id,
          entityTitle: leadName,
          recommendation: `New lead from ${lead.source || "unknown source"} - contact within 24-48 hours for best conversion.`,
          action: "Contact Now",
          actionUrl: `/crm/leads/${lead.id}`,
          priority: "high",
          category: "follow_up",
          createdAt: new Date(),
        });
      }

      // Stale lead
      if (daysSinceUpdate > 5 && lead.stage !== "converted" && lead.stage !== "lost") {
        recommendations.push({
          id: `lead-stale-${lead.id}`,
          type: "lead",
          entityId: lead.id,
          entityTitle: leadName,
          recommendation: `Lead hasn't been updated in ${daysSinceUpdate} days. Follow up or mark as lost to keep pipeline clean.`,
          action: "Follow Up",
          actionUrl: `/crm/leads/${lead.id}`,
          priority: daysSinceUpdate > 10 ? "high" : "medium",
          category: "follow_up",
          createdAt: new Date(),
        });
      }

      // Lead ready to convert
      if (lead.stage === "qualified" && lead.value) {
        recommendations.push({
          id: `lead-convert-${lead.id}`,
          type: "lead",
          entityId: lead.id,
          entityTitle: leadName,
          recommendation: `Qualified lead with $${lead.value.toLocaleString()} estimated value. Ready to convert to claim or retail job.`,
          action: "Convert to Job",
          actionUrl: `/crm/leads/${lead.id}/convert`,
          priority: "high",
          category: "follow_up",
          createdAt: new Date(),
        });
      }
    }

    // ===== SCAN JOBS =====
    const retailJobs = await prisma.jobs.findMany({
      where: { orgId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        jobType: true,
        estimatedCost: true,
        actualCost: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    for (const job of retailJobs) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const amountOwed = (job.estimatedCost || 0) - (job.actualCost || 0);

      // Payment collection needed
      if (amountOwed > 0 && (job.status === "completed" || job.status === "finished")) {
        recommendations.push({
          id: `retail-payment-${job.id}`,
          type: "retail",
          entityId: job.id,
          entityTitle: job.title || "Retail Job",
          recommendation: `Job completed with $${amountOwed.toLocaleString()} outstanding balance. Send invoice or payment reminder.`,
          action: "Collect Payment",
          actionUrl: `/jobs/retail/${job.id}?tab=billing`,
          priority: "high",
          category: "billing",
          createdAt: new Date(),
        });
      }

      // Stale job
      if (daysSinceUpdate > 7 && job.status !== "completed" && job.status !== "cancelled") {
        recommendations.push({
          id: `retail-stale-${job.id}`,
          type: "retail",
          entityId: job.id,
          entityTitle: job.title || "Retail Job",
          recommendation: `Job hasn't been updated in ${daysSinceUpdate} days. Update status or schedule next action.`,
          action: "Update Status",
          actionUrl: `/jobs/retail/${job.id}`,
          priority: "medium",
          category: "follow_up",
          createdAt: new Date(),
        });
      }
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // If no recommendations, provide helpful starter suggestions
    if (recommendations.length === 0) {
      recommendations.push(
        {
          id: "starter-create-claim",
          type: "claim",
          entityId: "new",
          entityTitle: "Get Started",
          recommendation:
            "Create your first claim to start tracking jobs and generating AI-powered reports.",
          action: "Create Claim",
          actionUrl: "/claims/new",
          priority: "medium",
          category: "follow_up",
          createdAt: new Date(),
        },
        {
          id: "starter-add-lead",
          type: "lead",
          entityId: "new",
          entityTitle: "Grow Your Pipeline",
          recommendation: "Add leads to track prospects and convert them into paying jobs.",
          action: "Add Lead",
          actionUrl: "/leads/new",
          priority: "low",
          category: "follow_up",
          createdAt: new Date(),
        },
        {
          id: "starter-explore-templates",
          type: "claim",
          entityId: "templates",
          entityTitle: "Explore Templates",
          recommendation:
            "Browse the Template Marketplace to find professional report templates for your business.",
          action: "View Templates",
          actionUrl: "/reports/templates/marketplace",
          priority: "low",
          category: "document",
          createdAt: new Date(),
        }
      );
    }

    // Summary stats
    const summary = {
      total: recommendations.length,
      high: recommendations.filter((r) => r.priority === "high").length,
      medium: recommendations.filter((r) => r.priority === "medium").length,
      low: recommendations.filter((r) => r.priority === "low").length,
      byCategory: {
        follow_up: recommendations.filter((r) => r.category === "follow_up").length,
        document: recommendations.filter((r) => r.category === "document").length,
        schedule: recommendations.filter((r) => r.category === "schedule").length,
        scope: recommendations.filter((r) => r.category === "scope").length,
        billing: recommendations.filter((r) => r.category === "billing").length,
        quality: recommendations.filter((r) => r.category === "quality").length,
      },
    };

    return NextResponse.json({
      recommendations: recommendations.slice(0, 20), // Return top 20
      summary,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("AI Job Scanner error:", error);

    // Return fallback recommendations on error instead of failing
    const fallbackRecommendations = [
      {
        id: "fallback-1",
        type: "claim" as const,
        entityId: "new",
        entityTitle: "Create Your First Claim",
        recommendation:
          "Start by creating a claim to track property damage and generate professional reports.",
        action: "Create Claim",
        actionUrl: "/claims/new",
        priority: "medium" as const,
        category: "follow_up" as const,
        createdAt: new Date(),
      },
      {
        id: "fallback-2",
        type: "lead" as const,
        entityId: "new",
        entityTitle: "Track Your Leads",
        recommendation: "Use the CRM to manage your sales pipeline and track potential customers.",
        action: "View Leads",
        actionUrl: "/leads",
        priority: "low" as const,
        category: "follow_up" as const,
        createdAt: new Date(),
      },
    ];

    return NextResponse.json({
      recommendations: fallbackRecommendations,
      summary: {
        total: fallbackRecommendations.length,
        high: 0,
        medium: 1,
        low: 1,
      },
      scannedAt: new Date().toISOString(),
      fallback: true,
    });
  }
}
