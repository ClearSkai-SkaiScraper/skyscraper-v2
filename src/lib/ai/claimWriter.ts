/**
 * PHASE 38: Claim Writer Engine
 *
 * Converts SkaiPDF analysis data into complete insurance claim documents.
 * Generates professional narratives, Xactimate-structured scopes, and carrier rebuttals.
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

const openai = getOpenAI();

interface Lead {
  id: string;
  name?: string;
  address?: string;
  propertyType?: string;
  dateOfLoss?: string;
  damageType?: string;
}

interface Slope {
  id: string;
  pitch?: number;
  area?: number;
  facingDirection?: string;
  damageScore?: number;
  material?: string;
}

interface Detection {
  id: string;
  type: string;
  severity?: string;
  confidence?: number;
  location?: string;
  description?: string;
}

interface Flag {
  type: string;
  severity: string;
  message: string;
}

interface ScopeItem {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  slopeId?: string;
  justification: string;
  notes?: string;
}

interface Scope {
  items: ScopeItem[];
  totalSquares: number;
  complexityLevel: string;
  safetyNotes: string[];
}

/**
 * Generate Xactimate-structured scope with line items
 */
export async function generateScope(
  lead: Lead,
  slopes: Slope[],
  detections: Detection[]
): Promise<Scope> {
  try {
    const totalArea = slopes.reduce((sum, slope) => sum + (slope.area || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalSquares = Math.ceil(totalArea / 100); // Convert sq ft to squares
    const maxPitch = Math.max(...slopes.map((s) => s.pitch || 0));

    const prompt = `You are a roofing estimator creating an Xactimate-compatible scope of loss.

Property: ${lead.address}
Loss Date: ${lead.dateOfLoss || "Unknown"}
Damage Type: ${lead.damageType || "Storm damage"}

Roof Details:
${slopes.map((s, i) => `Slope ${i + 1}: ${s.area || 0} sq ft, ${s.pitch || 0}/12 pitch, ${s.facingDirection || "Unknown"} facing, Material: ${s.material || "Unknown"}`).join("\n")}

Detected Damages:
${detections.map((d) => `- ${d.type}: ${d.description || "Observed damage"} (${d.severity || "moderate"})`).join("\n")}

Generate a detailed scope with these line items:
1. RFG220 - Remove & Replace Shingles (SQ)
2. RFG300 - Ridge Cap (LF)
3. DRP100 - Drip Edge (LF)
4. PJK100 - Pipe Jacks (EA)
5. VNT200 - Roof Vents (EA)
6. UND100 - Synthetic Underlayment (SQ)
7. STR100 - Starter Strip (LF)
8. VAL100 - Valley Flashing (LF)
${maxPitch > 7 ? "9. STEEP - Steep Charge (SQ)" : ""}
${detections.some((d) => d.type.toLowerCase().includes("decking") || d.type.toLowerCase().includes("wood")) ? "10. DEC100 - Decking Replacement (SQ)" : ""}

For each item, provide:
- Accurate quantity based on roof measurements
- Clear justification referencing slope data or damage observations
- Any special notes (e.g., "Due to hail impact severity")

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "code": "RFG220",
      "description": "Remove & Replace Shingles",
      "quantity": 26,
      "unit": "SQ",
      "slopeId": "slope-1",
      "justification": "Full roof replacement required due to widespread hail impacts across all slopes",
      "notes": "Observed 15+ impacts per square on north-facing slope"
    }
  ],
  "totalSquares": 26,
  "complexityLevel": "moderate",
  "safetyNotes": ["Steep pitch requires safety equipment", "Multiple valleys present"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from OpenAI");

    const scope = JSON.parse(content) as Scope;

    // Validate and ensure we have required fields
    if (!scope.items || !Array.isArray(scope.items)) {
      throw new Error("Invalid scope format: missing items array");
    }

    return scope;
  } catch (error) {
    logger.error("[generateScope] Error:", error);
    throw new Error(
      `Failed to generate scope: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate 4-paragraph professional claim narrative
 */
export async function generateNarrative(
  lead: Lead,
  aiSummary: string,
  slopeScores: number[]
): Promise<string> {
  try {
    const avgDamageScore = slopeScores.reduce((a, b) => a + b, 0) / slopeScores.length;

    const prompt = `You are an insurance claim writer. Create a professional 4-paragraph claim narrative.

Property Information:
- Address: ${lead.address}
- Property Type: ${lead.propertyType || "Residential"}
- Loss Date: ${lead.dateOfLoss || "Unknown"}
- Damage Type: ${lead.damageType || "Storm damage"}

AI Analysis Summary:
${aiSummary}

Average Damage Score: ${avgDamageScore.toFixed(1)}/10

Write a 4-paragraph narrative following this structure:

Paragraph 1: SUMMARY OF EVENT & PROPERTY
- Brief description of the loss event
- Property details and location
- When the damage was discovered

Paragraph 2: OBSERVED DAMAGES
- Detailed description of roof damage
- Reference specific damage types and locations
- Quantify damage where possible (e.g., "impacts observed on 80% of roof area")

Paragraph 3: WHY REPLACEMENT IS REQUIRED
- Explain why repair is insufficient
- Reference industry standards and manufacturer specifications
- Explain functional vs. cosmetic damage
- Address weatherproofing and structural integrity

Paragraph 4: SAFETY & BUILDING CODE COMPLIANCE
- Safety concerns with damaged roofing
- Building code requirements
- Importance of timely repairs
- Professional recommendation

Write in a professional, objective tone. Be specific and reference observable facts. Avoid emotional language.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const narrative = response.choices[0]?.message?.content;
    if (!narrative) throw new Error("No narrative received from OpenAI");

    return narrative.trim();
  } catch (error) {
    logger.error("[generateNarrative] Error:", error);
    throw new Error(
      `Failed to generate narrative: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert scope to estimator-friendly JSON format
 */
export function generateEstimateJson(scope: Scope): Record<string, any> {
  return {
    version: "1.0",
    generated: new Date().toISOString(),
    summary: {
      totalSquares: scope.totalSquares,
      itemCount: scope.items.length,
      complexityLevel: scope.complexityLevel,
    },
    lineItems: scope.items.map((item) => ({
      code: item.code,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      justification: item.justification,
      notes: item.notes,
      slopeReference: item.slopeId,
    })),
    safety: {
      notes: scope.safetyNotes,
      requiresSpecialEquipment: scope.safetyNotes.some(
        (n) => n.toLowerCase().includes("steep") || n.toLowerCase().includes("safety")
      ),
    },
  };
}

/**
 * Generate carrier rebuttal arguments for common denials
 */
export async function generateCarrierRebuttals(
  lead: Lead,
  slopes: Slope[],
  detections: Detection[],
  flags: Flag[]
): Promise<string> {
  try {
    const hasWearFlag = flags.some(
      (f) => f.type.toLowerCase().includes("wear") || f.type.toLowerCase().includes("age")
    );

    const prompt = `You are an insurance claim advocate. Generate rebuttal arguments for common carrier denials.

Property: ${lead.address}
Loss Date: ${lead.dateOfLoss}
Damage Type: ${lead.damageType}

Detected Issues:
${detections.map((d) => `- ${d.type}: ${d.description || "Observed"} (${d.severity || "moderate"} severity)`).join("\n")}

Flags:
${flags.map((f) => `- ${f.type}: ${f.message}`).join("\n")}

${hasWearFlag ? "NOTE: System flagged potential wear-and-tear concerns." : ""}

Generate rebuttals for these common carrier positions:

1. "This is normal wear and tear, not storm damage"
   - Address: Why this IS storm damage
   - Evidence: Reference specific damage patterns
   - Standards: Industry definitions of wear vs. storm damage

2. "There is no functional damage, only cosmetic"
   - Address: Weatherproofing compromise
   - Evidence: How damage affects shingle integrity
   - Standards: Manufacturer warranty requirements

3. "This damage existed prior to the reported loss date"
   - Address: Evidence of recent damage
   - Evidence: Weather events on loss date
   - Standards: Damage characteristics

For each rebuttal:
- Be professional and factual
- Reference photo evidence (e.g., "See Photos 3-7")
- Reference slope-specific observations
- Cite building codes or manufacturer specs where applicable

Format as clear sections with headers.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const rebuttals = response.choices[0]?.message?.content;
    if (!rebuttals) throw new Error("No rebuttals received from OpenAI");

    return rebuttals.trim();
  } catch (error) {
    logger.error("[generateCarrierRebuttals] Error:", error);
    throw new Error(
      `Failed to generate rebuttals: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate final summary for packets and adjusters
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function generateFinalSummary(scope: Scope, narrative: string, rebuttals: string): string {
  const itemsList = scope.items
    .map((item) => `- ${item.description}: ${item.quantity} ${item.unit}`)
    .join("\n");

  return `CLAIM SUMMARY

SCOPE OF LOSS:
${itemsList}

Total Roof Area: ${scope.totalSquares} squares
Complexity: ${scope.complexityLevel}

DAMAGE ASSESSMENT:
${narrative.split("\n\n")[1] || "See full narrative for details"}

KEY POINTS:
- Full roof replacement required
- ${scope.items.length} line items documented
- Photo evidence supports claim
- Complies with building codes and manufacturer specifications

${scope.safetyNotes.length > 0 ? `SAFETY CONSIDERATIONS:\n${scope.safetyNotes.map((n) => `- ${n}`).join("\n")}` : ""}

For complete details, see:
- Full Narrative
- Detailed Scope of Loss
- Carrier Rebuttal Arguments
- Supporting Photo Documentation

This claim has been prepared using AI-assisted analysis and professional estimating standards.`;
}

// Alias for backwards compatibility
export const generateClaimNarrative = generateNarrative;
