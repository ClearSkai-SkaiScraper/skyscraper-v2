/**
 * Claims Folder AI Generators
 * Generate AI-powered narratives and justifications for claims folder sections
 *
 * Integrated with:
 * - storm_evidence (weather intelligence)
 * - claim_simulations (outcome prediction)
 * - storm_clusters (corroboration)
 * - claim_detections (AI damage findings)
 */

import { safeAI } from "@/lib/aiGuard";
import { logger } from "@/lib/logger";
import { getOpenAI } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { getStormEvidence } from "@/lib/weather";

import type {
  AdjusterCoverLetterData,
  ContractorSummaryData,
  RepairJustificationData,
} from "../folderSchema";

// ============================================================================
// REPAIR JUSTIFICATION GENERATOR
// ============================================================================

interface RepairJustificationContext {
  claimId: string;
  orgId: string;
}

export async function generateRepairJustification(
  ctx: RepairJustificationContext
): Promise<RepairJustificationData | null> {
  const { claimId, orgId } = ctx;

  try {
    // Fetch all relevant data in parallel
    const [claim, stormEvidence, detections, codeFlags, simulation] = await Promise.all([
      prisma.claims.findUnique({
        where: { id: claimId },
        include: { properties: true },
      }),
      getStormEvidence(claimId),
      prisma.claim_detections.findMany({
        where: { claimId },
        orderBy: { confidence: "desc" },
        take: 20,
      }),
      prisma.claim_analysis.findUnique({
        where: { claim_id: claimId },
        select: { code_flags: true, risk_flags: true },
      }),
      prisma.claim_simulations.findFirst({
        where: { claimId },
        orderBy: { computedAt: "desc" },
      }),
    ]);

    if (!claim) return null;

    const property = claim.properties;
    const roofDetections = detections.filter((d) => d.modelGroup === "roof");
    const hailDetections = detections.filter((d) => d.modelGroup === "hail");
    const collateralDetections = detections.filter((d) => d.isCollateral);
    const codeViolations = detections.filter((d) => d.isCodeViolation);

    // Build prompt context
    const promptContext = {
      property: {
        address: `${property?.street}, ${property?.city}, ${property?.state} ${property?.zipCode}`,
        roofType: claim.damageType || "unknown",
      },
      stormEvidence: stormEvidence
        ? {
            dateOfLoss: stormEvidence.selectedDOL?.toISOString().split("T")[0],
            primaryPeril: stormEvidence.primaryPeril,
            hailSize: stormEvidence.hailSizeInches,
            windSpeed: stormEvidence.windSpeedMph,
            evidenceGrade: stormEvidence.evidenceGrade,
            overallScore: stormEvidence.overallScore,
            dolConfidence: Math.round(stormEvidence.dolConfidence * 100),
            photoCorrelation: Math.round((stormEvidence.correlationScore ?? 0) * 100),
            aiNarrative: stormEvidence.aiNarrative,
          }
        : null,
      aiDetections: {
        roofDamage: roofDetections.length,
        hailDamage: hailDetections.length,
        collateral: collateralDetections.length,
        codeViolations: codeViolations.length,
        topFindings: detections.slice(0, 5).map((d) => ({
          type: d.className,
          confidence: Math.round((d.confidence || 0) * 100),
          severity: d.severity,
          component: d.componentType,
        })),
      },
      codeCompliance: {
        flags: (codeFlags?.code_flags as string[]) || [],
        risks: (codeFlags?.risk_flags as string[]) || [],
      },
      simulation: simulation
        ? {
            approvalProbability: simulation.approvalProbability,
            predictedOutcome: simulation.predictedOutcome,
            positiveFactors: (simulation.positiveFactors as string[])?.slice(0, 5) || [],
            negativeFactors: (simulation.negativeFactors as string[])?.slice(0, 5) || [],
          }
        : null,
    };

    const openai = getOpenAI();

    const result = await safeAI("repair-justification", () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a professional roofing contractor creating a repair justification for an insurance claim. Write in a professional, factual tone. Focus on:
1. Why full replacement is justified (not repair)
2. Code compliance requirements that necessitate replacement
3. Manufacturer warranty considerations
4. Storm damage evidence supporting the claim
5. Industry standards and best practices

Be specific and cite evidence from the provided data. Use industry terminology but explain it clearly.`,
          },
          {
            role: "user",
            content: JSON.stringify(promptContext, null, 2),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "RepairJustification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                justificationNarrative: {
                  type: "string",
                  description: "2-3 paragraph professional justification for full replacement",
                },
                evidencePoints: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key evidence points supporting replacement",
                },
                codeRequirements: {
                  type: "array",
                  items: { type: "string" },
                  description: "Code requirements necessitating full replacement",
                },
                repairVsReplace: {
                  type: "string",
                  enum: ["replacement_required", "replacement_recommended", "repair_possible"],
                },
                confidence: { type: "number" },
              },
              required: [
                "justificationNarrative",
                "evidencePoints",
                "codeRequirements",
                "repairVsReplace",
                "confidence",
              ],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.7,
        max_tokens: 2000,
      })
    );

    if (!result.ok) {
      logger.error("[REPAIR_JUSTIFICATION] AI generation failed:", result.error);
      return null;
    }

    const parsed = JSON.parse(result.result.choices[0]?.message?.content || "{}");

    return {
      justificationNarrative: parsed.justificationNarrative || "",
      repairVsReplaceRationale: parsed.evidencePoints?.join("\n\n") || "",
      codeRequirements: parsed.codeRequirements || [],
      warrantyConsiderations: [],
      industryStandards: [],
      recommendation:
        parsed.repairVsReplace === "replacement_required" ? "full_replacement" : "repair",
    };
  } catch (error) {
    logger.error("[REPAIR_JUSTIFICATION] Generation failed:", error);
    return null;
  }
}

// ============================================================================
// CONTRACTOR SUMMARY GENERATOR
// ============================================================================

interface ContractorSummaryContext {
  claimId: string;
  orgId: string;
}

export async function generateContractorSummary(
  ctx: ContractorSummaryContext
): Promise<ContractorSummaryData | null> {
  const { claimId, orgId } = ctx;

  try {
    const [claim, stormEvidence, branding] = await Promise.all([
      prisma.claims.findUnique({
        where: { id: claimId },
        include: { properties: true },
      }),
      getStormEvidence(claimId),
      prisma.org_branding.findFirst({ where: { orgId } }),
    ]);

    if (!claim) return null;

    const property = claim.properties;

    const promptContext = {
      property: {
        address: `${property?.street}, ${property?.city}, ${property?.state} ${property?.zipCode}`,
      },
      claim: {
        claimNumber: claim.claimNumber,
        dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0],
        carrier: claim.carrier,
        damageType: claim.damageType,
      },
      stormEvidence: stormEvidence
        ? {
            primaryPeril: stormEvidence.primaryPeril,
            hailSize: stormEvidence.hailSizeInches,
            windSpeed: stormEvidence.windSpeedMph,
            evidenceGrade: stormEvidence.evidenceGrade,
          }
        : null,
      contractor: {
        name: branding?.companyName || "Contractor",
        license: branding?.license || "",
      },
    };

    const openai = getOpenAI();

    const result = await safeAI("contractor-summary", () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are creating a professional contractor summary for a property damage restoration project. The summary should:
1. Provide a high-level overview of the project scope
2. Highlight key findings from the inspection
3. Summarize the recommended work
4. Include estimated timeline and key milestones
5. Be professional and reassuring to the property owner`,
          },
          {
            role: "user",
            content: JSON.stringify(promptContext, null, 2),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ContractorSummary",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summaryNarrative: { type: "string" },
                keyFindings: { type: "array", items: { type: "string" } },
                recommendedScope: { type: "string" },
                estimatedDuration: { type: "string" },
                warrantyOffered: { type: "string" },
              },
              required: ["summaryNarrative", "keyFindings", "recommendedScope"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.7,
        max_tokens: 1500,
      })
    );

    if (!result.ok) {
      logger.error("[CONTRACTOR_SUMMARY] AI generation failed:", result.error);
      return null;
    }

    const parsed = JSON.parse(result.result.choices[0]?.message?.content || "{}");

    return {
      summaryNarrative: parsed.summaryNarrative || "",
      keyFindings: parsed.keyFindings || [],
      recommendedScope: parsed.recommendedScope || "",
      estimatedDuration: parsed.estimatedDuration || "2-3 weeks",
      warrantyOffered: parsed.warrantyOffered || "5-year workmanship warranty",
    };
  } catch (error) {
    logger.error("[CONTRACTOR_SUMMARY] Generation failed:", error);
    return null;
  }
}

// ============================================================================
// ADJUSTER COVER LETTER GENERATOR
// ============================================================================

interface AdjusterCoverLetterContext {
  claimId: string;
  orgId: string;
  senderName: string;
  senderTitle: string;
}

export async function generateAdjusterCoverLetter(
  ctx: AdjusterCoverLetterContext
): Promise<AdjusterCoverLetterData | null> {
  const { claimId, orgId, senderName, senderTitle } = ctx;

  try {
    const [claim, stormEvidence, simulation, attachments] = await Promise.all([
      prisma.claims.findUnique({
        where: { id: claimId },
        include: { properties: true },
      }),
      getStormEvidence(claimId),
      prisma.claim_simulations.findFirst({
        where: { claimId },
        orderBy: { computedAt: "desc" },
      }),
      prisma.file_assets.findMany({
        where: { claimId, orgId },
        select: { filename: true, category: true },
        take: 20,
      }),
    ]);

    if (!claim) return null;

    const property = claim.properties;
    const attachmentsList = attachments.map((a) => a.filename || a.category || "Document");

    const promptContext = {
      claim: {
        claimNumber: claim.claimNumber,
        policyNumber: claim.policy_number,
        dateOfLoss: claim.dateOfLoss?.toISOString().split("T")[0],
        carrier: claim.carrier,
        adjusterName: claim.adjusterName,
      },
      property: {
        address: `${property?.street}, ${property?.city}, ${property?.state} ${property?.zipCode}`,
        insuredName: claim.insured_name,
      },
      stormEvidence: stormEvidence
        ? {
            primaryPeril: stormEvidence.primaryPeril,
            hailSize: stormEvidence.hailSizeInches,
            windSpeed: stormEvidence.windSpeedMph,
            evidenceGrade: stormEvidence.evidenceGrade,
            overallScore: stormEvidence.overallScore,
            dolConfidence: Math.round(stormEvidence.dolConfidence * 100),
          }
        : null,
      simulation: simulation
        ? {
            approvalProbability: simulation.approvalProbability,
            predictedOutcome: simulation.predictedOutcome,
          }
        : null,
      attachments: attachmentsList.slice(0, 15),
      sender: { name: senderName, title: senderTitle },
    };

    const openai = getOpenAI();

    const result = await safeAI("adjuster-cover-letter", () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are writing a professional cover letter to an insurance adjuster on behalf of a roofing contractor. The letter should:
1. Be professional and courteous
2. Clearly state the purpose (claim documentation submission)
3. Highlight key evidence supporting the claim
4. Reference attached documents
5. Request timely review and approval
6. Be concise (3-4 paragraphs max)`,
          },
          {
            role: "user",
            content: JSON.stringify(promptContext, null, 2),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "AdjusterCoverLetter",
            strict: true,
            schema: {
              type: "object",
              properties: {
                letterBody: { type: "string" },
                keyPoints: { type: "array", items: { type: "string" } },
              },
              required: ["letterBody", "keyPoints"],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.7,
        max_tokens: 1200,
      })
    );

    if (!result.ok) {
      logger.error("[ADJUSTER_COVER_LETTER] AI generation failed:", result.error);
      return null;
    }

    const parsed = JSON.parse(result.result.choices[0]?.message?.content || "{}");

    return {
      adjusterName: claim.adjusterName || undefined,
      carrierName: claim.carrier || "Insurance Carrier",
      claimNumber: claim.claimNumber || "",
      dateOfLoss: claim.dateOfLoss || new Date(),
      propertyAddress: `${property?.street}, ${property?.city}, ${property?.state} ${property?.zipCode}`,
      letterBody: parsed.letterBody || "",
      attachmentsList,
      senderName,
      senderTitle,
    };
  } catch (error) {
    logger.error("[ADJUSTER_COVER_LETTER] Generation failed:", error);
    return null;
  }
}
