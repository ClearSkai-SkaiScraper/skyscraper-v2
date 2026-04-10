/**
 * Evidence Gap Detector — R3
 *
 * Cross-references which YOLO model groups have been run vs which COULD be run.
 * Identifies missing evidence opportunities and estimates their impact on
 * the claim simulation score.
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvidenceGap {
  modelGroup: string;
  displayName: string;
  description: string;
  missingDetectionTypes: string[];
  estimatedImpact: number; // points to simulation score
  effort: "quick" | "moderate" | "involved";
  priority: "high" | "medium" | "low";
  recommendedPhotos: string[];
}

export interface EvidenceGapAnalysis {
  claimId: string;
  totalGaps: number;
  totalEstimatedImpact: number;
  gaps: EvidenceGap[];
  modelGroupsRun: string[];
  modelGroupsMissing: string[];
  coveragePercent: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// All available model groups and their evidence value
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_GROUP_DEFINITIONS: Record<
  string,
  {
    displayName: string;
    description: string;
    detectionTypes: string[];
    evidenceImpact: number;
    effort: "quick" | "moderate" | "involved";
    recommendedPhotos: string[];
    applicableDamageTypes: string[];
  }
> = {
  roof: {
    displayName: "Roof Damage",
    description: "Primary roof damage detection — hail impacts, wind damage, missing shingles",
    detectionTypes: ["roof_hail", "roof_wind", "roof_damage", "roof_shingle"],
    evidenceImpact: 20,
    effort: "moderate",
    recommendedPhotos: ["Full roof overview", "Close-up of damaged shingles", "Ridge line photos"],
    applicableDamageTypes: ["hail", "wind", "storm", "roof"],
  },
  storm: {
    displayName: "Full Storm Assessment (HAAG)",
    description: "Comprehensive HAAG-standard storm damage detection across all components",
    detectionTypes: [
      "roof_hail",
      "roof_wind",
      "soft_metal_damage",
      "metal_dent",
      "vent_damage",
      "gutter_damage",
      "spatter_detection",
      "ac_condenser",
      "ac_fin_damage",
      "window_screen",
      "screen_damage",
    ],
    evidenceImpact: 25,
    effort: "involved",
    recommendedPhotos: [
      "All roof faces",
      "Every vent and cap",
      "All gutters",
      "AC unit close-ups",
      "Window screens",
    ],
    applicableDamageTypes: ["hail", "wind", "storm"],
  },
  hail: {
    displayName: "Hail-Specific Evidence",
    description: "Hail impact detection including soft metals, spatter, and AC fin damage",
    detectionTypes: [
      "roof_hail",
      "soft_metal_damage",
      "metal_dent",
      "vent_damage",
      "gutter_damage",
      "spatter_detection",
      "aluminum_spatter",
      "ac_condenser",
      "ac_fin_damage",
      "screen_damage",
    ],
    evidenceImpact: 22,
    effort: "moderate",
    recommendedPhotos: [
      "Chalk circles around hail impacts",
      "Soft metal close-ups",
      "AC fin damage",
      "Paint spatter",
    ],
    applicableDamageTypes: ["hail", "storm"],
  },
  wind: {
    displayName: "Wind Damage Evidence",
    description: "Wind creasing, lifted shingles, and screen damage",
    detectionTypes: [
      "roof_wind",
      "roof_damage",
      "roof_shingle",
      "window_screen",
      "screen_damage",
      "gutter_damage",
    ],
    evidenceImpact: 18,
    effort: "moderate",
    recommendedPhotos: ["Windward face close-ups", "Lifted/creased shingles", "Screen tears"],
    applicableDamageTypes: ["wind", "storm"],
  },
  soft_metals: {
    displayName: "Soft Metal Denting",
    description: "Vent caps, flashing, gutters — proves hail size and direction",
    detectionTypes: [
      "soft_metal_damage",
      "metal_dent",
      "vent_damage",
      "gutter_damage",
      "flashing_damage",
    ],
    evidenceImpact: 18,
    effort: "quick",
    recommendedPhotos: [
      "Ridge vent close-up",
      "Pipe collar close-up",
      "Gutter dent photos",
      "Flashing photos",
    ],
    applicableDamageTypes: ["hail", "storm"],
  },
  collateral: {
    displayName: "Collateral Damage",
    description:
      "Non-roof items proving storm occurred — outdoor furniture, grills, AC units, mailboxes",
    detectionTypes: [
      "outdoor_furniture",
      "grill",
      "mailbox",
      "electrical_box",
      "meter_box",
      "ac_condenser",
    ],
    evidenceImpact: 15,
    effort: "quick",
    recommendedPhotos: [
      "AC unit fins",
      "Gutter dents",
      "Window screen punctures",
      "Mailbox dents",
      "Outdoor furniture",
    ],
    applicableDamageTypes: ["hail", "wind", "storm"],
  },
  spatter: {
    displayName: "Spatter Evidence",
    description: "Paint chips, oxidation rings, aluminum spatter — advanced hail indicators",
    detectionTypes: ["spatter_detection", "oxidation_ring", "aluminum_spatter"],
    evidenceImpact: 12,
    effort: "quick",
    recommendedPhotos: [
      "Paint chip patterns on roof",
      "Oxidation rings around impacts",
      "Aluminum spatter marks",
    ],
    applicableDamageTypes: ["hail"],
  },
  water: {
    displayName: "Water Damage",
    description: "Water stains, leak evidence, mold detection",
    detectionTypes: ["water_damage", "water_stain", "water_detection", "mold"],
    evidenceImpact: 14,
    effort: "moderate",
    recommendedPhotos: ["Interior water stains", "Attic leak evidence", "Mold growth areas"],
    applicableDamageTypes: ["water", "storm", "flood"],
  },
  siding: {
    displayName: "Siding & Exterior",
    description: "Vinyl, stucco, and exterior wall damage",
    detectionTypes: ["siding_damage", "stucco_damage", "crack_wall", "general_damage"],
    evidenceImpact: 12,
    effort: "moderate",
    recommendedPhotos: ["All four exterior walls", "Close-up of siding impacts", "Stucco cracks"],
    applicableDamageTypes: ["hail", "wind", "storm", "impact"],
  },
  hvac: {
    displayName: "HVAC/AC Damage",
    description: "Rooftop units, condensers, AC fin damage",
    detectionTypes: ["hvac_rooftop", "hvac_equipment", "ac_condenser", "ac_fin_damage"],
    evidenceImpact: 14,
    effort: "quick",
    recommendedPhotos: ["AC condenser unit", "AC fin close-up", "Rooftop HVAC unit"],
    applicableDamageTypes: ["hail", "storm"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Analysis
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeEvidenceGaps(
  claimId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  orgId: string
): Promise<EvidenceGapAnalysis> {
  // Get all detections for this claim
  const detections = await prisma.claim_detections.findMany({
    where: { claimId },
    select: { modelGroup: true, className: true },
  });

  // Get claim damage type to filter relevant groups
  const claim = await prisma.claims.findUnique({
    where: { id: claimId },
    select: { damageType: true },
  });

  const damageType = (claim?.damageType || "storm").toLowerCase();
  const groupsRun = new Set(detections.map((d) => d.modelGroup));

  const gaps: EvidenceGap[] = [];

  for (const [groupKey, def] of Object.entries(MODEL_GROUP_DEFINITIONS)) {
    // Skip groups not applicable to this damage type
    if (!def.applicableDamageTypes.includes(damageType) && damageType !== "general") {
      continue;
    }

    // Skip if this group was already run
    if (groupsRun.has(groupKey)) continue;

    // Skip "storm" if individual sub-groups were run
    if (groupKey === "storm") {
      const subGroupsRun = ["roof", "hail", "wind", "soft_metals", "collateral"].filter((g) =>
        groupsRun.has(g)
      );
      if (subGroupsRun.length >= 3) continue;
    }

    const gap: EvidenceGap = {
      modelGroup: groupKey,
      displayName: def.displayName,
      description: def.description,
      missingDetectionTypes: def.detectionTypes,
      estimatedImpact: def.evidenceImpact,
      effort: def.effort,
      priority: def.evidenceImpact >= 18 ? "high" : def.evidenceImpact >= 12 ? "medium" : "low",
      recommendedPhotos: def.recommendedPhotos,
    };

    gaps.push(gap);
  }

  // Sort by impact
  gaps.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

  const allApplicableGroups = Object.entries(MODEL_GROUP_DEFINITIONS)
    .filter(
      ([_, def]) => def.applicableDamageTypes.includes(damageType) || damageType === "general"
    )
    .map(([key]) => key);

  const coveragePercent =
    allApplicableGroups.length > 0
      ? Math.round(
          (allApplicableGroups.filter((g) => groupsRun.has(g)).length /
            allApplicableGroups.length) *
            100
        )
      : 0;

  logger.info("[EVIDENCE_GAP] Analysis complete", {
    claimId,
    gaps: gaps.length,
    coverage: `${coveragePercent}%`,
  });

  return {
    claimId,
    totalGaps: gaps.length,
    totalEstimatedImpact: gaps.reduce((sum, g) => sum + g.estimatedImpact, 0),
    gaps,
    modelGroupsRun: Array.from(groupsRun),
    modelGroupsMissing: gaps.map((g) => g.modelGroup),
    coveragePercent,
  };
}
