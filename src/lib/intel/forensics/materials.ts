// lib/intel/forensics/materials.ts
// 🧬 MATERIAL FORENSICS ENGINE — Engineering-grade material failure analysis
// This is how SkaiScraper beats desk reviewers, engineers, and adjusters

import { logger } from "@/lib/logger";
import { getOpenAI } from "@/lib/openai";

/**
 * MATERIAL FORENSICS ENGINE
 * 
 * Analyzes material failure patterns using:
 * - ASTM D7158 (wind resistance testing)
 * - ASTM D3161 (wind aging resistance)
 * - UL 2218 (impact resistance for roof coverings)
 * - FM 4473 (hail resistance testing)
 * - ICC/IRC 2021 roofing codes
 * - Manufacturer installation specifications
 * - Forensic engineering principles
 * 
 * Output: Engineering-grade failure analysis with replacement justification
 */

export interface MaterialForensicsInput {
  materialType: string; // "3-tab asphalt", "architectural shingles", "tile", "TPO", "metal", etc.
  damage?: any; // Damage assessment findings
  weather?: any; // Weather report data
  specs?: any; // Manufacturer specifications
  codes?: any; // Building code requirements
  propertyAge?: number; // Age of roof/property
  inspectionNotes?: string; // Field observations
  photos?: any[]; // Photo documentation
}

export interface FailureLikelihood {
  score: number; // 0-100
  evidence: string[];
}

export interface MaterialForensicsOutput {
  materialConditionSummary: string;
  failureLikelihood: {
    hailFailure: FailureLikelihood;
    windFailure: FailureLikelihood;
    ageFailure: FailureLikelihood;
    thermalFailure: FailureLikelihood;
    installationFailure: FailureLikelihood;
  };
  forensicFindings: string[];
  manufacturerViolations: string[];
  astmViolations: string[];
  replacementJustification: string;
  recommendedActions: string[];
  testStandardsCited: string[];
  engineeringConclusion: string;
}

/**
 * Main material forensics analysis function
 * Generates engineering-grade failure analysis
 */
export async function analyzeMaterialForensics(
  input: MaterialForensicsInput
): Promise<MaterialForensicsOutput> {
  const prompt = buildMaterialForensicPrompt(input);

  try {
    const openai = getOpenAI();
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: FORENSIC_ENGINEER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Low temperature for consistent, factual output
      response_format: { type: "json_object" },
    });

    const result = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(result);
    return parsed as MaterialForensicsOutput;
  } catch (err) {
    logger.error("❌ MATERIAL FORENSICS ERROR:", err);
    throw new Error("Failed to analyze material forensics");
  }
}

/**
 * System prompt for forensic engineer persona
 */
const FORENSIC_ENGINEER_SYSTEM_PROMPT = `You are a certified forensic roofing materials expert with extensive training in:

CREDENTIALS & EXPERTISE:
- ASTM International Standards (D7158, D3161, D3462, D226, D4586)
- Underwriters Laboratories (UL 2218 impact resistance)
- Factory Mutual (FM 4473 hail resistance testing)
- International Code Council (ICC/IRC 2021)
- National Roofing Contractors Association (NRCA) standards
- Manufacturer technical bulletins and installation manuals
- Forensic engineering methodology (cause & origin analysis)

TESTING STANDARDS YOU REFERENCE:
- ASTM D7158: Wind resistance of asphalt shingles (uplift)
- ASTM D3161: Wind resistance (asphalt shingles - aging)
- UL 2218: Impact resistance (Class 1-4 ratings)
- FM 4473: Hail resistance testing (severe hail, moderate hail)
- ASTM D3462: Asphalt shingles (mat integrity)
- ASTM D226: Asphalt-saturated organic felt underlayment
- ASTM D4586: Asphalt roof cement

FAILURE MODES YOU ANALYZE:
Shingles:
- Granule loss (storm vs. mechanical wear patterns)
- Creasing (wind uplift exceeding ASTM D7158 thresholds)
- Bruising (hailstone density > impact tolerance)
- Loss of adhesion (installation vs. storm-induced displacement)
- Mat fracture (hailstone kinetic energy threshold exceeded)
- Thermal cracking (age-related vs. sudden failure)
- Nail overdriving (installation defect)
- Blowoff patterns (wind speed correlation)

Tile:
- Freeze-thaw cracking correlation
- Point-load fracture vs. storm impact
- Underlayment UV degradation
- Slip/slide displacement caused by uplift
- Fastener corrosion patterns
- Mortar degradation

TPO/Modified Bitumen:
- Wind scour patterns
- Heat welding separation patterns
- Puncture analysis (sharp object vs. hail vs. shrinkage)
- Seam integrity failure
- UV degradation patterns
- Ponding water correlation

Metal:
- Coating degradation vs. hail spatter
- Oxidation patterns vs. storm moisture cycles
- Oil canning vs. wind pressure
- Fastener pullout
- Panel displacement patterns

Interior:
- Moisture mapping (leak path analysis)
- Vapor intrusion patterns
- Secondary water damage correlation
- Mold growth patterns

Your analysis must be:
1. Factual and engineering-based (not speculative)
2. Cited with specific test standards
3. Defensible in court or carrier review
4. Clear on causation (storm vs. age vs. installation)
5. Authoritative in tone (forensic expert voice)

CRITICAL: Output valid JSON only. No additional text.`;

/**
 * Build forensic analysis prompt with all input data
 */
function buildMaterialForensicPrompt(input: MaterialForensicsInput): string {
  const {
    materialType,
    damage,
    weather,
    specs,
    codes,
    propertyAge,
    inspectionNotes,
    photos,
  } = input;

  return `
Perform a MATERIAL FAILURE ANALYSIS for the following roofing system:

═══════════════════════════════════════════════════════════════════
MATERIAL INFORMATION
═══════════════════════════════════════════════════════════════════
Material Type: ${materialType || "Unknown"}
Property Age: ${propertyAge ? `${propertyAge} years` : "Unknown"}

═══════════════════════════════════════════════════════════════════
DAMAGE FINDINGS
═══════════════════════════════════════════════════════════════════
${damage ? JSON.stringify(damage, null, 2) : "No damage data provided"}

═══════════════════════════════════════════════════════════════════
WEATHER DATA
═══════════════════════════════════════════════════════════════════
${weather ? JSON.stringify(weather, null, 2) : "No weather data provided"}

═══════════════════════════════════════════════════════════════════
MANUFACTURER SPECIFICATIONS
═══════════════════════════════════════════════════════════════════
${specs ? JSON.stringify(specs, null, 2) : "No manufacturer specs provided"}

═══════════════════════════════════════════════════════════════════
CODE REQUIREMENTS
═══════════════════════════════════════════════════════════════════
${codes ? JSON.stringify(codes, null, 2) : "No code requirements provided"}

═══════════════════════════════════════════════════════════════════
FIELD OBSERVATIONS
═══════════════════════════════════════════════════════════════════
${inspectionNotes || "No field notes provided"}

═══════════════════════════════════════════════════════════════════
PHOTO DOCUMENTATION
═══════════════════════════════════════════════════════════════════
${photos && photos.length > 0 ? `${photos.length} photos available` : "No photos provided"}

═══════════════════════════════════════════════════════════════════
REQUIRED OUTPUT FORMAT (VALID JSON ONLY)
═══════════════════════════════════════════════════════════════════

{
  "materialConditionSummary": "2-3 sentence overview of material condition and primary failure modes",
  
  "failureLikelihood": {
    "hailFailure": {
      "score": 0-100,
      "evidence": ["Evidence point 1", "Evidence point 2", "..."]
    },
    "windFailure": {
      "score": 0-100,
      "evidence": ["Evidence point 1", "Evidence point 2", "..."]
    },
    "ageFailure": {
      "score": 0-100,
      "evidence": ["Evidence point 1", "Evidence point 2", "..."]
    },
    "thermalFailure": {
      "score": 0-100,
      "evidence": ["Evidence point 1", "Evidence point 2", "..."]
    },
    "installationFailure": {
      "score": 0-100,
      "evidence": ["Evidence point 1", "Evidence point 2", "..."]
    }
  },
  
  "forensicFindings": [
    "Forensic finding 1 (cite test standard if applicable)",
    "Forensic finding 2",
    "..."
  ],
  
  "manufacturerViolations": [
    "Specific manufacturer specification violated (if any)",
    "..."
  ],
  
  "astmViolations": [
    "ASTM standard exceeded or failed (cite standard number)",
    "UL 2218 Class X impact threshold exceeded by Y%",
    "..."
  ],
  
  "replacementJustification": "Detailed engineering explanation of why repair is insufficient and full replacement is required. Cite specific failure modes, test standards, and manufacturer requirements.",
  
  "recommendedActions": [
    "Recommended action 1",
    "Recommended action 2",
    "..."
  ],
  
  "testStandardsCited": [
    "ASTM D7158",
    "UL 2218",
    "..."
  ],
  
  "engineeringConclusion": "Final engineering opinion on material failure causation (1-2 sentences, authoritative tone)"
}

═══════════════════════════════════════════════════════════════════
ANALYSIS REQUIREMENTS
═══════════════════════════════════════════════════════════════════

1. BE SPECIFIC: Cite exact test standards (ASTM D7158, UL 2218, etc.)
2. BE FACTUAL: Base conclusions on observable evidence
3. BE FORENSIC: Use engineering language, not insurance jargon
4. BE DEFENSIVE: Every conclusion must be defensible in court
5. BE AUTHORITATIVE: Write as a certified forensic engineer

Focus on CAUSATION:
- Storm-induced failure (hail, wind) → cite weather correlation
- Age-related failure → cite expected lifespan vs. actual age
- Installation failure → cite manufacturer spec violations
- Thermal failure → cite thermal cycling patterns

Scoring guidance (0-100):
- 0-20: Highly unlikely / no evidence
- 21-40: Possible but weak evidence
- 41-60: Probable / moderate evidence
- 61-80: Highly probable / strong evidence
- 81-100: Near certain / overwhelming evidence

Output ONLY the JSON object. No additional text before or after.
`;
}

/**
 * Quick material forensics summary
 * Used for dashboard previews or lightweight analysis
 */
export async function getMaterialForensicsSummary(
  input: MaterialForensicsInput
): Promise<string> {
  const analysis = await analyzeMaterialForensics(input);
  
  return `${analysis.materialConditionSummary}\n\nEngineering Conclusion: ${analysis.engineeringConclusion}`;
}

/**
 * Extract key test standards from analysis
 * Used for citation lists in reports
 */
export function extractTestStandards(
  analysis: MaterialForensicsOutput
): string[] {
  return analysis.testStandardsCited || [];
}

/**
 * Calculate overall failure probability
 * Weighted average across all failure types
 */
export function calculateOverallFailureProbability(
  analysis: MaterialForensicsOutput
): number {
  const { failureLikelihood } = analysis;
  
  const weights = {
    hailFailure: 0.3,
    windFailure: 0.3,
    ageFailure: 0.15,
    thermalFailure: 0.1,
    installationFailure: 0.15,
  };

  const weighted =
    failureLikelihood.hailFailure.score * weights.hailFailure +
    failureLikelihood.windFailure.score * weights.windFailure +
    failureLikelihood.ageFailure.score * weights.ageFailure +
    failureLikelihood.thermalFailure.score * weights.thermalFailure +
    failureLikelihood.installationFailure.score * weights.installationFailure;

  return Math.round(weighted);
}

/**
 * Get failure mode summary (highest scoring failure type)
 */
export function getPrimaryFailureMode(
  analysis: MaterialForensicsOutput
): { mode: string; score: number; evidence: string[] } {
  const { failureLikelihood } = analysis;

  const modes = [
    { mode: "Hail Failure", data: failureLikelihood.hailFailure },
    { mode: "Wind Failure", data: failureLikelihood.windFailure },
    { mode: "Age-Related Failure", data: failureLikelihood.ageFailure },
    { mode: "Thermal Failure", data: failureLikelihood.thermalFailure },
    { mode: "Installation Failure", data: failureLikelihood.installationFailure },
  ];

  const sorted = modes.sort((a, b) => b.data.score - a.data.score);
  const primary = sorted[0];

  return {
    mode: primary.mode,
    score: primary.data.score,
    evidence: primary.data.evidence,
  };
}

/**
 * Format forensics for report builder integration
 * Returns formatted sections ready for report inclusion
 */
export function formatForensicsForReport(
  analysis: MaterialForensicsOutput,
  format: "TECHNICAL" | "RETAIL" | "QUICK"
): string {
  if (format === "QUICK") {
    // Quick snapshot: 2-3 bullets
    const primary = getPrimaryFailureMode(analysis);
    return `• Material Condition: ${analysis.materialConditionSummary}\n• Primary Failure: ${primary.mode} (${primary.score}% likelihood)\n• Engineering Conclusion: ${analysis.engineeringConclusion}`;
  }

  if (format === "RETAIL") {
    // Retail: simplified for homeowners
    return `
MATERIAL HEALTH SUMMARY

${analysis.materialConditionSummary}

REPLACEMENT JUSTIFICATION:
${analysis.replacementJustification}

ENGINEERING CONCLUSION:
${analysis.engineeringConclusion}
`.trim();
  }

  // TECHNICAL: full forensic detail
  const primary = getPrimaryFailureMode(analysis);
  
  return `
MATERIAL FORENSIC ANALYSIS

CONDITION SUMMARY:
${analysis.materialConditionSummary}

PRIMARY FAILURE MODE:
${primary.mode} (${primary.score}% likelihood)

FORENSIC FINDINGS:
${analysis.forensicFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}

${analysis.manufacturerViolations.length > 0 ? `
MANUFACTURER SPECIFICATION VIOLATIONS:
${analysis.manufacturerViolations.map((v, i) => `${i + 1}. ${v}`).join("\n")}
` : ""}

${analysis.astmViolations.length > 0 ? `
TEST STANDARD FAILURES:
${analysis.astmViolations.map((v, i) => `${i + 1}. ${v}`).join("\n")}
` : ""}

REPLACEMENT JUSTIFICATION:
${analysis.replacementJustification}

TEST STANDARDS CITED:
${analysis.testStandardsCited.join(", ")}

ENGINEERING CONCLUSION:
${analysis.engineeringConclusion}
`.trim();
}
