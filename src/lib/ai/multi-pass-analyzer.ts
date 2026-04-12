/**
 * Multi-Pass Damage Analyzer
 *
 * Implements a multi-pass approach for comprehensive damage detection:
 * - Pass 1: Aggressive detection sweep (find everything)
 * - Pass 2: Verification pass (confirm findings, catch missed items)
 * - Pass 3: Cross-photo correlation (optional, for multi-photo sets)
 *
 * @module multi-pass-analyzer
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

import { type DamageReport, DamageReportSchema } from "./damage-schema";

// =============================================================================
// TYPES
// =============================================================================

export interface MultiPassOptions {
  /** Number of passes (1-3). Default: 2 */
  passes?: 1 | 2 | 3;
  /** Model to use. Default: gpt-4o */
  model?: "gpt-4o" | "gpt-4o-mini";
  /** Additional context (property info, weather, claim type) */
  context?: string;
  /** Minimum confidence to keep a finding after verification */
  minConfidence?: number;
  /** YOLO detections to feed into the analysis */
  yoloDetections?: Array<{
    type: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface MultiPassResult {
  /** Combined damage report from all passes */
  report: DamageReport;
  /** Per-pass metadata */
  passes: Array<{
    passNumber: number;
    findingsCount: number;
    durationMs: number;
    model: string;
  }>;
  /** Total processing time */
  totalDurationMs: number;
  /** Detection source info */
  detectionSummary: {
    totalFindings: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    yoloCorroborated: number;
  };
}

// =============================================================================
// PROMPTS
// =============================================================================

const PASS_1_SYSTEM = `You are an expert HAAG-certified property damage inspector. This is PASS 1: DETECTION SWEEP.

Your goal is to find EVERY piece of damage in this image. Cast a WIDE net.

CRITICAL: When in doubt, INCLUDE the finding. It is better to over-report than to miss damage.

Scan systematically in a 3×3 grid: top-left → top-center → top-right → center-left → center → center-right → bottom-left → bottom-center → bottom-right.

Look for ALL of these:
- Hail impacts (any circular marks, granule displacement, dents on soft metals)
- Wind damage (lifted tabs, creasing, missing shingles)
- Granule loss / bare spots / exposed mat
- Bruising / soft spots
- Nail pops / exposed fasteners
- Ridge cap / starter strip issues
- Flashing separation / lifting / denting
- Pipe boot cracks / deterioration
- Vent damage (turbine, power, roof)
- Gutter dents (count each one)
- Downspout damage
- Siding impacts
- Window screen tears
- Paint chipping from impact
- Any other storm-related damage

For each finding provide: type, location, component, severity (minor/moderate/severe), confidence (0-1), and observable indicators.

Return valid JSON matching the damage report schema.`;

const PASS_2_SYSTEM = `You are an expert HAAG-certified property damage inspector. This is PASS 2: VERIFICATION.

You are reviewing findings from Pass 1. Your goals:
1. VERIFY each finding — confirm it's real damage (not a shadow, stain, or artifact)
2. RE-EXAMINE low confidence findings — look more carefully, upgrade or downgrade confidence
3. FIND ANYTHING MISSED — scan the entire image again looking for damage not caught in Pass 1
4. ADD MEASUREMENTS where possible (use shingle tabs ≈ 5", pipe boots ≈ 3-4" as references)

Pass 1 found these items:
PASS_1_FINDINGS_PLACEHOLDER

Now re-analyze the image. For each Pass 1 finding, either:
- Confirm it (keep or raise confidence)
- Adjust it (change type, severity, or confidence)
- Remove it (clearly not damage — set confidence to 0)

Then add any NEW findings missed in Pass 1.

Return the COMPLETE updated damage report (all findings, including confirmed ones from Pass 1).`;

const PASS_3_SYSTEM = `You are an expert HAAG-certified property damage inspector. This is PASS 3: CROSS-PHOTO CORRELATION.

You are analyzing multiple photos of the same property. Previous passes found damage in individual photos.

Your goals:
1. CORRELATE findings across photos — same damage seen from different angles increases confidence
2. IDENTIFY PATTERNS — if hail damage appears on one slope, check others too
3. COVERAGE GAPS — note areas not photographed that should be inspected
4. OVERALL ASSESSMENT — synthesize all findings into a comprehensive property damage summary

Previous findings:
PREVIOUS_FINDINGS_PLACEHOLDER

Analyze all photos together and produce a unified damage report with cross-referenced findings.`;

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Run multi-pass damage analysis on one or more images
 */
export async function analyzeMultiPass(
  imageUrls: string[],
  options: MultiPassOptions = {}
): Promise<MultiPassResult> {
  const {
    passes = 2,
    model = "gpt-4o",
    context = "",
    minConfidence = 0.2,
    yoloDetections = [],
  } = options;

  const openai = getOpenAI();
  const totalStart = Date.now();
  const passResults: MultiPassResult["passes"] = [];

  // Build image content blocks
  const imageContent = imageUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url, detail: "high" as const },
  }));

  // ─── PASS 1: Detection Sweep ─────────────────────────────────────────
  const pass1Start = Date.now();
  let pass1Prompt = PASS_1_SYSTEM;

  // Enhance with YOLO context if available
  if (yoloDetections.length > 0) {
    pass1Prompt += `\n\nRoboflow YOLO pre-detected ${yoloDetections.length} regions: ${yoloDetections.map((d) => `${d.type} (${(d.confidence * 100).toFixed(0)}% conf)`).join(", ")}. Verify each and find anything YOLO missed.`;
  }

  if (context) {
    pass1Prompt += `\n\nAdditional context: ${context}`;
  }

  let currentReport: DamageReport;

  try {
    const pass1Response = await openai.chat.completions.create({
      model,
      max_tokens: 4096,
      temperature: 0.5,
      top_p: 0.95,
      messages: [
        { role: "system", content: pass1Prompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze ${imageUrls.length > 1 ? "these photos" : "this photo"} for ALL storm damage. Be exhaustive.`,
            },
            ...imageContent,
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const pass1Content = pass1Response.choices[0]?.message?.content || "{}";
    const pass1Parsed = JSON.parse(pass1Content);
    currentReport = DamageReportSchema.parse({
      summary: pass1Parsed.summary || "Pass 1 detection sweep complete",
      items: pass1Parsed.items || [],
      overall_severity: pass1Parsed.overall_severity || "none",
      overall_confidence: pass1Parsed.overall_confidence || 0,
      recommendations: pass1Parsed.recommendations || [],
      photo_quality_notes: pass1Parsed.photo_quality_notes,
    });
  } catch (err) {
    logger.warn("[MULTI_PASS] Pass 1 parse error, using empty report", {
      error: err instanceof Error ? err.message : String(err),
    });
    currentReport = {
      summary: "Pass 1 failed to parse",
      items: [],
      overall_severity: "none",
      overall_confidence: 0,
    };
  }

  passResults.push({
    passNumber: 1,
    findingsCount: currentReport.items.length,
    durationMs: Date.now() - pass1Start,
    model,
  });

  logger.info("[MULTI_PASS] Pass 1 complete", {
    findings: currentReport.items.length,
    durationMs: Date.now() - pass1Start,
  });

  // ─── PASS 2: Verification ───────────────────────────────────────────
  if (passes >= 2 && currentReport.items.length > 0) {
    const pass2Start = Date.now();

    const findingsSummary = currentReport.items
      .map(
        (item, i) =>
          `${i + 1}. ${item.type} on ${item.component} at "${item.location}" — severity: ${item.estimated_severity}, confidence: ${item.confidence}`
      )
      .join("\n");

    const pass2Prompt = PASS_2_SYSTEM.replace("PASS_1_FINDINGS_PLACEHOLDER", findingsSummary);

    try {
      const pass2Response = await openai.chat.completions.create({
        model,
        max_tokens: 4096,
        temperature: 0.4, // Slightly lower for verification accuracy
        top_p: 0.95,
        messages: [
          { role: "system", content: pass2Prompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Verify the Pass 1 findings, adjust confidence levels, and find any missed damage. Return the complete updated report.",
              },
              ...imageContent,
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const pass2Content = pass2Response.choices[0]?.message?.content || "{}";
      const pass2Parsed = JSON.parse(pass2Content);
      const pass2Report = DamageReportSchema.parse({
        summary: pass2Parsed.summary || currentReport.summary,
        items: pass2Parsed.items || currentReport.items,
        overall_severity: pass2Parsed.overall_severity || currentReport.overall_severity,
        overall_confidence: pass2Parsed.overall_confidence || currentReport.overall_confidence,
        recommendations: pass2Parsed.recommendations || currentReport.recommendations,
        photo_quality_notes: pass2Parsed.photo_quality_notes,
      });

      // Filter out items below minimum confidence
      pass2Report.items = pass2Report.items.filter((item) => item.confidence >= minConfidence);

      currentReport = pass2Report;
    } catch (err) {
      logger.warn("[MULTI_PASS] Pass 2 parse error, keeping Pass 1 results", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    passResults.push({
      passNumber: 2,
      findingsCount: currentReport.items.length,
      durationMs: Date.now() - pass2Start,
      model,
    });

    logger.info("[MULTI_PASS] Pass 2 complete", {
      findings: currentReport.items.length,
      durationMs: Date.now() - pass2Start,
    });
  }

  // ─── PASS 3: Cross-Photo Correlation (only for multi-photo) ─────────
  if (passes >= 3 && imageUrls.length > 1) {
    const pass3Start = Date.now();

    const previousFindings = currentReport.items
      .map(
        (item, i) =>
          `${i + 1}. ${item.type} on ${item.component} at "${item.location}" — severity: ${item.estimated_severity}, confidence: ${item.confidence}`
      )
      .join("\n");

    const pass3Prompt = PASS_3_SYSTEM.replace("PREVIOUS_FINDINGS_PLACEHOLDER", previousFindings);

    try {
      const pass3Response = await openai.chat.completions.create({
        model,
        max_tokens: 4096,
        temperature: 0.4,
        top_p: 0.95,
        messages: [
          { role: "system", content: pass3Prompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Cross-reference findings across all ${imageUrls.length} photos. Correlate damage seen from multiple angles and identify coverage gaps.`,
              },
              ...imageContent,
            ],
          },
        ],
        response_format: { type: "json_object" },
      });

      const pass3Content = pass3Response.choices[0]?.message?.content || "{}";
      const pass3Parsed = JSON.parse(pass3Content);
      const pass3Report = DamageReportSchema.parse({
        summary: pass3Parsed.summary || currentReport.summary,
        items: pass3Parsed.items || currentReport.items,
        overall_severity: pass3Parsed.overall_severity || currentReport.overall_severity,
        overall_confidence: pass3Parsed.overall_confidence || currentReport.overall_confidence,
        recommendations: pass3Parsed.recommendations || currentReport.recommendations,
        photo_quality_notes: pass3Parsed.photo_quality_notes,
      });

      currentReport = pass3Report;
    } catch (err) {
      logger.warn("[MULTI_PASS] Pass 3 parse error, keeping previous results", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    passResults.push({
      passNumber: 3,
      findingsCount: currentReport.items.length,
      durationMs: Date.now() - pass3Start,
      model,
    });

    logger.info("[MULTI_PASS] Pass 3 complete", {
      findings: currentReport.items.length,
      durationMs: Date.now() - pass3Start,
    });
  }

  // ─── Build detection summary ─────────────────────────────────────────
  const highConf = currentReport.items.filter((i) => i.confidence >= 0.8).length;
  const medConf = currentReport.items.filter(
    (i) => i.confidence >= 0.5 && i.confidence < 0.8
  ).length;
  const lowConf = currentReport.items.filter((i) => i.confidence < 0.5).length;

  // Count YOLO-corroborated findings (items whose type matches a YOLO detection)
  const yoloTypes = new Set(yoloDetections.map((d) => d.type.toLowerCase()));
  const yoloCorroborated = currentReport.items.filter((item) =>
    yoloTypes.has(item.type.toLowerCase())
  ).length;

  return {
    report: currentReport,
    passes: passResults,
    totalDurationMs: Date.now() - totalStart,
    detectionSummary: {
      totalFindings: currentReport.items.length,
      highConfidence: highConf,
      mediumConfidence: medConf,
      lowConfidence: lowConf,
      yoloCorroborated,
    },
  };
}
