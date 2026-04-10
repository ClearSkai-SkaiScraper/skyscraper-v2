/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PHASE 50 - SELF-WRITING CLAIM ENGINE
 * Narrative Generator - Auto-generates carrier-ready claim narratives
 * 
 * Pulls from:
 * - Phase 49 merged timeline events
 * - Storm data & weather reports
 * - SkaiPDF insights
 * - Carrier documents
 * - Task outcomes
 * - Photo analyses
 * - Video script insights
 * 
 * Outputs:
 * - What happened
 * - When it happened
 * - Why it matters
 * - What's missing
 * - What we recommend to the carrier
 */

import { callOpenAI } from "@/lib/ai/client";
import { reconstructClaimTimeline } from "@/lib/claims/reconstructor";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export type NarrativeTone = "contractor" | "adjuster" | "attorney" | "homeowner";

export interface GeneratedNarrative {
  narrative: string;
  whatHappened: string;
  whenItHappened: string;
  whyItMatters: string;
  whatsMissing: string[];
  carrierRecommendation: string;
  tone: NarrativeTone;
  confidence: number;
  generatedAt: Date;
}

/**
 * Generate a comprehensive claim narrative from all available data
 */
export async function generateNarrative(
  claimId: string,
  tone: NarrativeTone = "contractor"
): Promise<GeneratedNarrative> {
  try {
    logger.debug(`[narrative] Generating for claim ${claimId} with tone: ${tone}`);

    // 1. Fetch claim with all relations
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
        weather_reports: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        damage_assessments: {
          orderBy: { created_at: "desc" },
          take: 3,
        },
        claim_activities: {
          orderBy: { created_at: "desc" },
          take: 20,
          include: { users: true },
        },
        claim_tasks: {
          where: { status: "completed" },
          orderBy: { completed_at: "desc" },
        },
        estimates: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    // 2. Fetch merged timeline from Phase 49
    const { realTimeline: timeline } = await reconstructClaimTimeline(claimId);

    // 3. Fetch SkaiPDF insights from leads table
    const lead = await prisma.leads.findFirst({
      where: { claimId: claim.id },
    });

    // 4. Fetch video reports if available
    const videoReport = await prisma.ai_reports.findFirst({
      where: { 
        type: "video_report",
        claimId: claim.id
      },
      orderBy: { createdAt: "desc" },
    });

    // 5. Build context for AI
    const context = buildNarrativeContext(claim, timeline, lead, videoReport);

    // 6. Generate narrative using GPT-4o
    const prompt = buildNarrativePrompt(context, tone);

    const result = await callOpenAI<string>({
      tag: "narrative",
      model: "gpt-4o",
      system: getSystemPromptForTone(tone),
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      maxTokens: 2500,
      context: { claimId, tone },
    });

    if (!result.success) {
      throw new Error(`Narrative generation failed: ${result.error}`);
    }

    const narrativeText = result.raw || "";

    // 7. Parse structured narrative
    const parsed = parseNarrativeResponse(narrativeText);

    logger.debug(`[narrative] Generated ${narrativeText.length} characters for claim ${claimId}`);

    return {
      narrative: narrativeText,
      whatHappened: parsed.whatHappened,
      whenItHappened: parsed.whenItHappened,
      whyItMatters: parsed.whyItMatters,
      whatsMissing: parsed.whatsMissing,
      carrierRecommendation: parsed.carrierRecommendation,
      tone,
      confidence: 0.85,
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error("[narrative] Generation failed:", error);
    throw new Error(`Failed to generate narrative: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Build context object from all data sources
 */
function buildNarrativeContext(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claim: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lead: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videoReport: any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  return {
    claim: {
      id: claim.id,
      title: claim.title,
      description: claim.description,
      dateOfLoss: claim.dateOfLoss,
      status: claim.status,
      claimNumber: claim.claimNumber,
    },
    property: claim.properties
      ? {
          address: `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`,
          type: claim.properties.propertyType,
          yearBuilt: claim.properties.yearBuilt,
          roofType: claim.properties.roofType,
        }
      : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weather: claim.weather_reports.map((w: any) => ({
      date: w.reportDate,
      windSpeed: w.maxWindSpeed,
      hailSize: w.maxHailSize,
      eventType: w.eventType,
      confidence: w.confidence,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    damage: claim.damage_assessments.map((d: any) => ({
      type: d.damageType,
      severity: d.severity,
      confidence: d.confidence,
      findings: d.findings,
    })),
    timeline: timeline?.events || [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activities: claim.claim_activities.map((a: any) => ({
      type: a.activityType,
      description: a.description,
      date: a.createdAt,
      user: a.users?.name || "System",
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    completedTasks: claim.claim_tasks.map((t: any) => ({
      title: t.title,
      completedAt: t.completedAt,
    })),
    aiInsights: lead
      ? {
          summary: lead.aiSummary,
          urgency: lead.aiUrgencyScore,
          jobType: lead.aiJobType,
          materials: lead.aiMaterials,
          flags: lead.aiFlags,
          nextActions: lead.aiNextActions,
        }
      : null,
    videoReport: videoReport
      ? {
          title: videoReport.title,
          url: videoReport.videoUrl,
        }
      : null,
    estimate: claim.estimates[0]
      ? {
          total: claim.estimates[0].totalAmount,
          status: claim.estimates[0].status,
        }
      : null,
  };
}

/**
 * Build comprehensive prompt for narrative generation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNarrativePrompt(context: Record<string, any>, tone: NarrativeTone): string {
  return `Generate a comprehensive claim narrative for the following situation:

**CLAIM DETAILS:**
- Claim Number: ${context.claim.claimNumber || "Pending"}
- Date of Loss: ${context.claim.dateOfLoss ? new Date(context.claim.dateOfLoss).toLocaleDateString() : "Unknown"}
- Property: ${context.property?.address || "Address not available"}
- Property Type: ${context.property?.type || "Unknown"}
- Roof Type: ${context.property?.roofType || "Unknown"}

**WEATHER EVENTS:**
// eslint-disable-next-line @typescript-eslint/no-explicit-any
${context.weather.length > 0 ? context.weather.map((w: any) => `- ${w.eventType} on ${new Date(w.date).toLocaleDateString()} (Wind: ${w.windSpeed || "N/A"} mph, Hail: ${w.hailSize || "N/A"}")`).join("\n") : "No weather events documented"}

**DAMAGE ASSESSMENTS:**
// eslint-disable-next-line @typescript-eslint/no-explicit-any
${context.damage.length > 0 ? context.damage.map((d: any) => `- ${d.type}: ${d.severity} severity (${Math.round(d.confidence * 100)}% confidence)`).join("\n") : "No damage assessments yet"}

**AI INSIGHTS:**
${context.aiInsights ? `
- Urgency Score: ${context.aiInsights.urgency}/100
- Job Type: ${context.aiInsights.jobType}
- Recommended Materials: ${context.aiInsights.materials?.join(", ") || "None"}
- Flags: ${context.aiInsights.flags?.join(", ") || "None"}
` : "No AI insights available"}

**TIMELINE EVENTS:**
// eslint-disable-next-line @typescript-eslint/no-explicit-any
${context.timeline.length > 0 ? context.timeline.slice(0, 10).map((e: any) => `- ${e.timestamp}: ${e.description}`).join("\n") : "No timeline events"}

**COMPLETED WORK:**
// eslint-disable-next-line @typescript-eslint/no-explicit-any
${context.completedTasks.length > 0 ? context.completedTasks.map((t: any) => `- ${t.title} (completed ${new Date(t.completedAt).toLocaleDateString()})`).join("\n") : "No completed tasks"}

Please generate a structured narrative with the following sections:

1. **WHAT HAPPENED**: Clear description of the loss event and immediate aftermath
2. **WHEN IT HAPPENED**: Timeline of critical events with dates
3. **WHY IT MATTERS**: Impact, urgency, and significance to the carrier
4. **WHAT'S MISSING**: List of missing documentation, inspections, or information
5. **CARRIER RECOMMENDATION**: Clear next steps and recommendations for the adjuster

Make it professional, fact-based, and ${tone === "contractor" ? "contractor-perspective with construction expertise" : tone === "adjuster" ? "adjuster-friendly with policy focus" : tone === "attorney" ? "legally precise with liability considerations" : "homeowner-friendly and reassuring"}.`;
}

/**
 * Get system prompt based on tone
 */
function getSystemPromptForTone(tone: NarrativeTone): string {
  const prompts = {
    contractor: `You are an expert roofing contractor writing claim documentation. Focus on construction details, code requirements, material specifications, and proper installation procedures. Use industry terminology but keep it clear.`,
    adjuster: `You are an experienced insurance adjuster reviewing a claim. Focus on policy coverage, documentation requirements, causation, and claims handling procedures. Be objective and policy-focused.`,
    attorney: `You are a construction attorney preparing claim documentation. Focus on legal defensibility, liability, code compliance, and contractual obligations. Be precise and reference applicable laws/codes.`,
    homeowner: `You are writing for a homeowner to understand their claim. Use clear, non-technical language. Focus on what happened, why it matters, and what comes next. Be reassuring but factual.`,
  };

  return prompts[tone];
}

/**
 * Parse AI response into structured format
 */
function parseNarrativeResponse(text: string): {
  whatHappened: string;
  whenItHappened: string;
  whyItMatters: string;
  whatsMissing: string[];
  carrierRecommendation: string;
} {
  // Simple parser - looks for section headers
  const sections = {
    whatHappened: extractSection(text, "WHAT HAPPENED"),
    whenItHappened: extractSection(text, "WHEN IT HAPPENED"),
    whyItMatters: extractSection(text, "WHY IT MATTERS"),
    whatsMissing: extractListSection(text, "WHAT'S MISSING"),
    carrierRecommendation: extractSection(text, "CARRIER RECOMMENDATION"),
  };

  return sections;
}

/**
 * Extract a text section by header
 */
function extractSection(text: string, header: string): string {
  const regex = new RegExp(`\\*\\*${header}:?\\*\\*\\s*([\\s\\S]*?)(?=\\n\\*\\*|$)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

/**
 * Extract a list section by header
 */
function extractListSection(text: string, header: string): string[] {
  const section = extractSection(text, header);
  if (!section) return [];

  return section
    .split("\n")
    .filter((line) => line.trim().startsWith("-") || line.trim().startsWith("•"))
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}
