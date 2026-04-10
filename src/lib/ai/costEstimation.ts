/**
 * AI Cost Estimation Engine
 *
 * Advanced AI-powered cost estimation with pricing database
 * Material costs, labor rates, regional pricing variations
 */

import { callAI, getAIConfig } from "@/lib/ai/aiAssistant";
import { logAIAction } from "@/lib/ai/feedback/logAction";
import { logger } from "@/lib/logger";

export interface EstimateRequest {
  jobType: string;
  description: string;
  location?: {
    city: string;
    state: string;
    zipCode?: string;
  };
  damageType?: string;
  squareFootage?: number;
  materials?: string[];
  urgency?: "NORMAL" | "URGENT" | "EMERGENCY";
  claimId?: string;
  carrier?: string;
  roofType?: string;
}

export interface CostEstimate {
  lineItems: LineItem[];
  subtotals: {
    materials: number;
    labor: number;
    equipment: number;
    permits: number;
    overhead: number;
    profit: number;
  };
  total: number;
  range: {
    low: number;
    high: number;
  };
  timeline: {
    estimated: string;
    withBuffer: string;
  };
  assumptions: string[];
  recommendations: string[];
  confidence: number;
}

export interface LineItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

/**
 * Generate AI-powered cost estimate
 */
export async function generateCostEstimate(request: EstimateRequest): Promise<CostEstimate> {
  try {
    // Step 1: Get regional pricing data
    const regionalData = await getRegionalPricing(request.location);

    // Step 2: Get material costs from database
    const materialCosts = await getMaterialCosts(request.materials);

    // Step 3: Get labor rates
    const laborRates = await getLaborRates(request.location);

    // Step 4: Generate AI estimate with context
    const aiEstimate = await generateAIEstimate(request, {
      regionalData,
      materialCosts,
      laborRates,
    });

    // Step 5: Validate and adjust
    const validated = validateEstimate(aiEstimate);

    // Step 6: Apply urgency multiplier
    const final = applyUrgencyMultiplier(validated, request.urgency);

    // Step 7: Log AI action for learning
    if (request.claimId) {
      try {
        // Use a static agent identifier for estimate actions
        await logAIAction({
          claimId: request.claimId,
          agentId: "estimate-agent",
          actionType: "generate_estimate",
          inputData: {
            jobType: request.jobType,
            damageType: request.damageType,
            squareFootage: request.squareFootage,
            carrier: request.carrier,
            roofType: request.roofType,
            urgency: request.urgency,
            materials: request.materials,
            region: `${request.location?.city}, ${request.location?.state}`,
          },
          outputData: {
            estimateTotal: final.total,
            lineItemCount: final.lineItems.length,
            materialsCost: final.subtotals.materials,
            laborCost: final.subtotals.labor,
            confidenceScore: final.confidence,
            timeline: final.timeline.estimated,
          },
        });
      } catch (logError) {
        logger.error("[COST_ESTIMATION] Failed to log AI action", { error: logError });
        // Don't fail the estimation if logging fails
      }
    }

    return final;
  } catch (error) {
    logger.error("Cost estimation failed:", error);
    throw new Error("Failed to generate cost estimate");
  }
}

/**
 * Generate AI-powered estimate
 */
async function generateAIEstimate(
  request: EstimateRequest,
  context: {
    regionalData: any;
    materialCosts: any;
    laborRates: any;
  }
): Promise<CostEstimate> {
  const prompt = `You are a professional estimator. Generate a detailed cost estimate for this job:

Job Type: ${request.jobType}
Description: ${request.description}
Location: ${request.location?.city}, ${request.location?.state}
${request.squareFootage ? `Square Footage: ${request.squareFootage}` : ""}
${request.damageType ? `Damage Type: ${request.damageType}` : ""}

Regional Context:
- Average material markup: ${context.regionalData.materialMarkup}%
- Average labor rate: $${context.laborRates.hourlyRate}/hr
- Permit cost estimate: $${context.regionalData.permitCost}

Available Material Costs:
${JSON.stringify(context.materialCosts, null, 2)}

Generate a detailed estimate with:
1. Line items (materials, labor, equipment)
2. Quantities and unit costs
3. Timeline estimate
4. Key assumptions
5. Recommendations

Return as JSON with this structure:
{
  "lineItems": [
    {
      "category": "Materials",
      "description": "Item name",
      "quantity": 10,
      "unit": "sq ft",
      "unitCost": 5.50,
      "totalCost": 55.00,
      "notes": "Optional notes"
    }
  ],
  "timeline": {
    "estimated": "5-7 days",
    "withBuffer": "7-10 days"
  },
  "assumptions": ["List key assumptions"],
  "recommendations": ["List recommendations"]
}`;

  try {
    const config = getAIConfig();
    const response = await callAI(prompt, { ...config, maxTokens: 3000 });
    const estimate = JSON.parse(response.result);

    // Calculate subtotals and totals
    return calculateTotals(estimate);
  } catch (error) {
    logger.error("AI estimate generation failed:", error);

    // Return basic fallback estimate
    return generateFallbackEstimate(request);
  }
}

/**
 * Calculate totals from line items
 */
function calculateTotals(estimate: any): CostEstimate {
  const lineItems: LineItem[] = estimate.lineItems || [];

  const subtotals = {
    materials: 0,
    labor: 0,
    equipment: 0,
    permits: 0,
    overhead: 0,
    profit: 0,
  };

  // Sum by category
  for (const item of lineItems) {
    const category = item.category.toLowerCase();

    if (category.includes("material")) {
      subtotals.materials += item.totalCost;
    } else if (category.includes("labor")) {
      subtotals.labor += item.totalCost;
    } else if (category.includes("equipment")) {
      subtotals.equipment += item.totalCost;
    } else if (category.includes("permit")) {
      subtotals.permits += item.totalCost;
    }
  }

  // Calculate overhead and profit
  const directCosts =
    subtotals.materials + subtotals.labor + subtotals.equipment + subtotals.permits;
  subtotals.overhead = directCosts * 0.15; // 15% overhead
  subtotals.profit = directCosts * 0.2; // 20% profit margin

  const total = Object.values(subtotals).reduce((sum, val) => sum + val, 0);

  return {
    lineItems,
    subtotals,
    total,
    range: {
      low: total * 0.85, // -15%
      high: total * 1.15, // +15%
    },
    timeline: estimate.timeline || {
      estimated: "3-5 days",
      withBuffer: "5-7 days",
    },
    assumptions: estimate.assumptions || [],
    recommendations: estimate.recommendations || [],
    confidence: 85, // Base confidence
  };
}

/**
 * Get regional pricing data
 */
async function getRegionalPricing(location?: { city: string; state: string }) {
  // TODO: Implement regional pricing database when available
  // For now, return default pricing adjusted slightly by region
  const basePricing = getDefaultPricing();

  if (location?.state) {
    // Apply regional adjustments (simplified)
    const highCostStates = ["CA", "NY", "MA", "HI", "AK"];
    if (highCostStates.includes(location.state)) {
      return {
        ...basePricing,
        materialMarkup: basePricing.materialMarkup * 1.2,
        laborMultiplier: 1.3,
        permitCost: basePricing.permitCost * 1.5,
      };
    }
  }

  return basePricing;
}

/**
 * Get default pricing
 */
function getDefaultPricing() {
  return {
    materialMarkup: 25,
    laborMultiplier: 1.0,
    permitCost: 150,
    overheadRate: 0.15,
    profitMargin: 0.2,
  };
}

/**
 * Get material costs
 */
async function getMaterialCosts(materials?: string[]) {
  if (!materials || materials.length === 0) {
    return {};
  }

  // TODO: Implement material costs database when available
  // For now, return estimated costs based on common materials
  const defaultCosts: Record<string, number> = {
    shingle: 4.5,
    drywall: 2.25,
    lumber: 8.0,
    plywood: 35.0,
    paint: 45.0,
    insulation: 1.5,
    flooring: 6.0,
    tile: 12.0,
    siding: 7.5,
    roofing: 5.0,
  };

  const costs: Record<string, number> = {};
  for (const material of materials) {
    const lowerMaterial = material.toLowerCase();
    // Find matching default cost
    for (const [key, value] of Object.entries(defaultCosts)) {
      if (lowerMaterial.includes(key)) {
        costs[material] = value;
        break;
      }
    }
    // Default cost if not found
    if (!costs[material]) {
      costs[material] = 10.0;
    }
  }

  return costs;
}

/**
 * Get labor rates
 */
async function getLaborRates(location?: { city: string; state: string }) {
  // TODO: Implement labor rates database when available
  // Base rates adjusted by region
  let baseRate = 65;

  if (location?.state) {
    // High cost labor states
    const highCostStates = ["CA", "NY", "MA", "WA", "CT", "NJ"];
    const mediumCostStates = ["CO", "IL", "FL", "TX", "AZ", "VA"];

    if (highCostStates.includes(location.state)) {
      baseRate = 85;
    } else if (mediumCostStates.includes(location.state)) {
      baseRate = 72;
    }
  }

  return {
    hourlyRate: baseRate,
    overtimeRate: baseRate * 1.5,
    emergencyRate: baseRate * 2.0,
  };
}

/**
 * Validate estimate
 */
function validateEstimate(estimate: CostEstimate): CostEstimate {
  const validated = { ...estimate };

  // Ensure minimum values
  if (validated.total < 100) {
    validated.total = 100;
    validated.range.low = 85;
    validated.range.high = 115;
    validated.confidence = 50;
  }

  // Check for missing labor
  if (validated.subtotals.labor === 0 && validated.subtotals.materials > 0) {
    validated.subtotals.labor = validated.subtotals.materials * 0.5;
    validated.total += validated.subtotals.labor;
    validated.assumptions.push("Labor estimated at 50% of materials cost");
  }

  return validated;
}

/**
 * Apply urgency multiplier
 */
function applyUrgencyMultiplier(
  estimate: CostEstimate,
  urgency?: "NORMAL" | "URGENT" | "EMERGENCY"
): CostEstimate {
  if (!urgency || urgency === "NORMAL") {
    return estimate;
  }

  const multipliers = {
    URGENT: 1.25, // +25%
    EMERGENCY: 1.5, // +50%
  };

  const multiplier = multipliers[urgency] || 1.0;

  return {
    ...estimate,
    subtotals: {
      ...estimate.subtotals,
      labor: estimate.subtotals.labor * multiplier,
    },
    total: estimate.total + estimate.subtotals.labor * (multiplier - 1),
    range: {
      low: estimate.range.low + estimate.subtotals.labor * (multiplier - 1) * 0.85,
      high: estimate.range.high + estimate.subtotals.labor * (multiplier - 1) * 1.15,
    },
    assumptions: [
      ...estimate.assumptions,
      `${urgency} pricing applied (+${Math.round((multiplier - 1) * 100)}% labor rate)`,
    ],
  };
}

/**
 * Generate fallback estimate
 */
function generateFallbackEstimate(request: EstimateRequest): CostEstimate {
  // Simple square footage-based estimate
  const sqft = request.squareFootage || 1000;
  const baseRate = 10; // $10/sqft average

  const materialsCost = sqft * baseRate * 0.4;
  const laborCost = sqft * baseRate * 0.4;
  const equipmentCost = sqft * baseRate * 0.1;
  const permitsCost = 150;
  const overhead = (materialsCost + laborCost) * 0.15;
  const profit = (materialsCost + laborCost) * 0.2;

  const total = materialsCost + laborCost + equipmentCost + permitsCost + overhead + profit;

  return {
    lineItems: [
      {
        category: "Materials",
        description: "Materials (estimated)",
        quantity: sqft,
        unit: "sq ft",
        unitCost: baseRate * 0.4,
        totalCost: materialsCost,
      },
      {
        category: "Labor",
        description: "Labor (estimated)",
        quantity: Math.ceil(sqft / 100),
        unit: "hours",
        unitCost: 65,
        totalCost: laborCost,
      },
    ],
    subtotals: {
      materials: materialsCost,
      labor: laborCost,
      equipment: equipmentCost,
      permits: permitsCost,
      overhead,
      profit,
    },
    total,
    range: {
      low: total * 0.85,
      high: total * 1.15,
    },
    timeline: {
      estimated: "5-7 days",
      withBuffer: "7-10 days",
    },
    assumptions: [
      "Estimate based on average square footage rates",
      "Actual costs may vary based on material selection",
      "Detailed inspection recommended for accurate pricing",
    ],
    recommendations: [
      "Schedule on-site inspection for detailed estimate",
      "Obtain multiple material quotes",
      "Consider seasonal pricing variations",
    ],
    confidence: 60,
  };
}

/**
 * Compare estimates
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function compareEstimates(estimateIds: string[]): Promise<{
  estimates: CostEstimate[];
  comparison: {
    averageTotal: number;
    lowestTotal: number;
    highestTotal: number;
    variance: number;
  };
}> {
  // TODO: Fetch estimates from database
  const estimates: CostEstimate[] = [];

  if (estimates.length === 0) {
    throw new Error("No estimates found");
  }

  const totals = estimates.map((e) => e.total);
  const averageTotal = totals.reduce((sum, t) => sum + t, 0) / totals.length;
  const lowestTotal = Math.min(...totals);
  const highestTotal = Math.max(...totals);
  const variance = highestTotal - lowestTotal;

  return {
    estimates,
    comparison: {
      averageTotal,
      lowestTotal,
      highestTotal,
      variance,
    },
  };
}
