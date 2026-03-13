/**
 * ClaimIQ™ — Justification Engine
 *
 * Pulls claim data, YOLO detections, weather reports, and supplements
 * to generate a carrier-ready Storm Damage Justification Report using GPT-4o.
 *
 * Output is structured JSON that feeds into the PDF renderer.
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface JustificationInput {
  /** Claim record with homeowner + insurance */
  claim: {
    id: string;
    claimNumber?: string | null;
    homeownerName?: string | null;
    homeownerEmail?: string | null;
    homeownerPhone?: string | null;
    propertyAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    dateOfLoss?: string | null;
    insuranceCarrier?: string | null;
    policyNumber?: string | null;
    claimType?: string | null;
    roofType?: string | null;
    roofAge?: number | null;
  };

  /** Weather data for the date of loss */
  weather: {
    hailSizeInches?: number | null;
    maxWindSpeed?: number | null;
    stormEvents?: Array<{
      type: string;
      severity: string;
      description?: string;
    }>;
    weatherNarrative?: string | null;
    source?: string | null;
  } | null;

  /** Aggregated YOLO detection summary across all claim photos */
  detections: {
    totalPhotosAnalyzed: number;
    totalDetections: number;
    byCategory: Record<string, number>; // e.g. { "hail_impact": 14, "soft_metal_dent": 6 }
    bySeverity: Record<string, number>; // e.g. { "Critical": 2, "High": 8, "Medium": 4 }
    byComponent: Record<string, number>; // e.g. { "roof": 14, "gutter": 6, "ac": 2 }
    topDetections: Array<{
      type: string;
      confidence: number;
      severity: string;
      component?: string;
    }>;
  };

  /** Existing supplements (if any) */
  supplements?: Array<{
    title?: string;
    status?: string;
    totalAmount?: number;
    lineItems?: Array<{ description: string; amount?: number }>;
  }>;

  /** Organization branding for the report */
  orgName?: string;
  orgLogo?: string;
}

export interface JustificationReport {
  executiveSummary: string;
  propertyOverview: string;
  damageFindings: Array<{
    component: string;
    damageType: string;
    count: number;
    severity: string;
    description: string;
  }>;
  collateralEvidence: Array<{
    item: string;
    finding: string;
    significance: string;
  }>;
  weatherCorrelation: string;
  directionalAnalysis: string;
  repairabilityAnalysis: string;
  recommendation: string;
  carrierArguments: string[];
  conclusion: string;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Function
// ─────────────────────────────────────────────────────────────────────────────

export async function generateJustificationReport(
  input: JustificationInput
): Promise<JustificationReport> {
  const openai = getOpenAI();

  const prompt = buildPrompt(input);

  logger.info("[JUSTIFICATION_ENGINE] Generating report", {
    claimId: input.claim.id,
    totalDetections: input.detections.totalDetections,
    hasWeather: !!input.weather,
    hasSupplements: (input.supplements?.length || 0) > 0,
  });

  const startMs = Date.now();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from GPT-4o");
  }

  const parsed = JSON.parse(content) as JustificationReport;
  parsed.generatedAt = new Date().toISOString();

  logger.info("[JUSTIFICATION_ENGINE] Report generated", {
    claimId: input.claim.id,
    elapsedMs: Date.now() - startMs,
    findings: parsed.damageFindings.length,
    collateral: parsed.collateralEvidence.length,
    arguments: parsed.carrierArguments.length,
  });

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert property insurance claims consultant specializing in storm damage assessment. You write professional Storm Damage Justification Reports that insurance carriers take seriously.

Your reports follow HAAG Engineering standards and use proper insurance terminology. You are factual, technically precise, and persuasive without being adversarial.

IMPORTANT RULES:
- Only reference damage that was actually detected (provided in the data)
- Use proper terminology: "impact marks" not "dents", "granule displacement" not "missing granules"
- Reference collateral evidence when available (soft metals, AC fins, screens)
- Tie weather data to damage patterns when weather data is provided
- Be conservative but thorough — adjusters respect accuracy
- Frame recommendations in terms of restoring to "pre-loss condition"
- Reference IRC/IBC building codes where applicable
- Never fabricate evidence or findings not supported by the detection data

OUTPUT FORMAT: Return a JSON object with these exact keys:
{
  "executiveSummary": "2-3 paragraph overview of findings and recommendation",
  "propertyOverview": "Property description, roof type, age, relevant details",
  "damageFindings": [{ "component", "damageType", "count", "severity", "description" }],
  "collateralEvidence": [{ "item", "finding", "significance" }],
  "weatherCorrelation": "How weather data supports the claim",
  "directionalAnalysis": "Storm direction evidence from impact patterns",
  "repairabilityAnalysis": "Why repair vs replacement, matching concerns, code triggers",
  "recommendation": "Clear recommendation (replace/repair/further inspection)",
  "carrierArguments": ["Technical argument 1", "Technical argument 2", ...],
  "conclusion": "Professional closing statement"
}`;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(input: JustificationInput): string {
  const { claim, weather, detections, supplements } = input;

  const sections: string[] = [];

  // ── Property Information ──
  sections.push(`## Property Information
- Address: ${claim.propertyAddress || "N/A"}, ${claim.city || ""} ${claim.state || ""} ${claim.zip || ""}
- Homeowner: ${claim.homeownerName || "N/A"}
- Insurance Carrier: ${claim.insuranceCarrier || "N/A"}
- Policy Number: ${claim.policyNumber || "N/A"}
- Claim Number: ${claim.claimNumber || "N/A"}
- Date of Loss: ${claim.dateOfLoss || "N/A"}
- Roof Type: ${claim.roofType || "N/A"}
- Roof Age: ${claim.roofAge ? `${claim.roofAge} years` : "N/A"}
- Claim Type: ${claim.claimType || "N/A"}`);

  // ── Weather Data ──
  if (weather) {
    let weatherSection = "## Weather Data for Date of Loss\n";
    if (weather.hailSizeInches)
      weatherSection += `- Hail Size: ${weather.hailSizeInches}" diameter\n`;
    if (weather.maxWindSpeed) weatherSection += `- Max Wind Speed: ${weather.maxWindSpeed} mph\n`;
    if (weather.stormEvents?.length) {
      weatherSection += "- Storm Events:\n";
      for (const evt of weather.stormEvents) {
        weatherSection += `  • ${evt.type} (${evt.severity}): ${evt.description || ""}\n`;
      }
    }
    if (weather.weatherNarrative) {
      weatherSection += `\nWeather Narrative: ${weather.weatherNarrative}\n`;
    }
    weatherSection += `- Source: ${weather.source || "Open-Meteo / WeatherStack"}\n`;
    sections.push(weatherSection);
  } else {
    sections.push("## Weather Data\nNo weather data available for this claim.");
  }

  // ── Detection Summary (from YOLO) ──
  let detectionSection = `## AI Damage Detection Summary
- Total Photos Analyzed: ${detections.totalPhotosAnalyzed}
- Total Damage Detections: ${detections.totalDetections}

### Detections by Damage Type:\n`;

  for (const [type, count] of Object.entries(detections.byCategory).sort((a, b) => b[1] - a[1])) {
    detectionSection += `  • ${type.replace(/_/g, " ")}: ${count} detections\n`;
  }

  detectionSection += "\n### Detections by Severity:\n";
  for (const [sev, count] of Object.entries(detections.bySeverity)) {
    detectionSection += `  • ${sev}: ${count}\n`;
  }

  detectionSection += "\n### Detections by Component:\n";
  for (const [comp, count] of Object.entries(detections.byComponent)) {
    detectionSection += `  • ${comp}: ${count}\n`;
  }

  if (detections.topDetections.length > 0) {
    detectionSection += "\n### Top Detections (highest confidence):\n";
    for (const det of detections.topDetections.slice(0, 10)) {
      detectionSection += `  • ${det.type} — ${(det.confidence * 100).toFixed(0)}% confidence, severity: ${det.severity}\n`;
    }
  }

  sections.push(detectionSection);

  // ── Supplements ──
  if (supplements && supplements.length > 0) {
    let suppSection = "## Existing Supplement Requests\n";
    for (const supp of supplements) {
      suppSection += `- ${supp.title || "Supplement"} (${supp.status || "pending"})`;
      if (supp.totalAmount) suppSection += ` — $${supp.totalAmount.toFixed(2)}`;
      suppSection += "\n";
      if (supp.lineItems?.length) {
        for (const li of supp.lineItems) {
          suppSection += `  • ${li.description}${li.amount ? ` — $${li.amount.toFixed(2)}` : ""}\n`;
        }
      }
    }
    sections.push(suppSection);
  }

  // ── Instructions ──
  sections.push(`## Instructions
Generate a comprehensive Storm Damage Justification Report for this property.
The report should be carrier-ready and written in professional insurance terminology.
Base ALL findings ONLY on the detection data provided above — do not fabricate evidence.
If weather data is available, correlate it with the damage patterns.
Conclude with a clear recommendation and supporting arguments for the carrier.`);

  return sections.join("\n\n");
}
