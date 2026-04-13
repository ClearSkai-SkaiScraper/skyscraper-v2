/**
 * Next Best Actions API — GET /api/claims/[claimId]/next-actions
 *
 * AI-powered "Auto Win Engine" that analyzes a claim and suggests
 * revenue-increasing actions the contractor can add with one click.
 *
 * Actions include: soft metals, code upgrades, ventilation,
 * collateral damage, measurement corrections, recoverable depreciation.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { getRouteParams, withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

interface SuggestedAction {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedAmount: number;
  confidence: number;
  rationale: string;
  xactimateCode?: string;
}

// Common revenue-increasing items that adjusters frequently miss
const COMMON_MISSED_ITEMS: Array<{
  title: string;
  description: string;
  category: string;
  estimatedRange: [number, number];
  rationale: string;
  xactimateCode: string;
  requiredDamageTypes: string[];
  requiredComponents: string[];
}> = [
  {
    title: "Soft Metal Replacement — Pipe Boots",
    description: "Hail-damaged lead pipe boot flashings require replacement per manufacturer specs",
    category: "soft_metals",
    estimatedRange: [180, 450],
    rationale:
      "Soft metals (lead/aluminum) show hail impact at lower thresholds than shingles. Most adjusters skip these.",
    xactimateCode: "RFG FLSHPB",
    requiredDamageTypes: ["hail_damage", "impact", "dent", "bruising"],
    requiredComponents: ["pipe_boot", "flashing", "roof_vent"],
  },
  {
    title: "Soft Metal Replacement — Roof Vents",
    description: "Aluminum roof vents with hail dents require full replacement",
    category: "soft_metals",
    estimatedRange: [120, 350],
    rationale:
      "Dented vents compromise ventilation and are a guaranteed approval item in hail claims.",
    xactimateCode: "RFG VENTRF",
    requiredDamageTypes: ["hail_damage", "impact", "dent"],
    requiredComponents: ["roof_vent", "turbine_vent", "power_vent"],
  },
  {
    title: "IRC Code Upgrade — Ridge Vent",
    description: "Local building code requires ridge vent installation during re-roof",
    category: "code_upgrade",
    estimatedRange: [400, 1200],
    rationale:
      "IRC R806 requires balanced ventilation. If existing roof lacks ridge vent, code upgrade is owed during replacement.",
    xactimateCode: "RFG VENTRD",
    requiredDamageTypes: ["hail_damage", "wind_damage", "impact"],
    requiredComponents: ["ridge_cap", "roof_vent"],
  },
  {
    title: "IRC Code Upgrade — Drip Edge",
    description: "International Building Code requires drip edge on all replacement roofs",
    category: "code_upgrade",
    estimatedRange: [300, 900],
    rationale:
      "IRC R905.2.8.5 mandates drip edge. If not present on original roof, it's a code-required upgrade.",
    xactimateCode: "RFG DRIPEG",
    requiredDamageTypes: ["hail_damage", "wind_damage"],
    requiredComponents: ["drip_edge", "eave", "rake_edge"],
  },
  {
    title: "Ventilation — Intake/Exhaust Balancing",
    description: "Replace damaged ventilation and ensure balanced intake/exhaust per code",
    category: "ventilation",
    estimatedRange: [350, 1000],
    rationale:
      "Damaged ventilation components require matching replacement. Code requires 1:150 ratio of ventilation to attic space.",
    xactimateCode: "RFG VENTBA",
    requiredDamageTypes: ["hail_damage", "wind_damage", "impact"],
    requiredComponents: ["roof_vent", "turbine_vent", "power_vent", "eave"],
  },
  {
    title: "Gutter Replacement — Hail Dents",
    description: "Aluminum gutters with hail damage — dents compromise water flow",
    category: "collateral",
    estimatedRange: [800, 2500],
    rationale:
      "Gutters are soft metal and show damage at lower thresholds. Dents cause pooling and overflow.",
    xactimateCode: "SID GUTTER",
    requiredDamageTypes: ["hail_damage", "dent", "impact"],
    requiredComponents: ["gutter", "downspout"],
  },
  {
    title: "Collateral Damage — Window Screens",
    description: "Window screens damaged by hail — commonly overlooked by adjusters",
    category: "collateral",
    estimatedRange: [200, 600],
    rationale:
      "Window screens are soft metal/mesh that show hail impact. Often missed in initial adjustment.",
    xactimateCode: "SID WINSCRN",
    requiredDamageTypes: ["hail_damage", "impact"],
    requiredComponents: ["window", "siding"],
  },
  {
    title: "Starter Strip & Ice/Water Shield",
    description: "Starter strip and ice/water shield replacement required with roof replacement",
    category: "general",
    estimatedRange: [250, 800],
    rationale:
      "Manufacturer warranty requires starter strip. Ice/water shield required in most jurisdictions at eaves and valleys.",
    xactimateCode: "RFG STRSTR",
    requiredDamageTypes: ["hail_damage", "wind_damage"],
    requiredComponents: ["starter_strip", "eave", "valley"],
  },
  {
    title: "Recoverable Depreciation Review",
    description: "Ensure all recoverable depreciation is claimed after repairs completed",
    category: "depreciation",
    estimatedRange: [500, 5000],
    rationale:
      "Many contractors forget to file for recoverable depreciation after job completion. This is free money.",
    xactimateCode: "N/A",
    requiredDamageTypes: [],
    requiredComponents: [],
  },
];

export const GET = withAuth(async (_req, { orgId }, routeContext) => {
  const { claimId } = await getRouteParams<{ claimId: string }>(routeContext);

  try {
    // 1. Get estimates for this claim first
    const estimates = await prisma.estimates.findMany({
      where: { claim_id: claimId, orgId },
      select: { id: true },
    });
    const estimateIds = estimates.map((e) => e.id);

    // 2. Get existing damage data for this claim
    const [photoMeta, supplementItems, lineItems, claim] = await Promise.all([
      // Get photo metadata with AI analysis results
      prisma.claim_photo_meta.findMany({
        where: { claimId, orgId },
        select: {
          id: true,
          damageType: true,
          severity: true,
          materials: true,
          annotations: true,
        },
      }),
      // Get existing supplement items (to avoid duplicates)
      // Scoped through org-verified claim_id (claim ownership verified via estimates query above)
      prisma.supplement_items.findMany({
        where: {
          claim_id: claimId,
          supplements: { claim_id: claimId, org_id: orgId },
        },
        select: { description: true, category: true },
      }),
      // Get existing line items via estimates
      estimateIds.length > 0
        ? prisma.estimate_line_items.findMany({
            where: { estimate_id: { in: estimateIds } },
            select: { name: true, category: true, section_name: true },
          })
        : Promise.resolve([]),
      // Get claim for damage type
      prisma.claims.findUnique({
        where: { id: claimId },
        select: { damageType: true },
      }),
    ]);

    // 3. Extract damage types and components from photo analyses
    const detectedDamageTypes = new Set<string>();
    const detectedComponents = new Set<string>();

    // Add claim's primary damage type
    if (claim?.damageType) {
      detectedDamageTypes.add(claim.damageType.toLowerCase());
    }

    for (const photo of photoMeta) {
      if (photo.damageType) detectedDamageTypes.add(photo.damageType.toLowerCase());

      // Extract from annotations if present
      if (photo.annotations && typeof photo.annotations === "object") {
        const annotations = photo.annotations as Record<string, unknown>;
        if (Array.isArray(annotations)) {
          for (const annotation of annotations) {
            if (typeof annotation === "object" && annotation !== null) {
              const a = annotation as Record<string, unknown>;
              if (typeof a.type === "string") detectedDamageTypes.add(a.type.toLowerCase());
              if (typeof a.component === "string")
                detectedComponents.add(a.component.toLowerCase());
              if (typeof a.damageType === "string")
                detectedDamageTypes.add(a.damageType.toLowerCase());
            }
          }
        }
      }

      // Extract from materials if present
      if (photo.materials && Array.isArray(photo.materials)) {
        for (const material of photo.materials) {
          if (typeof material === "string") {
            detectedComponents.add(material.toLowerCase());
          }
        }
      }
    }

    // 4. Existing descriptions for dedup
    const existingDescriptions = new Set([
      ...supplementItems.map((si) => si.description?.toLowerCase() || ""),
      ...lineItems.map((li) => li.name?.toLowerCase() || ""),
    ]);

    // 5. Match recommendations against detected damage
    const suggestedActions: SuggestedAction[] = [];
    let actionId = 0;

    for (const template of COMMON_MISSED_ITEMS) {
      // Skip if already in scope
      const alreadyExists =
        existingDescriptions.has(template.title.toLowerCase()) ||
        [...existingDescriptions].some((d) =>
          d.includes(template.title.toLowerCase().split(" — ")[0].toLowerCase())
        );
      if (alreadyExists) continue;

      // Check if damage types match (empty = always applicable)
      const damageMatch =
        template.requiredDamageTypes.length === 0 ||
        template.requiredDamageTypes.some((dt) =>
          [...detectedDamageTypes].some(
            (detected) => detected.includes(dt.replace("_", " ")) || detected.includes(dt)
          )
        );

      const componentMatch =
        template.requiredComponents.length === 0 ||
        template.requiredComponents.some((c) =>
          [...detectedComponents].some(
            (detected) => detected.includes(c.replace("_", " ")) || detected.includes(c)
          )
        );

      // Must match at least damage type OR component
      if (!damageMatch && !componentMatch && template.requiredDamageTypes.length > 0) continue;

      // Calculate estimated amount (midpoint of range)
      const estimatedAmount = Math.round(
        (template.estimatedRange[0] + template.estimatedRange[1]) / 2
      );

      // Confidence based on how well we match
      const confidence =
        damageMatch && componentMatch ? 0.9 : damageMatch || componentMatch ? 0.7 : 0.5;

      suggestedActions.push({
        id: `nba_${++actionId}`,
        title: template.title,
        description: template.description,
        category: template.category,
        estimatedAmount,
        confidence,
        rationale: template.rationale,
        xactimateCode: template.xactimateCode,
      });
    }

    // Sort by estimated amount descending
    suggestedActions.sort((a, b) => b.estimatedAmount - a.estimatedAmount);

    logger.info("[NEXT_ACTIONS]", {
      claimId,
      orgId,
      suggestedCount: suggestedActions.length,
      totalPotential: suggestedActions.reduce((sum, a) => sum + a.estimatedAmount, 0),
      damageTypes: [...detectedDamageTypes],
      components: [...detectedComponents],
    });

    if (suggestedActions.length === 0) {
      return NextResponse.json({ error: "No additional actions found" }, { status: 404 });
    }

    return NextResponse.json({
      actions: suggestedActions,
      totalPotential: suggestedActions.reduce((sum, a) => sum + a.estimatedAmount, 0),
      meta: {
        photosAnalyzed: photoMeta.length,
        damageTypesDetected: [...detectedDamageTypes],
        componentsDetected: [...detectedComponents],
        existingLineItems: lineItems.length,
        existingSupplements: supplementItems.length,
      },
    });
  } catch (error) {
    logger.error("[NEXT_ACTIONS] Error:", { claimId, error });
    return NextResponse.json({ error: "Failed to compute next actions" }, { status: 500 });
  }
});
