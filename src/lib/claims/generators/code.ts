/**
 * PHASE 50 - CODE COMPLIANCE GENERATOR
 * Auto-generates code requirement summaries using IRC R905.x and manufacturer specs
 * 
 * Using:
 * - IRC R905.x (International Residential Code)
 * - Manufacturer specifications
 * - State-specific laws
 * - Underlayment requirements
 * - Eave/valley/transition codes
 * - Starter, ridge, drip edge, ice & water requirements
 * 
 * The system:
 * ✔ Identifies missing code items
 * ✔ Adds them to the narrative
 * ✔ Adds them to the supplement
 * ✔ Flags them in the UI
 * ✔ Explains WHY they are REQUIRED
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export interface CodeRequirement {
  code: string; // e.g., "IRC R905.2.8.5"
  description: string;
  category: "underlayment" | "flashing" | "starter" | "ridge" | "valley" | "ventilation" | "fasteners" | "ice_water";
  required: boolean;
  reason: string;
  materialSpec?: string;
  estimatedCost?: number;
}

export interface CodeSummary {
  requiredItems: string[];
  safetyConcerns: string[];
  missingItems: CodeRequirement[];
  codeReferences: string[];
  totalEstimatedCost: number;
  urgency: "critical" | "high" | "medium" | "low";
  generatedAt: Date;
}

/**
 * Generate comprehensive code compliance summary
 */
export async function generateCodeSummary(claimId: string): Promise<CodeSummary> {
  try {
    logger.debug(`[code] Generating code summary for claim ${claimId}`);

    // Fetch claim with property details
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      include: {
        properties: true,
        estimates: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const property = claim.properties;
    const state = property?.state || "TX"; // Default to Texas
    const roofType = property?.roofType || "asphalt_shingle";
    const yearBuilt = property?.yearBuilt || 2010;

    // Determine applicable code requirements
    const requirements = determineCodeRequirements(roofType, state, yearBuilt);

    // Identify missing items from estimate
    const missingItems = identifyMissingItems(requirements, claim.estimates[0]);

    // Calculate urgency
    const urgency = calculateUrgency(missingItems);

    // Extract required items list
    const requiredItems = requirements
      .filter((r) => r.required)
      .map((r) => `${r.code}: ${r.description} - ${r.reason}`);

    // Extract safety concerns
    const safetyConcerns = requirements
      .filter((r) => r.category === "ice_water" || r.category === "flashing" || r.reason.toLowerCase().includes("safety"))
      .map((r) => `${r.description}: ${r.reason}`);

    // Extract code references
    const codeReferences = [...new Set(requirements.map((r) => r.code))];

    // Calculate total estimated cost
    const totalEstimatedCost = missingItems.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

    logger.debug(`[code] Found ${missingItems.length} missing code items, total cost: $${totalEstimatedCost}`);

    return {
      requiredItems,
      safetyConcerns,
      missingItems,
      codeReferences,
      totalEstimatedCost,
      urgency,
      generatedAt: new Date(),
    };
  } catch (error) {
    logger.error("[code] Generation failed:", error);
    throw new Error(`Failed to generate code summary: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Determine applicable code requirements based on property characteristics
 */
function determineCodeRequirements(roofType: string, state: string, yearBuilt: number): CodeRequirement[] {
  const requirements: CodeRequirement[] = [];

  // Universal requirements for asphalt shingles
  if (roofType === "asphalt_shingle" || roofType === "ASPHALT_SHINGLE") {
    // IRC R905.2.3 - Deck requirements
    requirements.push({
      code: "IRC R905.2.3",
      description: "Solid or closely fitted deck required",
      category: "underlayment",
      required: true,
      reason: "Code requires solid deck for proper shingle installation",
      materialSpec: "OSB or plywood sheathing minimum 7/16\" thick",
      estimatedCost: 2.5, // per sq ft
    });

    // IRC R905.2.7 - Underlayment
    requirements.push({
      code: "IRC R905.2.7",
      description: "Underlayment required on entire roof deck",
      category: "underlayment",
      required: true,
      reason: "Code requires water-resistant underlayment as secondary weather barrier",
      materialSpec: "ASTM D226 Type I or ASTM D4869 Type I synthetic underlayment",
      estimatedCost: 0.45, // per sq ft
    });

    // IRC R905.2.7.1 - Ice barrier
    if (state === "MN" || state === "WI" || state === "MI" || state === "ND" || state === "SD" || state === "MT") {
      requirements.push({
        code: "IRC R905.2.7.1",
        description: "Ice barrier required in areas subject to ice damming",
        category: "ice_water",
        required: true,
        reason: "Code requires ice barrier in climates with average daily temp ≤ 25°F in January",
        materialSpec: "Self-adhering polymer modified bitumen sheet minimum 2 layers at eaves",
        estimatedCost: 1.2, // per sq ft
      });
    }

    // IRC R905.2.8.5 - Drip edge
    requirements.push({
      code: "IRC R905.2.8.5",
      description: "Drip edge required at eaves and gables",
      category: "flashing",
      required: true,
      reason: "Code requires corrosion-resistant drip edge to direct water away from underlying construction",
      materialSpec: "24-gauge galvanized steel or aluminum minimum 3\" width",
      estimatedCost: 2.5, // per linear foot
    });

    // IRC R905.2.5 - Starter strips
    requirements.push({
      code: "IRC R905.2.5",
      description: "Starter strip required at eaves and rakes",
      category: "starter",
      required: true,
      reason: "Required to seal and protect first course of shingles",
      materialSpec: "Manufacturer-approved starter strip or cut shingles",
      estimatedCost: 0.8, // per linear foot
    });

    // IRC R905.2.8.2 - Valley flashing
    requirements.push({
      code: "IRC R905.2.8.2",
      description: "Valley flashing required at all roof valleys",
      category: "valley",
      required: true,
      reason: "Code requires minimum 24-gauge corrosion-resistant metal valley flashing",
      materialSpec: "24-gauge galvanized steel minimum 24\" wide",
      estimatedCost: 8.0, // per linear foot
    });

    // IRC R905.2.6 - Hip and ridge
    requirements.push({
      code: "IRC R905.2.6",
      description: "Hip and ridge shingles required at all hips and ridges",
      category: "ridge",
      required: true,
      reason: "Required for proper weatherproofing of hip and ridge intersections",
      materialSpec: "Manufacturer-approved hip and ridge shingles",
      estimatedCost: 4.5, // per linear foot
    });

    // IRC R905.2.4 - Fasteners
    requirements.push({
      code: "IRC R905.2.4",
      description: "Proper fasteners required per manufacturer specs",
      category: "fasteners",
      required: true,
      reason: "Code requires minimum 4 fasteners per shingle (6 in high wind areas)",
      materialSpec: "1\" - 1.5\" roofing nails, minimum 12 gauge shank, 3/8\" head",
      estimatedCost: 0.15, // per sq ft
    });

    // IRC R806 - Ventilation
    requirements.push({
      code: "IRC R806.2",
      description: "Minimum ventilation required",
      category: "ventilation",
      required: true,
      reason: "Code requires 1:150 net free ventilation area (1:300 with proper balance)",
      materialSpec: "Ridge vent, soffit vents, or gable vents per code",
      estimatedCost: 3.5, // per linear foot
    });
  }

  // High-wind zone requirements (Texas coastal, Florida, etc.)
  if (["TX", "FL", "LA", "MS", "AL", "SC", "NC"].includes(state)) {
    requirements.push({
      code: "IRC R905.2.4.1",
      description: "Enhanced fastening required in high-wind zones",
      category: "fasteners",
      required: true,
      reason: "High-wind areas require 6 fasteners per shingle and sealed shingles",
      materialSpec: "6 nails per shingle + adhesive sealant strips",
      estimatedCost: 0.25, // per sq ft
    });
  }

  // Newer code requirements (post-2018)
  if (yearBuilt >= 2018 || true) {
    // Always apply latest code for repairs
    requirements.push({
      code: "IRC R905.2.8.4",
      description: "Proper flashing required at wall/roof intersections",
      category: "flashing",
      required: true,
      reason: "Code requires step flashing at sidewall intersections with minimum 4\" lap",
      materialSpec: "24-gauge galvanized step flashing, 8\" x 8\" minimum",
      estimatedCost: 6.0, // per linear foot
    });
  }

  return requirements;
}

/**
 * Identify missing code items from existing estimate
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function identifyMissingItems(requirements: CodeRequirement[], estimate: any): CodeRequirement[] {
  if (!estimate) {
    // No estimate - all requirements are missing
    return requirements;
  }

  // Parse estimate line items to see what's included
  const estimateItems = estimate.lineItems || [];
  const estimateText = JSON.stringify(estimateItems).toLowerCase();

  // Check each requirement
  const missing = requirements.filter((req) => {
    const keywords = getKeywordsForCategory(req.category);
    const found = keywords.some((keyword) => estimateText.includes(keyword.toLowerCase()));
    return !found;
  });

  return missing;
}

/**
 * Get search keywords for each category
 */
function getKeywordsForCategory(category: string): string[] {
  const keywords: Record<string, string[]> = {
    underlayment: ["underlayment", "felt", "synthetic", "barrier"],
    flashing: ["flashing", "drip edge", "step flash", "counter flash"],
    starter: ["starter", "starter strip"],
    ridge: ["ridge", "hip cap", "ridge cap"],
    valley: ["valley", "valley metal", "valley flashing"],
    ventilation: ["vent", "ridge vent", "soffit vent", "ventilation"],
    fasteners: ["nail", "fastener", "attachment"],
    ice_water: ["ice", "ice barrier", "ice & water", "ice and water"],
  };

  return keywords[category] || [];
}

/**
 * Calculate urgency based on missing items
 */
function calculateUrgency(missingItems: CodeRequirement[]): "critical" | "high" | "medium" | "low" {
  if (missingItems.length === 0) return "low";

  const criticalCategories = ["ice_water", "flashing"];
  const hasCritical = missingItems.some((item) => criticalCategories.includes(item.category));

  if (hasCritical) return "critical";
  if (missingItems.length >= 5) return "high";
  if (missingItems.length >= 3) return "medium";
  return "low";
}

/**
 * Format code requirements for carrier submission
 */
export function formatCodeRequirementsForCarrier(summary: CodeSummary): string {
  let formatted = "**BUILDING CODE REQUIREMENTS:**\n\n";

  formatted += `Based on applicable building codes, the following items are REQUIRED (not optional):\n\n`;

  summary.missingItems.forEach((item, index) => {
    formatted += `${index + 1}. **${item.code}** - ${item.description}\n`;
    formatted += `   - Reason: ${item.reason}\n`;
    formatted += `   - Specification: ${item.materialSpec || "Per manufacturer"}\n`;
    if (item.estimatedCost) {
      formatted += `   - Estimated Cost Impact: Included in code-compliant installation\n`;
    }
    formatted += `\n`;
  });

  if (summary.safetyConcerns.length > 0) {
    formatted += `\n**SAFETY-CRITICAL ITEMS:**\n`;
    summary.safetyConcerns.forEach((concern, index) => {
      formatted += `${index + 1}. ${concern}\n`;
    });
  }

  formatted += `\n**TOTAL CODE-REQUIRED ITEMS:** ${summary.missingItems.length}\n`;
  formatted += `**URGENCY LEVEL:** ${summary.urgency.toUpperCase()}\n`;

  return formatted;
}
