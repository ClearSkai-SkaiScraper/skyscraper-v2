// src/lib/ai/supplements.ts
//
// Enhanced with Claim Simulation + Storm Graph intelligence (Phase 2.4)
// Injects approval probability, evidence gaps, and corroboration data
// into the AI prompt so GPT-4o generates data-backed supplement arguments.
//
import { safeAI } from "@/lib/aiGuard";
import { logger } from "@/lib/logger";
import { getOpenAI } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { SUPPLEMENT_BUILDER_SYSTEM_PROMPT } from "@/lib/supplement/ai-prompts";
import { getStormEvidence, type StormEvidence } from "@/lib/weather";

type RunSupplementBuilderInput = {
  claimId?: string | null;
  orgId?: string | null;
  userId: string;

  carrierEstimateText: string;
  hoverJson?: unknown;
  scopeText?: string | null;
  photos?: { url: string; label?: string }[];
};

/* ------------------------------------------------------------------ */
/* Helper: fetch simulation intelligence for a claim                  */
/* ------------------------------------------------------------------ */
async function fetchSimulationContext(claimId: string) {
  try {
    const sim = await prisma.claim_simulations.findFirst({
      where: { claimId },
      orderBy: { computedAt: "desc" },
    });
    if (!sim) return null;

    const positiveFactors = (sim.positiveFactors as string[]) ?? [];
    const negativeFactors = (sim.negativeFactors as string[]) ?? [];
    const recommendations = (sim.recommendations as string[]) ?? [];

    return {
      approvalProbability: sim.approvalProbability,
      predictedOutcome: sim.predictedOutcome,
      confidenceLevel: sim.confidenceLevel,
      stormEvidenceScore: sim.stormEvidenceScore ?? null,
      damageEvidenceScore: sim.damageEvidenceScore ?? null,
      documentationScore: sim.documentationScore ?? null,
      codeComplianceScore: sim.codeComplianceScore ?? null,
      carrierHistoryScore: sim.carrierHistoryScore ?? null,
      positiveFactors: positiveFactors.slice(0, 5),
      negativeFactors: negativeFactors.slice(0, 5),
      recommendations: recommendations.slice(0, 5),
    };
  } catch (err) {
    logger.error("[SUPPLEMENT_AI] Simulation context fetch failed (non-critical):", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Helper: fetch storm graph / corroboration data for a claim         */
/* ------------------------------------------------------------------ */
async function fetchStormGraphContext(claimId: string) {
  try {
    // Get the claim's storm event + nearby clusters
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { catStormEventId: true, orgId: true },
    });
    if (!claim?.catStormEventId) return null;

    const clusters = await prisma.storm_clusters.findMany({
      where: { stormEventId: claim.catStormEventId, orgId: claim.orgId },
      orderBy: { corroborationScore: "desc" },
      take: 3,
    });
    if (clusters.length === 0) return null;

    const topCluster = clusters[0];
    return {
      corroborationScore: topCluster.corroborationScore,
      corroborationLevel: topCluster.corroborationLevel,
      claimsInCluster: topCluster.claimsInCluster,
      verifiedDamage: topCluster.verifiedDamage,
      hailDamageCount: topCluster.hailDamageCount,
      windDamageCount: topCluster.windDamageCount,
      totalClustersNearby: clusters.length,
      avgDamageEvidence: topCluster.avgDamageEvidence,
      narrative: topCluster.corroborationNarrative,
    };
  } catch (err) {
    logger.error("[SUPPLEMENT_AI] Storm graph context fetch failed (non-critical):", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Helper: fetch evidence gap data for a claim                        */
/* ------------------------------------------------------------------ */
async function fetchEvidenceGapContext(claimId: string) {
  try {
    const detections = await prisma.claim_detections.findMany({
      where: { claimId },
    });
    if (detections.length === 0) return null;

    const coveredGroups = new Set(detections.map((d) => d.modelGroup));

    // Key model groups that strengthen supplements
    const importantGroups = [
      "roof",
      "hail",
      "wind",
      "soft_metals",
      "collateral",
      "water",
      "siding",
    ];
    const missingGroups = importantGroups.filter((g) => !coveredGroups.has(g));
    const maxConfidence = Math.max(...detections.map((d) => d.confidence ?? 0));
    const avgConfidence =
      detections.reduce((s, d) => s + (d.confidence ?? 0), 0) / detections.length;

    return {
      totalDetections: detections.length,
      coveredModelGroups: Array.from(coveredGroups),
      missingModelGroups: missingGroups,
      maxDetectionConfidence: Math.round(maxConfidence * 100),
      avgDetectionConfidence: Math.round(avgConfidence * 100),
    };
  } catch (err) {
    logger.error("[SUPPLEMENT_AI] Evidence gap fetch failed (non-critical):", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Main: runSupplementBuilder — now with simulation + storm graph      */
/* ------------------------------------------------------------------ */
export async function runSupplementBuilder(input: RunSupplementBuilderInput) {
  const openai = getOpenAI();

  // Fetch weather context for the claim (if available)
  let stormEvidenceContext: StormEvidence | null = null;
  let simulationContext: Awaited<ReturnType<typeof fetchSimulationContext>> = null;
  let stormGraphContext: Awaited<ReturnType<typeof fetchStormGraphContext>> = null;
  let evidenceGapContext: Awaited<ReturnType<typeof fetchEvidenceGapContext>> = null;

  if (input.claimId) {
    // Fetch all intelligence in parallel for speed
    const [stormResult, simResult, sgResult, egResult] = await Promise.allSettled([
      // --- Storm Evidence (canonical weather intelligence layer) ---
      getStormEvidence(input.claimId!),
      // --- Simulation Intelligence (new) ---
      fetchSimulationContext(input.claimId!),
      // --- Storm Graph Corroboration (new) ---
      fetchStormGraphContext(input.claimId!),
      // --- Evidence Gap Analysis (new) ---
      fetchEvidenceGapContext(input.claimId!),
    ]);

    stormEvidenceContext = stormResult.status === "fulfilled" ? stormResult.value : null;
    simulationContext = simResult.status === "fulfilled" ? simResult.value : null;
    stormGraphContext = sgResult.status === "fulfilled" ? sgResult.value : null;
    evidenceGapContext = egResult.status === "fulfilled" ? egResult.value : null;
  }

  // Build the enhanced intelligence addendum for the system prompt
  const intelligenceLines: string[] = [];

  // Build storm evidence intelligence section for AI prompt
  if (stormEvidenceContext) {
    const dolConfLabel =
      stormEvidenceContext.dolConfidence >= 0.8
        ? "HIGH"
        : stormEvidenceContext.dolConfidence >= 0.5
          ? "MEDIUM"
          : "LOW";
    intelligenceLines.push(
      `\n--- STORM EVIDENCE INTELLIGENCE ---`,
      `Date of Loss: ${stormEvidenceContext.selectedDOL?.toISOString().split("T")[0] || "Under investigation"}`,
      `DOL Confidence: ${dolConfLabel} (${Math.round(stormEvidenceContext.dolConfidence * 100)}%)`,
      `Primary Peril: ${stormEvidenceContext.primaryPeril}`,
      stormEvidenceContext.hailSizeInches
        ? `Hail Size: ${stormEvidenceContext.hailSizeInches} inches`
        : "",
      stormEvidenceContext.windSpeedMph
        ? `Wind Speed: ${stormEvidenceContext.windSpeedMph} mph`
        : "",
      `Overall Evidence Score: ${stormEvidenceContext.overallScore}/100 (Grade: ${stormEvidenceContext.evidenceGrade})`,
      `Photo Correlation: ${Math.round((stormEvidenceContext.correlationScore ?? 0) * 100)}% of photos within storm window`,
      stormEvidenceContext.aiNarrative
        ? `Weather Narrative: ${stormEvidenceContext.aiNarrative}`
        : "",
      `Storm Events Confirmed: ${stormEvidenceContext.topEvents?.length || 0}`,
      `USE THIS DATA: Cite the DOL confidence, evidence grade, and photo correlation to establish storm causation. Reference specific hail sizes and wind speeds in your line item justifications.`
    );
  }

  if (simulationContext) {
    intelligenceLines.push(
      `\n--- CLAIM SIMULATION INTELLIGENCE ---`,
      `Predicted Outcome: ${simulationContext.predictedOutcome} (${simulationContext.approvalProbability}% probability)`,
      `Confidence Level: ${simulationContext.confidenceLevel}`,
      simulationContext.stormEvidenceScore != null
        ? `Storm Evidence Score: ${simulationContext.stormEvidenceScore}/100`
        : "",
      simulationContext.damageEvidenceScore != null
        ? `Damage Evidence Score: ${simulationContext.damageEvidenceScore}/100`
        : "",
      simulationContext.documentationScore != null
        ? `Documentation Score: ${simulationContext.documentationScore}/100`
        : "",
      `Positive Factors: ${simulationContext.positiveFactors.join("; ")}`,
      `Negative Factors / Gaps: ${simulationContext.negativeFactors.join("; ")}`,
      `Engine Recommendations: ${simulationContext.recommendations.join("; ")}`,
      `USE THIS DATA: Reference the simulation's predicted outcome and approval probability to add urgency and data-backed reasoning to your supplement arguments. If the predicted outcome is "denied" or "partial", specifically address the negative factors with stronger evidence arguments.`
    );
  }

  if (stormGraphContext) {
    intelligenceLines.push(
      `\n--- STORM GRAPH CORROBORATION ---`,
      `Corroboration Score: ${stormGraphContext.corroborationScore}/100 (${stormGraphContext.corroborationLevel})`,
      `Claims In Cluster: ${stormGraphContext.claimsInCluster}`,
      `Verified Damage Nearby: ${stormGraphContext.verifiedDamage} properties`,
      `Hail Damage Reports: ${stormGraphContext.hailDamageCount}`,
      `Wind Damage Reports: ${stormGraphContext.windDamageCount}`,
      `Total Clusters Nearby: ${stormGraphContext.totalClustersNearby}`,
      stormGraphContext.narrative ? `Corroboration Narrative: ${stormGraphContext.narrative}` : "",
      `USE THIS DATA: Cite the number of nearby verified claims and corroboration score to establish that this property is within a confirmed damage zone. Example: "${stormGraphContext.claimsInCluster} properties within the same storm cluster have verified damage, with a corroboration score of ${stormGraphContext.corroborationScore}/100." This is powerful third-party evidence.`
    );
  }

  if (evidenceGapContext) {
    intelligenceLines.push(
      `\n--- EVIDENCE COVERAGE ANALYSIS ---`,
      `Total AI Detections: ${evidenceGapContext.totalDetections}`,
      `Covered Model Groups: ${evidenceGapContext.coveredModelGroups.join(", ")}`,
      `Missing Model Groups: ${evidenceGapContext.missingModelGroups.join(", ") || "None — full coverage"}`,
      `Max Detection Confidence: ${evidenceGapContext.maxDetectionConfidence}%`,
      `Avg Detection Confidence: ${evidenceGapContext.avgDetectionConfidence}%`,
      `USE THIS DATA: If key model groups are covered (roof, hail, collateral), cite the AI detection confidence to support your line items. If groups are missing, recommend the inspector capture those photos before submission.`
    );
  }

  const intelligenceAddendum =
    intelligenceLines.length > 0
      ? `\n\n=== SKAI INTELLIGENCE ENGINE DATA ===\nThe following real-time intelligence was computed by the SkaiScraper Simulation + Storm Graph engines. Use it to strengthen every supplement argument.\n${intelligenceLines.filter(Boolean).join("\n")}\n=== END INTELLIGENCE ===`
      : "";

  const payload = {
    claim_id: input.claimId ?? null,
    orgId: input.orgId ?? null,
    userId: input.userId,
    carrierEstimateText: input.carrierEstimateText,
    hoverJson: input.hoverJson ?? null,
    scopeText: input.scopeText ?? null,
    photos: input.photos ?? [],
    stormEvidence: stormEvidenceContext
      ? {
          dateOfLoss: stormEvidenceContext.selectedDOL?.toISOString().split("T")[0] || null,
          primaryPeril: stormEvidenceContext.primaryPeril,
          hailSizeInches: stormEvidenceContext.hailSizeInches,
          windSpeedMph: stormEvidenceContext.windSpeedMph,
          overallScore: stormEvidenceContext.overallScore,
          evidenceGrade: stormEvidenceContext.evidenceGrade,
          dolConfidence: stormEvidenceContext.dolConfidence,
          correlationScore: stormEvidenceContext.correlationScore,
          aiNarrative: stormEvidenceContext.aiNarrative,
          stormEventCount: stormEvidenceContext.topEvents?.length || 0,
        }
      : null,
    // Intelligence fields (also available for any downstream consumers)
    simulationIntelligence: simulationContext,
    stormGraphCorroboration: stormGraphContext,
    evidenceCoverage: evidenceGapContext,
  };

  const ai = await safeAI("supplement-builder", () =>
    openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SUPPLEMENT_BUILDER_SYSTEM_PROMPT + intelligenceAddendum,
        },
        { role: "user", content: JSON.stringify(payload, null, 2) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "SupplementBuilderOutput",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              xactimateItems: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: true,
                },
              },
              notesToAdjuster: { type: "string" },
            },
            required: ["summary", "xactimateItems"],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.7,
      max_tokens: 4000,
    })
  );

  if (!ai.ok) {
    throw new Error(ai.error);
  }

  const parsed = JSON.parse(ai.result.choices[0]?.message?.content || "{}");
  return parsed;
}
