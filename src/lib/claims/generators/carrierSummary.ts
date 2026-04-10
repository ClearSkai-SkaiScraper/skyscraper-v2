/**
 * PHASE 50 - CARRIER SUMMARY GENERATOR
 * Generates polished carrier-ready submission packets
 *
 * Outputs a comprehensive "Initial Carrier Submission Packet" including:
 * 📌 Executive summary
 * 📌 Narrative
 * 📌 Code requirements
 * 📌 Safety concerns
 * 📌 Damage causes
 * 📌 Pre-loss condition
 * 📌 Repeated weather events
 * 📌 Required materials
 * 📌 SkaiPDF findings
 * 📌 Video report link
 * 📌 Supplemental items
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

import { formatCodeRequirementsForCarrier, generateCodeSummary } from "./code";
import { generateNarrative } from "./narrative";

export interface CarrierSubmissionPacket {
  executiveSummary: string;
  fullNarrative: string;
  codeRequirements: string;
  safetyConcerns: string[];
  damageCauses: string[];
  weatherEvents: string[];
  requiredMaterials: string[];
  skaiFindings: string;
  videoReportLinks: string[];
  supplementalItems: string[];
  estimatedTotal: number;
  urgency: string;
  recommendedActions: string[];
  generatedAt: Date;
}

/**
 * Generate complete carrier submission packet
 */
export async function generateCarrierSummary(claimId: string): Promise<CarrierSubmissionPacket> {
  try {
    logger.debug(`[carrier-summary] Generating submission packet for claim ${claimId}`);

    // 1. Fetch claim with all relations
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
        weather_reports: {
          orderBy: { createdAt: "desc" },
        },
        damage_assessments: {
          orderBy: { created_at: "desc" },
        },
        estimates: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        supplements: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    // 2. Generate narrative
    const narrative = await generateNarrative(claimId, "adjuster");

    // 3. Generate code summary
    const codeSummary = await generateCodeSummary(claimId);

    // 4. Fetch SkaiPDF insights
    const lead = await prisma.leads.findFirst({
      where: { claimId: claim.id },
    });

    // 5. Fetch video reports
    const videoReports = lead
      ? await prisma.ai_reports.findMany({
          where: {
            type: "video_report",
            claimId: claim.id,
          },
          select: { title: true, attachments: true },
        })
      : []; // 6. Build executive summary
    const executiveSummary = buildExecutiveSummary(claim, narrative, codeSummary, lead);

    // 7. Extract damage causes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const damageCauses = extractDamageCauses((claim as any).damage_assessments || []);

    // 8. Format weather events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const weatherEvents = formatWeatherEvents((claim as any).weather_reports || []);

    // 9. Extract required materials
    const requiredMaterials = extractRequiredMaterials(lead, codeSummary);

    // 10. Format SkaiPDF findings
    const skaiFindings = formatSkaiFindings(lead);

    // 11. Extract video links
    const videoReportLinks = videoReports
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v) => (v as any).publicId || (v as any).videoUrl || `Video: ${v.title}`)
      .filter((link) => link);

    // 12. Extract supplemental items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supplementalItems = ((claim as any).supplements || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) => `${s.item_description}: $${s.amount?.toLocaleString() || "TBD"}`
    );

    // 13. Calculate estimated total
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const estimatedTotal = (claim as any).estimates?.[0]?.total_amount || 0;

    // 14. Format code requirements
    const codeRequirements = formatCodeRequirementsForCarrier(codeSummary);

    // 15. Build recommended actions
    const recommendedActions = buildRecommendedActions(claim, narrative, codeSummary);

    logger.debug(`[carrier-summary] Generated complete packet for claim ${claimId}`);

    return {
      executiveSummary,
      fullNarrative: narrative.narrative,
      codeRequirements,
      safetyConcerns: codeSummary.safetyConcerns,
      damageCauses,
      weatherEvents,
      requiredMaterials,
      skaiFindings,
      videoReportLinks,
      supplementalItems,
      estimatedTotal,
      urgency: codeSummary.urgency,
      recommendedActions,
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error("[carrier-summary] Generation failed:", error);
    throw new Error(
      `Failed to generate carrier summary: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build executive summary
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildExecutiveSummary(claim: any, narrative: any, codeSummary: any, lead: any): string {
  const property = claim.properties;
  const dateOfLoss = claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "TBD";

  let summary = `**EXECUTIVE SUMMARY**\n\n`;
  summary += `**Claim Number:** ${claim.claimNumber || "Pending"}\n`;
  summary += `**Property:** ${property?.street}, ${property?.city}, ${property?.state} ${property?.zipCode}\n`;
  summary += `**Date of Loss:** ${dateOfLoss}\n`;
  summary += `**Loss Type:** ${claim.lossType || "Storm Damage"}\n\n`;

  summary += `**KEY FINDINGS:**\n`;
  summary += `- ${narrative.whatHappened.substring(0, 200)}...\n`;
  summary += `- ${codeSummary.missingItems.length} code-required items identified\n`;
  summary += `- Urgency Level: ${codeSummary.urgency.toUpperCase()}\n`;

  if (lead?.aiUrgencyScore) {
    summary += `- AI Urgency Score: ${lead.aiUrgencyScore}/100\n`;
  }

  summary += `\n**RECOMMENDATION:** Expedited review and approval recommended based on documented damage, code requirements, and safety concerns.\n`;

  return summary;
}

/**
 * Extract damage causes
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDamageCauses(assessments: any[]): string[] {
  return assessments.map(
    (a) => `${a.damageType}: ${a.severity} (${Math.round((a.confidence || 0) * 100)}% confidence)`
  );
}

/**
 * Format weather events
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatWeatherEvents(reports: any[]): string[] {
  return reports.map((w) => {
    const date = new Date(w.reportDate).toLocaleDateString();
    const wind = w.maxWindSpeed ? `${w.maxWindSpeed} mph winds` : "";
    const hail = w.maxHailSize ? `${w.maxHailSize}" hail` : "";
    const details = [wind, hail].filter((d) => d).join(", ");
    return `${w.eventType || "Storm Event"} on ${date}${details ? ` (${details})` : ""}`;
  });
}

/**
 * Extract required materials
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRequiredMaterials(lead: any, codeSummary: any): string[] {
  const materials: string[] = [];

  // From AI insights
  if (lead?.aiMaterials) {
    materials.push(...lead.aiMaterials);
  }

  // From code requirements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codeSummary.missingItems.forEach((item: any) => {
    if (item.materialSpec) {
      materials.push(`${item.description}: ${item.materialSpec}`);
    }
  });

  return [...new Set(materials)]; // Remove duplicates
}

/**
 * Format SkaiPDF findings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatSkaiFindings(lead: any): string {
  if (!lead) return "AI analysis pending";

  let findings = "**SKAIPDF AI ANALYSIS:**\n\n";

  if (lead.aiSummary) {
    findings += `Summary: ${lead.aiSummary}\n\n`;
  }

  if (lead.aiUrgencyScore !== null && lead.aiUrgencyScore !== undefined) {
    findings += `Urgency Score: ${lead.aiUrgencyScore}/100\n`;
  }

  if (lead.aiJobType) {
    findings += `Job Classification: ${lead.aiJobType}\n`;
  }

  if (lead.aiFlags && lead.aiFlags.length > 0) {
    findings += `\nFlags:\n${lead.aiFlags.map((f: string) => `- ${f}`).join("\n")}\n`;
  }

  if (lead.aiNextActions && lead.aiNextActions.length > 0) {
    findings += `\nRecommended Actions:\n${lead.aiNextActions.map((a: string) => `- ${a}`).join("\n")}\n`;
  }

  return findings;
}

/**
 * Build recommended actions for carrier
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRecommendedActions(claim: any, narrative: any, codeSummary: any): string[] {
  const actions: string[] = [];

  // Based on urgency
  if (codeSummary.urgency === "critical") {
    actions.push("⚠️ URGENT: Safety-critical code items require immediate attention");
  }

  // Standard actions
  actions.push("Approve full scope including all code-required items");
  actions.push("Schedule joint inspection if needed for verification");

  // Based on missing documentation
  if (narrative.whatsMissing && narrative.whatsMissing.length > 0) {
    actions.push(
      `Provide requested documentation: ${narrative.whatsMissing.slice(0, 2).join(", ")}`
    );
  }

  // Based on weather
  if (claim.weather_reports.length > 0) {
    actions.push("Review attached weather verification data");
  }

  // Code compliance
  if (codeSummary.missingItems.length > 0) {
    actions.push(`Address ${codeSummary.missingItems.length} code-required items in approval`);
  }

  actions.push("Issue initial payment to begin emergency mitigation");
  actions.push("Coordinate final walk-through upon completion");

  return actions;
}

/**
 * Format packet for PDF/email delivery
 */
export function formatPacketForDelivery(packet: CarrierSubmissionPacket): string {
  let formatted = `========================================\n`;
  formatted += `INSURANCE CLAIM SUBMISSION PACKET\n`;
  formatted += `Generated: ${packet.generatedAt.toLocaleString()}\n`;
  formatted += `========================================\n\n`;

  formatted += packet.executiveSummary + `\n\n`;

  formatted += `========================================\n`;
  formatted += `DETAILED NARRATIVE\n`;
  formatted += `========================================\n\n`;
  formatted += packet.fullNarrative + `\n\n`;

  formatted += `========================================\n`;
  formatted += `CODE REQUIREMENTS\n`;
  formatted += `========================================\n\n`;
  formatted += packet.codeRequirements + `\n\n`;

  if (packet.weatherEvents.length > 0) {
    formatted += `========================================\n`;
    formatted += `WEATHER EVENTS\n`;
    formatted += `========================================\n\n`;
    packet.weatherEvents.forEach((event, i) => {
      formatted += `${i + 1}. ${event}\n`;
    });
    formatted += `\n`;
  }

  if (packet.damageCauses.length > 0) {
    formatted += `========================================\n`;
    formatted += `DAMAGE ASSESSMENT\n`;
    formatted += `========================================\n\n`;
    packet.damageCauses.forEach((cause, i) => {
      formatted += `${i + 1}. ${cause}\n`;
    });
    formatted += `\n`;
  }

  formatted += `========================================\n`;
  formatted += `SKAIPDF AI FINDINGS\n`;
  formatted += `========================================\n\n`;
  formatted += packet.skaiFindings + `\n\n`;

  if (packet.videoReportLinks.length > 0) {
    formatted += `========================================\n`;
    formatted += `VIDEO REPORTS\n`;
    formatted += `========================================\n\n`;
    packet.videoReportLinks.forEach((link, i) => {
      formatted += `${i + 1}. ${link}\n`;
    });
    formatted += `\n`;
  }

  formatted += `========================================\n`;
  formatted += `ESTIMATED TOTAL\n`;
  formatted += `========================================\n\n`;
  formatted += `$${packet.estimatedTotal.toLocaleString()}\n\n`;

  formatted += `========================================\n`;
  formatted += `RECOMMENDED ACTIONS\n`;
  formatted += `========================================\n\n`;
  packet.recommendedActions.forEach((action, i) => {
    formatted += `${i + 1}. ${action}\n`;
  });

  return formatted;
}
