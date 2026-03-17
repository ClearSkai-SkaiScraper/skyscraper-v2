/**
 * ML Recommendations Engine
 * Analyzes claims, leads, and jobs to provide actionable recommendations
 * Helps users move stuck projects forward
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface Recommendation {
  id: string;
  type: string;
  kind?: "NEXT_ACTION" | "PROFESSIONAL_MATCH";
  title: string;
  description: string;
  summary?: string;
  priority: "low" | "medium" | "high";
  confidence: number;
  score?: number;
  actionUrl?: string;
  claimId?: string;
  leadId?: string;
  payload?: Record<string, any>;
}

export interface RecommendationContext {
  orgId: string;
  claimId?: string;
  userId?: string;
}

/**
 * Generate smart recommendations based on claims and leads data
 * Identifies stuck jobs and suggests next actions
 */
export async function generateRecommendations(
  context: RecommendationContext
): Promise<Recommendation[]> {
  const { orgId, claimId, userId } = context;
  logger.debug(`[ML] Generating recommendations for org ${orgId}`);

  if (!orgId) {
    return [];
  }

  const recommendations: Recommendation[] = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    // 1. Check for stale leads/jobs (not updated in 3+ days)
    const staleLeads = await prisma.leads.findMany({
      where: {
        orgId,
        updatedAt: { lt: threeDaysAgo },
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      include: {
        contacts: { select: { firstName: true, lastName: true } },
      },
      take: 5,
      orderBy: { updatedAt: "asc" },
    });

    for (const lead of staleLeads) {
      const contactName = lead.contacts
        ? `${lead.contacts.firstName || ""} ${lead.contacts.lastName || ""}`.trim()
        : "Unknown";
      const daysSinceUpdate = Math.floor(
        (now.getTime() - lead.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      recommendations.push({
        id: `lead-stale-${lead.id}`,
        type: "lead_follow_up",
        kind: "NEXT_ACTION",
        title: `Follow up on ${lead.title || "lead"}`,
        description: `${contactName}'s job hasn't been updated in ${daysSinceUpdate} days. Consider reaching out or updating the status.`,
        summary: `Job stuck for ${daysSinceUpdate} days - needs attention`,
        priority: daysSinceUpdate > 7 ? "high" : "medium",
        confidence: 85,
        score: daysSinceUpdate > 7 ? 95 : 80,
        actionUrl: `/leads/${lead.id}`,
        leadId: lead.id,
        payload: {
          leadId: lead.id,
          contactName,
          daysSinceUpdate,
          stage: lead.stage,
          jobCategory: lead.jobCategory,
          actionRoute: `/leads/${lead.id}`,
        },
      });
    }

    // 2. Check for stale claims (not updated in 7+ days)
    const staleClaims = await prisma.claims.findMany({
      where: {
        orgId,
        updatedAt: { lt: oneWeekAgo },
        status: { notIn: ["closed", "denied", "completed"] },
      },
      include: {
        properties: { select: { street: true, city: true } },
      },
      take: 5,
      orderBy: { updatedAt: "asc" },
    });

    for (const claim of staleClaims) {
      const daysSinceUpdate = Math.floor(
        (now.getTime() - claim.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
      );
      const propertyAddress = claim.properties?.street
        ? `${claim.properties.street}, ${claim.properties.city || ""}`
        : claim.insured_name || "property";

      recommendations.push({
        id: `claim-stale-${claim.id}`,
        type: "claim_follow_up",
        kind: "NEXT_ACTION",
        title: `Update claim ${claim.claimNumber || ""}`,
        description: `Claim for ${propertyAddress} hasn't been updated in ${daysSinceUpdate} days. Check status with adjuster or homeowner.`,
        summary: `Claim stale for ${daysSinceUpdate} days`,
        priority: daysSinceUpdate > 14 ? "high" : "medium",
        confidence: 90,
        score: daysSinceUpdate > 14 ? 98 : 85,
        actionUrl: `/claims/${claim.id}`,
        claimId: claim.id,
        payload: {
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          propertyAddress,
          daysSinceUpdate,
          status: claim.status,
          actionRoute: `/claims/${claim.id}`,
        },
      });
    }

    // 3. Check for leads in PROPOSAL stage (ready for follow-up)
    const proposalLeads = await prisma.leads.findMany({
      where: {
        orgId,
        stage: "PROPOSAL",
        updatedAt: { lt: oneDayAgo },
      },
      include: {
        contacts: { select: { firstName: true, lastName: true, phone: true } },
      },
      take: 3,
      orderBy: { value: "desc" },
    });

    for (const lead of proposalLeads) {
      const contactName = lead.contacts
        ? `${lead.contacts.firstName || ""} ${lead.contacts.lastName || ""}`.trim()
        : "Customer";

      recommendations.push({
        id: `lead-proposal-${lead.id}`,
        type: "proposal_follow_up",
        kind: "NEXT_ACTION",
        title: `Follow up on proposal for ${contactName}`,
        description: `Proposal sent but no response yet. A quick call could close this $${((lead.value || 0) / 100).toLocaleString()} job.`,
        summary: "Proposal pending - follow up recommended",
        priority: "medium",
        confidence: 75,
        score: 78,
        actionUrl: `/leads/${lead.id}`,
        leadId: lead.id,
        payload: {
          leadId: lead.id,
          contactName,
          value: lead.value,
          phone: lead.contacts?.phone,
          actionRoute: `/leads/${lead.id}`,
        },
      });
    }

    // 4. Check for hot leads that need action
    const hotLeads = await prisma.leads.findMany({
      where: {
        orgId,
        temperature: "hot",
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      include: {
        contacts: { select: { firstName: true, lastName: true } },
      },
      take: 3,
      orderBy: { updatedAt: "desc" },
    });

    for (const lead of hotLeads) {
      const contactName = lead.contacts
        ? `${lead.contacts.firstName || ""} ${lead.contacts.lastName || ""}`.trim()
        : "Hot lead";

      // Only add if not already in stale recommendations
      if (!recommendations.find((r) => r.leadId === lead.id)) {
        recommendations.push({
          id: `lead-hot-${lead.id}`,
          type: "hot_lead_action",
          kind: "NEXT_ACTION",
          title: `Act on hot lead: ${contactName}`,
          description: `This lead is marked as hot! Don't let it cool down - schedule a meeting or send a proposal.`,
          summary: "Hot lead requires immediate action",
          priority: "high",
          confidence: 92,
          score: 94,
          actionUrl: `/leads/${lead.id}`,
          leadId: lead.id,
          payload: {
            leadId: lead.id,
            contactName,
            temperature: "hot",
            stage: lead.stage,
            actionRoute: `/leads/${lead.id}`,
          },
        });
      }
    }

    // 5. Check for OOP jobs that could use financing recommendation
    const oopLeads = await prisma.leads.findMany({
      where: {
        orgId,
        jobCategory: "out_of_pocket",
        value: { gte: 1000000 }, // $10,000+ in cents
        stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] },
      },
      include: {
        contacts: { select: { firstName: true, lastName: true } },
      },
      take: 2,
    });

    for (const lead of oopLeads) {
      const contactName = lead.contacts
        ? `${lead.contacts.firstName || ""} ${lead.contacts.lastName || ""}`.trim()
        : "Customer";

      recommendations.push({
        id: `lead-financing-${lead.id}`,
        type: "financing_suggestion",
        kind: "NEXT_ACTION",
        title: `Offer financing to ${contactName}`,
        description: `$${((lead.value || 0) / 100).toLocaleString()} out-of-pocket job. Offering financing could help close the deal faster.`,
        summary: "Large OOP job - financing could help",
        priority: "low",
        confidence: 70,
        score: 72,
        actionUrl: `/leads/${lead.id}`,
        leadId: lead.id,
        payload: {
          leadId: lead.id,
          contactName,
          value: lead.value,
          suggestion: "Consider offering financing options",
          actionRoute: `/leads/${lead.id}`,
        },
      });
    }

    // Sort by score (highest priority first)
    recommendations.sort((a, b) => (b.score || 0) - (a.score || 0));

    logger.debug(`[ML] Generated ${recommendations.length} recommendations`);
    return recommendations.slice(0, 10); // Return top 10
  } catch (error) {
    logger.error("[ML] Error generating recommendations:", error);
    return [];
  }
}

export async function getRecommendationsForClaim(claimId: string): Promise<Recommendation[]> {
  logger.debug(`[ML] Getting recommendations for claim ${claimId}`);

  try {
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
      },
    });

    if (!claim) return [];

    return generateRecommendations({
      orgId: claim.orgId,
      claimId,
    });
  } catch (error) {
    logger.error("[ML] Error getting claim recommendations:", error);
    return [];
  }
}

export async function refreshRecommendations(orgId: string): Promise<number> {
  logger.debug(`[ML] Refreshing recommendations for org ${orgId}`);

  const recommendations = await generateRecommendations({ orgId });
  return recommendations.length;
}
