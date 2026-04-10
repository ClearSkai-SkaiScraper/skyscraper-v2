/**
 * PHASE 42: Auto-Supplement Engine
 *
 * Core engine for generating insurance claim supplements:
 * - Extract carrier scope from PDF
 * - Compare contractor vs carrier scope
 * - Detect code upgrades required by jurisdiction
 * - Generate persuasive supplement arguments
 * - Create negotiation scripts and final packets
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

import { type ScopeLineItem } from "./carrierComplianceEngine";

const openai = getOpenAI();

export interface ScopeComparison {
  missingItems: ScopeLineItem[]; // In contractor scope but not carrier
  underpaidItems: Array<{
    item: ScopeLineItem;
    contractorAmount: number;
    carrierAmount: number;
    difference: number;
  }>;
  overpaidItems: Array<{
    item: ScopeLineItem;
    contractorAmount: number;
    carrierAmount: number;
    difference: number;
  }>;
  mismatchedCodes: Array<{
    contractorCode: string;
    carrierCode: string;
    description: string;
  }>;
}

export interface CodeUpgrade {
  itemCode: string;
  description: string;
  codeSection: string; // "IRC 2021 R806.2" etc
  jurisdiction: string;
  reasoning: string;
  estimatedCost: number;
  required: boolean; // true = code mandated, false = recommended
}

export interface SupplementArgument {
  itemCode: string;
  itemDescription: string;
  claimAmount: number;
  carrierAmount: number;
  difference: number;
  argument: string; // AI-generated persuasive text
  evidence: string[]; // List of supporting facts
  codeReferences: string[];
  photoReferences: string[];
}

/**
 * Extract line items from carrier scope PDF text
 */
export async function extractCarrierScopeFromPDF(pdfText: string): Promise<ScopeLineItem[]> {
  if (!pdfText || pdfText.length < 50) {
    return [];
  }

  // Use GPT-4o-mini to parse unstructured PDF into structured line items
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert at parsing insurance carrier scope of work documents. Extract line items from the provided text and return as JSON array.

Each line item should have:
- code: item code (e.g., "RFG220")
- description: item description
- quantity: numeric quantity
- unit: unit of measure ("SQ", "LF", "EA")
- unitPrice: price per unit
- totalPrice: total price for line item

Return ONLY valid JSON array, no other text.`,
      },
      {
        role: "user",
        content: `Parse this carrier scope into structured line items:\n\n${pdfText.substring(0, 4000)}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return result.lineItems || [];
  } catch (error) {
    logger.error("Failed to parse carrier scope:", error);
    return [];
  }
}

/**
 * Compare contractor scope vs carrier scope
 */
export function compareScopes(
  contractorScope: ScopeLineItem[],
  carrierScope: ScopeLineItem[]
): ScopeComparison {
  const missingItems: ScopeLineItem[] = [];
  const underpaidItems: Array<{
    item: ScopeLineItem;
    contractorAmount: number;
    carrierAmount: number;
    difference: number;
  }> = [];
  const overpaidItems: Array<{
    item: ScopeLineItem;
    contractorAmount: number;
    carrierAmount: number;
    difference: number;
  }> = [];
  const mismatchedCodes: Array<{
    contractorCode: string;
    carrierCode: string;
    description: string;
  }> = [];

  // Find missing items (in contractor scope but not carrier)
  for (const contractorItem of contractorScope) {
    const carrierItem = carrierScope.find(
      (c) =>
        c.code === contractorItem.code ||
        c.description.toLowerCase() === contractorItem.description.toLowerCase()
    );

    if (!carrierItem) {
      missingItems.push(contractorItem);
    } else {
      // Compare amounts
      const contractorTotal = contractorItem.totalPrice;
      const carrierTotal = carrierItem.totalPrice;
      const difference = contractorTotal - carrierTotal;

      if (difference > 50) {
        // More than $50 difference
        underpaidItems.push({
          item: contractorItem,
          contractorAmount: contractorTotal,
          carrierAmount: carrierTotal,
          difference,
        });
      } else if (difference < -50) {
        overpaidItems.push({
          item: contractorItem,
          contractorAmount: contractorTotal,
          carrierAmount: carrierTotal,
          difference: Math.abs(difference),
        });
      }

      // Check for code mismatches
      if (carrierItem.code !== contractorItem.code) {
        mismatchedCodes.push({
          contractorCode: contractorItem.code,
          carrierCode: carrierItem.code,
          description: contractorItem.description,
        });
      }
    }
  }

  return {
    missingItems,
    underpaidItems,
    overpaidItems,
    mismatchedCodes,
  };
}

/**
 * Detect required code upgrades based on jurisdiction
 */
export async function detectCodeUpgrades(
  zipCode: string,
  city: string,
  state: string,
  existingScope: ScopeLineItem[]
): Promise<CodeUpgrade[]> {
  const upgrades: CodeUpgrade[] = [];

  // Arizona-specific code requirements
  if (state.toLowerCase() === "arizona" || state.toLowerCase() === "az") {
    // IRC 2021 - Ventilation requirements
    const hasProperVentilation = existingScope.some(
      (item) =>
        item.description.toLowerCase().includes("vent") ||
        item.description.toLowerCase().includes("ventilation")
    );

    if (!hasProperVentilation) {
      upgrades.push({
        itemCode: "RFG920",
        description: "Roof ventilation upgrade (IRC 2021 compliant)",
        codeSection: "IRC 2021 R806.2",
        jurisdiction: `${city}, ${state}`,
        reasoning:
          "IRC 2021 requires balanced ventilation with 1:150 or 1:300 ratio for attic spaces",
        estimatedCost: 1200,
        required: true,
      });
    }

    // Drip edge requirement
    const hasDripEdge = existingScope.some(
      (item) => item.code === "RFG410" || item.description.toLowerCase().includes("drip edge")
    );

    if (!hasDripEdge) {
      upgrades.push({
        itemCode: "RFG410",
        description: "Drip edge installation",
        codeSection: "IRC 2021 R905.2.8.5",
        jurisdiction: `${city}, ${state}`,
        reasoning: "IRC 2021 mandates drip edge at eaves and gables for asphalt shingle roofs",
        estimatedCost: 800,
        required: true,
      });
    }

    // City-specific requirements
    if (city.toLowerCase().includes("prescott")) {
      // Prescott has stricter wind requirements
      const hasHighWindRated = existingScope.some(
        (item) =>
          item.description.toLowerCase().includes("high wind") ||
          item.description.toLowerCase().includes("class h")
      );

      if (!hasHighWindRated) {
        upgrades.push({
          itemCode: "RFG225",
          description: "High wind-rated shingles (Class H)",
          codeSection: "Prescott Building Code 2021",
          jurisdiction: "Prescott, AZ",
          reasoning: "Prescott requires Class H wind-rated shingles for exposed locations",
          estimatedCost: 600,
          required: false, // Recommended, not strictly mandated everywhere
        });
      }
    }

    if (city.toLowerCase().includes("phoenix")) {
      // Phoenix has heat-related requirements
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const hasReflectiveRoof = existingScope.some(
        (item) =>
          item.description.toLowerCase().includes("cool roof") ||
          item.description.toLowerCase().includes("reflective")
      );

      // This is more of a recommendation than requirement
      upgrades.push({
        itemCode: "RFG230",
        description: "Cool roof / reflective shingles",
        codeSection: "Title 24 Energy Efficiency (recommended)",
        jurisdiction: "Phoenix, AZ",
        reasoning: "Reflective roofing reduces cooling costs in Phoenix heat",
        estimatedCost: 400,
        required: false,
      });
    }
  }

  return upgrades;
}

/**
 * Generate AI-powered supplement arguments
 * Enhanced with simulation + storm graph intelligence
 */
export async function generateSupplementArguments(
  comparison: ScopeComparison,
  codeUpgrades: CodeUpgrade[],
  carrierName?: string,
  intelligence?: {
    approvalProbability?: number;
    predictedOutcome?: string;
    corroborationScore?: number;
    claimsInCluster?: number;
    verifiedDamage?: number;
    negativeFactors?: string[];
  }
): Promise<SupplementArgument[]> {
  const suppArgs: SupplementArgument[] = [];

  // Build intelligence context string for AI prompts
  const intelContext = intelligence
    ? [
        intelligence.approvalProbability != null
          ? `Current claim simulation shows ${intelligence.approvalProbability}% approval probability (predicted: ${intelligence.predictedOutcome}).`
          : "",
        intelligence.corroborationScore != null
          ? `Storm graph corroboration score: ${intelligence.corroborationScore}/100 with ${intelligence.claimsInCluster ?? 0} claims in the same damage cluster and ${intelligence.verifiedDamage ?? 0} verified nearby properties.`
          : "",
        intelligence.negativeFactors?.length
          ? `Key gaps to address: ${intelligence.negativeFactors.join("; ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  // Generate arguments for missing items
  for (const item of comparison.missingItems) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert insurance claim negotiator writing supplement arguments for ${carrierName || "the insurance carrier"}. 

Write a professional, persuasive argument for why this line item should be included. Focus on:
- Code requirements
- Industry standards  
- Necessity for proper repair
- Consequences of omission
- Fair market value
${intelContext ? `\nDATA-BACKED INTELLIGENCE:\n${intelContext}\nCite the corroboration data and simulation intelligence to strengthen your argument.` : ""}

Be firm but professional. Cite specific code sections when applicable. Keep it concise (2-3 paragraphs).`,
        },
        {
          role: "user",
          content: `Write a supplement argument for:\n\nItem: ${item.description}\nCode: ${item.code}\nAmount: $${item.totalPrice.toFixed(2)}\nQuantity: ${item.quantity} ${item.unit}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const argumentText = completion.choices[0]?.message?.content || "";

    suppArgs.push({
      itemCode: item.code,
      itemDescription: item.description,
      claimAmount: item.totalPrice,
      carrierAmount: 0,
      difference: item.totalPrice,
      argument: argumentText,
      evidence: [
        `Required for code-compliant roof system`,
        `Industry standard for ${item.description}`,
        `Fair market value: $${item.unitPrice}/${item.unit}`,
        ...(intelligence?.corroborationScore != null
          ? [
              `${intelligence.verifiedDamage ?? 0} nearby properties with verified storm damage corroborate this claim (score: ${intelligence.corroborationScore}/100)`,
            ]
          : []),
      ],
      codeReferences: [],
      photoReferences: [],
    });
  }

  // Generate arguments for underpaid items
  for (const underpaid of comparison.underpaidItems.slice(0, 5)) {
    // Limit to 5 to avoid rate limits
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert insurance claim negotiator. Write a professional argument for why the carrier's valuation is insufficient.`,
        },
        {
          role: "user",
          content: `Carrier paid $${underpaid.carrierAmount.toFixed(2)} but actual cost is $${underpaid.contractorAmount.toFixed(2)} for ${underpaid.item.description}. Write a brief argument for the difference of $${underpaid.difference.toFixed(2)}.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    suppArgs.push({
      itemCode: underpaid.item.code,
      itemDescription: underpaid.item.description,
      claimAmount: underpaid.contractorAmount,
      carrierAmount: underpaid.carrierAmount,
      difference: underpaid.difference,
      argument: completion.choices[0]?.message?.content || "",
      evidence: [
        `Current market rate: $${underpaid.item.unitPrice}/${underpaid.item.unit}`,
        `Quantity verified: ${underpaid.item.quantity} ${underpaid.item.unit}`,
      ],
      codeReferences: [],
      photoReferences: [],
    });
  }

  // Generate arguments for code upgrades
  for (const upgrade of codeUpgrades.filter((u) => u.required)) {
    suppArgs.push({
      itemCode: upgrade.itemCode,
      itemDescription: upgrade.description,
      claimAmount: upgrade.estimatedCost,
      carrierAmount: 0,
      difference: upgrade.estimatedCost,
      argument: `${upgrade.description} is mandated by ${upgrade.codeSection}. ${upgrade.reasoning} This is not an optional upgrade but a code requirement for ${upgrade.jurisdiction}. Failure to include this item would result in a non-compliant roof system that would not pass building inspection.`,
      evidence: [
        `Required by ${upgrade.codeSection}`,
        `Jurisdiction: ${upgrade.jurisdiction}`,
        upgrade.reasoning,
      ],
      codeReferences: [upgrade.codeSection],
      photoReferences: [],
    });
  }

  return suppArgs;
}

/**
 * Generate negotiation script based on tone
 * Enhanced with simulation + corroboration data
 */
export async function generateNegotiationScript(
  suppArgs: SupplementArgument[],
  tone: "professional" | "firm" | "legal",
  carrierName?: string,
  intelligence?: {
    approvalProbability?: number;
    corroborationScore?: number;
    claimsInCluster?: number;
    verifiedDamage?: number;
  }
): Promise<string> {
  const totalSupplement = suppArgs.reduce((sum, arg) => sum + arg.difference, 0);

  const toneInstructions = {
    professional:
      "Write in a cooperative, professional tone. Express willingness to work together.",
    firm: "Write in a confident, assertive tone. Be clear about your position without being aggressive.",
    legal:
      "Write in a formal, legal tone. Reference relevant statutes and policy language. Mention potential for appraisal or legal action if necessary.",
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert insurance negotiator writing a script for a phone call or meeting with ${carrierName || "the insurance adjuster"}.

${toneInstructions[tone]}

The script should:
- Open professionally
- Clearly state the supplement amount and key items
- Present 2-3 strongest arguments
- Address likely objections
- Close with next steps
${
  intelligence?.corroborationScore != null
    ? `\nIMPORTANT DATA TO REFERENCE:\n- Storm graph corroboration score: ${intelligence.corroborationScore}/100\n- ${intelligence.claimsInCluster ?? 0} claims in the same storm damage cluster\n- ${intelligence.verifiedDamage ?? 0} nearby properties with verified damage\n- Simulation approval probability: ${intelligence.approvalProbability ?? "N/A"}%\nUse these data points naturally in the negotiation script to demonstrate that this claim has strong third-party corroboration.`
    : ""
}

Format as a conversational script with clear talking points.`,
      },
      {
        role: "user",
        content: `Generate a negotiation script for a supplement of $${totalSupplement.toFixed(2)} covering ${suppArgs.length} items:\n\n${suppArgs.map((arg) => `- ${arg.itemDescription}: $${arg.difference.toFixed(2)}`).join("\n")}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || "";
}

/**
 * Calculate total supplement amount
 */
export function calculateSupplementTotal(suppArgs: SupplementArgument[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = suppArgs.reduce((sum, arg) => sum + arg.difference, 0);
  const tax = subtotal * 0.089; // Default AZ tax rate
  const total = subtotal + tax;

  return { subtotal, tax, total };
}
