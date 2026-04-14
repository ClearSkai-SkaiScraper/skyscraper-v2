import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getOrgContext } from "@/lib/org/getOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/jobs
 * Returns leads/jobs for the Job Center.
 * Uses leads table since that's where job data lives.
 */
export async function GET(_req: NextRequest) {
  try {
    // Use getOrgContext for proper org resolution (handles Clerk + user_organizations fallback)
    const { orgId: organizationId, userId } = await getOrgContext();

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!organizationId) {
      logger.debug("[GET /api/jobs] No org found for user:", userId);
      return NextResponse.json({ jobs: [] });
    }

    // Query leads table (where jobs are stored)
    // Return ALL jobs - both insurance claims and OOP
    const leads = await prisma.leads.findMany({
      where: {
        orgId: organizationId,
        archivedAt: null,
        // Include all jobs (both with and without claimId)
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            street: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Map leads to job format for UI
    const jobs = leads.map((lead) => ({
      id: lead.id,
      title: lead.title,
      claimId: lead.claimId || null,
      propertyAddress: lead.contacts
        ? `${lead.contacts.street || ""}, ${lead.contacts.city || ""} ${lead.contacts.state || ""}`.trim()
        : "No address",
      scheduledDate: lead.updatedAt?.toISOString() || new Date().toISOString(),
      status: mapStageToStatus(lead.stage),
      // Job type: CLAIM if has claimId, otherwise use jobType field or fallback to LEAD
      jobType: lead.claimId ? "CLAIM" : lead.jobType || "LEAD",
      // Work type: roofing, solar, hvac, etc.
      workType: lead.workType || null,
      // Legacy field for backward compatibility
      tradeType: lead.workType || lead.jobCategory || "general",
      jobCategory: lead.jobCategory || "lead",
      estimatedCost: lead.value || 0,
      assignedTo: lead.contacts
        ? `${lead.contacts.firstName} ${lead.contacts.lastName}`
        : "Unassigned",
      priority: mapUrgencyToPriority(lead.urgency),
      urgency: lead.urgency || "medium",
      stage: lead.stage,
    }));

    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error("[GET /api/jobs] Error:", error);
    return NextResponse.json({ jobs: [] }, { status: 200 });
  }
}

function mapStageToStatus(
  stage: string | null
): "scheduled" | "in-progress" | "completed" | "cancelled" {
  const s = (stage || "").toUpperCase();
  if (s === "WON" || s === "COMPLETE" || s === "COMPLETED") return "completed";
  if (s === "PROPOSAL" || s === "NEGOTIATION" || s === "QUALIFIED") return "in-progress";
  if (s === "LOST" || s === "CANCELLED") return "cancelled";
  return "scheduled";
}

function mapUrgencyToPriority(urgency: string | null): "low" | "medium" | "high" | "urgent" {
  const u = (urgency || "").toLowerCase();
  if (u === "urgent" || u === "emergency") return "urgent";
  if (u === "high") return "high";
  if (u === "low") return "low";
  return "medium";
}
