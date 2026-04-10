/**
 * Phase 18.9 - AI Inspection Detection Service
 * AI-powered image analysis for property inspections
 * Detects leaks, damage, cracks, rust, hazards, and more
 */

import { getOpenAI } from "@/lib/ai/client";
import { safeAI } from "@/lib/aiGuard";
import { logger } from "@/lib/logger";

const openai = getOpenAI();

export interface InspectionDetection {
  type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  location: string;
  confidence: number;
  description: string;
  recommendation?: string;
}

export interface InspectionAnalysis {
  overallCondition: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
  conditionScore: number;
  detections: InspectionDetection[];
  summary: string;
  recommendations: string[];
  issuesSummary: {
    leaksDetected: number;
    damageDetected: number;
    cracksDetected: number;
    rustDetected: number;
    hazardsDetected: number;
  };
}

/**
 * Analyze a single inspection photo using AI
 */
export async function analyzeInspectionPhoto(
  imageUrl: string,
  componentType: string,
  componentName?: string
): Promise<InspectionAnalysis> {
  try {
    const prompt = buildInspectionPrompt(componentType, componentName);

    const ai = await safeAI("inspection-photo", () =>
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an expert property inspector analyzing photos for damage, defects, and safety hazards.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      })
    );

    if (!ai.ok) {
      throw new Error(ai.error);
    }

    const response = ai.result;
    const analysisText = response.choices[0].message.content || "";
    return parseAIInspectionResponse(analysisText, componentType);
  } catch (error) {
    logger.error("Error analyzing inspection photo:", error);
    throw new Error("Failed to analyze inspection photo");
  }
}

/**
 * Analyze multiple photos for a comprehensive inspection
 */
export async function analyzeMultiplePhotos(
  photos: Array<{ url: string; caption?: string }>,
  componentType: string,
  componentName?: string
): Promise<InspectionAnalysis> {
  const analyses = await Promise.all(
    photos.map((photo) => analyzeInspectionPhoto(photo.url, componentType, componentName))
  );

  // Aggregate results
  return aggregateInspectionAnalyses(analyses);
}

/**
 * Build inspection prompt based on component type
 */
function buildInspectionPrompt(componentType: string, componentName?: string): string {
  const basePrompt = `Analyze this ${componentName || componentType} inspection photo and identify any issues. Return your analysis as JSON with this structure:

{
  "overallCondition": "Excellent|Good|Fair|Poor|Critical",
  "conditionScore": 0-100,
  "detections": [
    {
      "type": "leak|damage|crack|rust|hazard|wear|defect",
      "severity": "Low|Medium|High|Critical",
      "location": "specific location in the photo",
      "confidence": 0-100,
      "description": "detailed description",
      "recommendation": "what should be done"
    }
  ],
  "summary": "brief overall summary",
  "recommendations": ["action 1", "action 2"]
}

Focus on detecting:`;

  const componentSpecificChecks: Record<string, string> = {
    Roof: `
- Missing, damaged, or curled shingles
- Exposed or damaged flashing
- Granule loss
- Moss or algae growth
- Valley damage
- Vent and chimney condition
- Sagging or structural issues
- Water stains or leaks`,

    HVAC: `
- Rust or corrosion
- Refrigerant leaks
- Dirty or clogged filters
- Damaged coils or fins
- Electrical connection issues
- Age indicators
- Condensate line issues
- Ductwork damage`,

    Plumbing: `
- Visible leaks or water stains
- Pipe corrosion
- Improper connections
- Water heater condition and age
- Drain issues
- Supply line condition
- Valve condition
- Foundation cracks near plumbing`,

    Electrical: `
- Exposed wiring
- Damaged outlets or switches
- Overloaded circuits
- Burn marks
- Missing covers
- Improper grounding
- Panel condition
- Age indicators`,

    Exterior: `
- Foundation cracks
- Siding damage
- Paint peeling or damage
- Window and door condition
- Gutter damage or clogs
- Soffit and fascia condition
- Concrete cracks
- Drainage issues`,

    Interior: `
- Wall cracks or damage
- Ceiling stains (water damage)
- Floor damage
- Door and window operation
- Appliance condition
- Ventilation issues
- Mold or moisture signs
- Safety hazards`,
  };

  const specificChecks = componentSpecificChecks[componentType] || componentSpecificChecks.Interior;

  return basePrompt + specificChecks;
}

/**
 * Parse AI response into structured format
 */
function parseAIInspectionResponse(
  responseText: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentType: string
): InspectionAnalysis {
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Calculate issue counts
      const issuesSummary = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        leaksDetected: parsed.detections.filter((d: any) => d.type === "leak").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        damageDetected: parsed.detections.filter((d: any) => d.type === "damage").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cracksDetected: parsed.detections.filter((d: any) => d.type === "crack").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rustDetected: parsed.detections.filter((d: any) => d.type === "rust").length,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hazardsDetected: parsed.detections.filter((d: any) => d.type === "hazard").length,
      };

      return {
        ...parsed,
        issuesSummary,
      };
    }
  } catch (error) {
    logger.error("Error parsing AI response:", error);
  }

  // Fallback response
  return {
    overallCondition: "Fair",
    conditionScore: 50,
    detections: [],
    summary: "Unable to fully analyze the image. Manual inspection recommended.",
    recommendations: ["Conduct manual inspection", "Retake photos with better lighting"],
    issuesSummary: {
      leaksDetected: 0,
      damageDetected: 0,
      cracksDetected: 0,
      rustDetected: 0,
      hazardsDetected: 0,
    },
  };
}

/**
 * Aggregate multiple inspection analyses into one
 */
function aggregateInspectionAnalyses(analyses: InspectionAnalysis[]): InspectionAnalysis {
  if (analyses.length === 0) {
    return {
      overallCondition: "Fair",
      conditionScore: 50,
      detections: [],
      summary: "No photos analyzed",
      recommendations: [],
      issuesSummary: {
        leaksDetected: 0,
        damageDetected: 0,
        cracksDetected: 0,
        rustDetected: 0,
        hazardsDetected: 0,
      },
    };
  }

  // Aggregate detections
  const allDetections = analyses.flatMap((a) => a.detections);

  // Calculate average score
  const avgScore = Math.round(
    analyses.reduce((sum, a) => sum + a.conditionScore, 0) / analyses.length
  );

  // Determine overall condition (worst case)
  const conditionPriority = ["Critical", "Poor", "Fair", "Good", "Excellent"];
  const worstCondition = analyses.reduce(
    (worst, a) => {
      const currentPriority = conditionPriority.indexOf(a.overallCondition);
      const worstPriority = conditionPriority.indexOf(worst);
      return currentPriority < worstPriority ? a.overallCondition : worst;
    },
    "Excellent" as InspectionAnalysis["overallCondition"]
  );

  // Aggregate recommendations (unique)
  const allRecommendations = Array.from(new Set(analyses.flatMap((a) => a.recommendations)));

  // Aggregate issue counts
  const issuesSummary = {
    leaksDetected: analyses.reduce((sum, a) => sum + a.issuesSummary.leaksDetected, 0),
    damageDetected: analyses.reduce((sum, a) => sum + a.issuesSummary.damageDetected, 0),
    cracksDetected: analyses.reduce((sum, a) => sum + a.issuesSummary.cracksDetected, 0),
    rustDetected: analyses.reduce((sum, a) => sum + a.issuesSummary.rustDetected, 0),
    hazardsDetected: analyses.reduce((sum, a) => sum + a.issuesSummary.hazardsDetected, 0),
  };

  // Create combined summary
  const summary = `Analyzed ${analyses.length} photos. Found ${allDetections.length} total issues: ${issuesSummary.leaksDetected} leaks, ${issuesSummary.damageDetected} damage areas, ${issuesSummary.cracksDetected} cracks, ${issuesSummary.rustDetected} rust spots, ${issuesSummary.hazardsDetected} hazards.`;

  return {
    overallCondition: worstCondition,
    conditionScore: avgScore,
    detections: allDetections,
    summary,
    recommendations: allRecommendations,
    issuesSummary,
  };
}

/**
 * Estimate repair costs based on detections
 */
export async function estimateRepairCosts(
  detections: InspectionDetection[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  componentType: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  zipCode: string
): Promise<{
  lowEstimate: number;
  avgEstimate: number;
  highEstimate: number;
  urgency: string;
}> {
  // This would integrate with repair cost database
  // For now, return basic estimates based on severity

  let totalLow = 0;
  let totalAvg = 0;
  let totalHigh = 0;
  let maxUrgency = "Low";

  const urgencyPriority = ["Low", "Medium", "High", "Critical"];

  for (const detection of detections) {
    const costMultiplier = {
      Low: 100,
      Medium: 500,
      High: 1500,
      Critical: 5000,
    }[detection.severity];

    totalLow += costMultiplier * 0.7;
    totalAvg += costMultiplier;
    totalHigh += costMultiplier * 1.5;

    if (urgencyPriority.indexOf(detection.severity) > urgencyPriority.indexOf(maxUrgency)) {
      maxUrgency = detection.severity;
    }
  }

  const urgencyMapping: Record<string, string> = {
    Critical: "Immediate",
    High: "1-3 Months",
    Medium: "3-6 Months",
    Low: "6+ Months",
  };

  return {
    lowEstimate: Math.round(totalLow),
    avgEstimate: Math.round(totalAvg),
    highEstimate: Math.round(totalHigh),
    urgency: urgencyMapping[maxUrgency] || "6+ Months",
  };
}
