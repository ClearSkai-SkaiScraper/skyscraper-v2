/**
 * PHASE 47: CLAIMS LIFECYCLE PREDICTION ENGINE v1.0
 *
 * This is the industry nuke.
 * AI that predicts the carrier's next move before they make it.
 *
 * Analyzes:
 * - SkaiPDF output (damage, materials, urgency)
 * - Storm data (hail size, wind speed, distance)
 * - Photos & videos
 * - Timeline events
 * - Denial letters
 * - Workflow stage
 *
 * Predicts:
 * - Approval/Partial/Denial probabilities
 * - Risk flags
 * - Carrier likely behavior
 * - Recommended next actions
 * - Confidence score (0-100)
 */

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

const openai = getOpenAI();

export interface PredictionInput {
  claimId: string;
  leadId?: string;
  orgId: string;
  stage?: string;
  // SkaiPDF analysis
  skaiAnalysis?: {
    damageType?: string;
    urgency?: string;
    materials?: any[];
    flags?: string[];
  };
  // Storm data
  stormImpact?: {
    hailSize?: number;
    windSpeed?: number;
    distance?: number;
    severityScore?: number;
  };
  // Media
  photoCount?: number;
  hasVideo?: boolean;
  hasDenialLetter?: boolean;
  // Timeline
  daysSinceCreation?: number;
  timelineEvents?: string[];
}

export interface PredictionOutput {
  probabilityFull: number; // 0-100
  probabilityPart: number;
  probabilityDeny: number;
  confidenceScore: number;
  recommendedSteps: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    reasoning: string;
  }>;
  riskFlags: string[];
  nextMove: string;
  aiSummary: string;
  carrierBehavior: {
    likelyStrategy: string;
    commonTactics: string[];
    timeline: string;
  };
  successPath: Array<{
    step: number;
    action: string;
    doThis: string;
    dontDoThis: string;
  }>;
}

/**
 * Main prediction function
 */
export async function predictClaimLifecycle(input: PredictionInput): Promise<PredictionOutput> {
  logger.debug(`[PREDICTOR] Analyzing claim ${input.claimId}`);

  // Calculate probabilities
  const probabilities = calculateProbabilities(input);

  // Generate risk flags
  const riskFlags = generateRiskFlags(input, probabilities);

  // Predict carrier behavior
  const carrierBehavior = await predictCarrierBehavior(input, probabilities);

  // Generate recommended steps
  const recommendedSteps = generateRecommendedSteps(input, probabilities, riskFlags);

  // Generate success path
  const successPath = generateSuccessPath(input, probabilities);

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(input, probabilities);

  // Generate AI narrative summary
  const aiSummary = await generateAISummary(input, probabilities, carrierBehavior);

  // Predict carrier's next move
  const nextMove = predictNextMove(input, probabilities, carrierBehavior);

  return {
    probabilityFull: probabilities.full,
    probabilityPart: probabilities.partial,
    probabilityDeny: probabilities.deny,
    confidenceScore,
    recommendedSteps,
    riskFlags,
    nextMove,
    aiSummary,
    carrierBehavior,
    successPath,
  };
}

/**
 * Calculate approval/partial/denial probabilities
 */
function calculateProbabilities(input: PredictionInput): {
  full: number;
  partial: number;
  deny: number;
} {
  let full = 50;
  let partial = 30;
  let deny = 20;

  // Storm data factors
  if (input.stormImpact) {
    const { hailSize = 0, windSpeed = 0, distance = 999, severityScore = 0 } = input.stormImpact;

    // Hail size impact
    if (hailSize >= 2.0) {
      full += 20;
      deny -= 15;
    } else if (hailSize >= 1.5) {
      full += 10;
      deny -= 5;
    } else if (hailSize < 1.0) {
      deny += 15;
      full -= 10;
    }

    // Wind speed impact
    if (windSpeed >= 80) {
      full += 15;
      deny -= 10;
    } else if (windSpeed >= 60) {
      full += 5;
    } else if (windSpeed < 40) {
      deny += 10;
      full -= 5;
    }

    // Distance from storm
    if (distance <= 2) {
      full += 10;
      deny -= 5;
    } else if (distance > 10) {
      deny += 15;
      full -= 10;
    }

    // Overall severity
    if (severityScore >= 7.0) {
      full += 15;
      deny -= 10;
    } else if (severityScore < 4.0) {
      deny += 20;
      full -= 15;
    }
  }

  // SkaiPDF factors
  if (input.skaiAnalysis) {
    const { urgency, flags = [] } = input.skaiAnalysis;

    if (urgency === "critical" || urgency === "high") {
      full += 10;
      deny -= 5;
    }

    if (flags.includes("comprehensive_damage")) {
      full += 5;
    }

    if (flags.includes("minimal_damage")) {
      deny += 15;
      full -= 10;
    }

    if (flags.includes("missing_documentation")) {
      deny += 10;
      partial += 5;
      full -= 15;
    }
  }

  // Media factors
  if (input.hasVideo) {
    full += 10; // Video evidence helps
    deny -= 5;
  }

  if (input.photoCount) {
    if (input.photoCount >= 20) {
      full += 5;
    } else if (input.photoCount < 5) {
      deny += 10;
      full -= 5;
    }
  }

  // Denial letter present
  if (input.hasDenialLetter) {
    deny += 30;
    full -= 20;
    partial -= 10;
  }

  // Timeline factors
  if (input.daysSinceCreation) {
    if (input.daysSinceCreation > 90) {
      deny += 10; // Old claims harder to approve
      full -= 5;
    }
  }

  // Normalize to 100%
  const total = full + partial + deny;
  full = Math.round((full / total) * 100);
  partial = Math.round((partial / total) * 100);
  deny = 100 - full - partial;

  // Clamp values
  full = Math.max(0, Math.min(100, full));
  partial = Math.max(0, Math.min(100, partial));
  deny = Math.max(0, Math.min(100, deny));

  return { full, partial, deny };
}

/**
 * Generate risk flags
 */
function generateRiskFlags(input: PredictionInput, probabilities: any): string[] {
  const flags: string[] = [];

  if (probabilities.deny > 50) {
    flags.push("High denial risk detected");
  }

  if (input.stormImpact && input.stormImpact.distance && input.stormImpact.distance > 10) {
    flags.push("Property located far from storm center");
  }

  if (input.photoCount && input.photoCount < 5) {
    flags.push("Insufficient documentation - add more photos");
  }

  if (!input.hasVideo) {
    flags.push("No video evidence - carrier may request more proof");
  }

  if (input.skaiAnalysis?.flags?.includes("missing_documentation")) {
    flags.push("Missing critical documentation");
  }

  if (input.hasDenialLetter) {
    flags.push("Claim previously denied - appeal required");
  }

  if (input.daysSinceCreation && input.daysSinceCreation > 90) {
    flags.push("Aged claim - carrier may scrutinize heavily");
  }

  if (input.stormImpact && input.stormImpact.hailSize && input.stormImpact.hailSize < 1.0) {
    flags.push("Small hail size - carrier may argue insufficient damage");
  }

  return flags;
}

/**
 * Predict carrier behavior using AI
 */
async function predictCarrierBehavior(
  input: PredictionInput,
  probabilities: any
): Promise<{
  likelyStrategy: string;
  commonTactics: string[];
  timeline: string;
}> {
  const prompt = `You are a claims prediction expert. Based on this data, predict the carrier's likely strategy and behavior:

Storm Data:
- Hail: ${input.stormImpact?.hailSize || "unknown"} inches
- Wind: ${input.stormImpact?.windSpeed || "unknown"} mph
- Distance: ${input.stormImpact?.distance || "unknown"} miles

Claim Data:
- Photos: ${input.photoCount || 0}
- Video: ${input.hasVideo ? "Yes" : "No"}
- Days Old: ${input.daysSinceCreation || 0}
- Denial Letter: ${input.hasDenialLetter ? "Yes" : "No"}

Probabilities:
- Full Approval: ${probabilities.full}%
- Partial: ${probabilities.partial}%
- Denial: ${probabilities.deny}%

Predict:
1. The carrier's likely strategy (1-2 sentences)
2. Common tactics they'll use (3 bullet points)
3. Expected timeline (1 sentence)

Be specific and tactical.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert insurance claims analyst. Provide tactical predictions about carrier behavior.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || "";

    // Parse response (simplified)
    const lines = response.split("\n").filter((l) => l.trim());

    return {
      likelyStrategy: lines[0] || "Standard claim review process",
      commonTactics: lines.slice(1, 4),
      timeline: lines[lines.length - 1] || "2-4 weeks for initial response",
    };
  } catch (err) {
    logger.error("[PREDICTOR] AI carrier behavior error:", err);
    return {
      likelyStrategy: "Standard review process with documentation requests",
      commonTactics: [
        "Request additional photos",
        "Question storm proximity",
        "Negotiate on material costs",
      ],
      timeline: "2-4 weeks for response",
    };
  }
}

/**
 * Generate recommended steps
 */
function generateRecommendedSteps(
  input: PredictionInput,
  probabilities: any,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  riskFlags: string[]
): PredictionOutput["recommendedSteps"] {
  const steps: PredictionOutput["recommendedSteps"] = [];

  if (probabilities.deny > 50) {
    steps.push({
      title: "Prepare denial rebuttal",
      description: "High denial risk detected. Start preparing appeal documentation now.",
      priority: "high",
      reasoning: `Denial probability is ${probabilities.deny}%. Proactive preparation critical.`,
    });
  }

  if (input.photoCount && input.photoCount < 10) {
    steps.push({
      title: "Add more photo documentation",
      description: "Upload at least 10-15 clear photos showing damage from multiple angles.",
      priority: "high",
      reasoning: "Insufficient photo evidence weakens claim strength.",
    });
  }

  if (!input.hasVideo) {
    steps.push({
      title: "Create video presentation",
      description: "Generate AI-powered video walkthrough using SkaiScraper's video engine.",
      priority: "medium",
      reasoning: "Video evidence significantly increases approval likelihood.",
    });
  }

  if (input.stormImpact && input.stormImpact.distance && input.stormImpact.distance > 10) {
    steps.push({
      title: "Strengthen storm correlation",
      description: "Run detailed storm impact analysis to prove damage correlation.",
      priority: "high",
      reasoning: "Property distance from storm center may be questioned by carrier.",
    });
  }

  if (probabilities.full > 70) {
    steps.push({
      title: "Proceed with confidence",
      description: "Strong approval indicators. Push for full settlement immediately.",
      priority: "medium",
      reasoning: `Full approval probability is ${probabilities.full}%. Don't settle for less.`,
    });
  }

  return steps;
}

/**
 * Generate success path guidance
 */
function generateSuccessPath(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  input: PredictionInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  probabilities: any
): PredictionOutput["successPath"] {
  return [
    {
      step: 1,
      action: "Documentation Phase",
      doThis:
        "Upload 15-20 high-quality photos from multiple angles. Include close-ups and wide shots.",
      dontDoThis: "Don't submit blurry photos or less than 10 total images.",
    },
    {
      step: 2,
      action: "AI Analysis",
      doThis:
        "Run SkaiPDF analysis to identify all damage and materials. Export adjuster packet.",
      dontDoThis: "Don't skip AI analysis - carriers respect data-driven reports.",
    },
    {
      step: 3,
      action: "Storm Correlation",
      doThis: "Generate storm impact report with NOAA data. Prove damage timing and severity.",
      dontDoThis:
        "Don't submit without storm documentation - carriers will deny for lack of causation.",
    },
    {
      step: 4,
      action: "Video Presentation",
      doThis: "Create professional video walkthrough. Show damage clearly and narrate findings.",
      dontDoThis: "Don't rely on photos alone - video doubles approval rates.",
    },
    {
      step: 5,
      action: "Submit to Carrier",
      doThis: "Send complete packet with all documentation. Follow up in 5-7 days.",
      dontDoThis: "Don't submit piecemeal. Incomplete submissions trigger denials.",
    },
    {
      step: 6,
      action: "Negotiation",
      doThis:
        "If partial approval, use supplement engine to argue for missing items with code citations.",
      dontDoThis:
        "Don't accept first offer without review. Most initial offers are 60-70% of actual.",
    },
  ];
}

/**
 * Calculate confidence score
 */
function calculateConfidenceScore(input: PredictionInput, probabilities: any): number {
  let confidence = 50;

  // More data = higher confidence
  if (input.stormImpact) confidence += 15;
  if (input.skaiAnalysis) confidence += 15;
  if (input.hasVideo) confidence += 10;
  if (input.photoCount && input.photoCount >= 10) confidence += 10;

  // Strong probability signals = higher confidence
  const maxProb = Math.max(probabilities.full, probabilities.partial, probabilities.deny);
  if (maxProb >= 70) confidence += 10;
  if (maxProb >= 80) confidence += 10;

  return Math.min(100, Math.max(0, confidence));
}

/**
 * Generate AI summary
 */
async function generateAISummary(
  input: PredictionInput,
  probabilities: any,
  carrierBehavior: any
): Promise<string> {
  const prompt = `You are analyzing a roofing insurance claim. Provide a brief 2-3 sentence summary of what the carrier is likely thinking and what the contractor should do.

Probabilities:
- Full: ${probabilities.full}%
- Partial: ${probabilities.partial}%
- Deny: ${probabilities.deny}%

Carrier Strategy: ${carrierBehavior.likelyStrategy}

Be direct and tactical. Start with "The carrier will likely..."`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a claims prediction expert. Be concise." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || "Analysis in progress.";
  } catch (_err) {
    return `Based on current data, the claim has a ${probabilities.full}% chance of full approval. ${
      probabilities.deny > 50
        ? "High denial risk detected - prepare appeal documentation immediately."
        : "Strong approval indicators present."
    }`;
  }
}

/**
 * Predict carrier's next move
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function predictNextMove(input: PredictionInput, probabilities: any, carrierBehavior: any): string {
  if (probabilities.deny > 60) {
    return "Likely to request additional documentation or deny claim";
  }

  if (probabilities.partial > probabilities.full) {
    return "Likely to offer partial approval with reduced scope";
  }

  if (probabilities.full > 70) {
    return "Likely to approve claim with minor adjustments";
  }

  if (!input.hasVideo) {
    return "May request video evidence or additional photos";
  }

  if (input.stormImpact && input.stormImpact.distance && input.stormImpact.distance > 10) {
    return "May question storm causation due to distance";
  }

  return "Standard review process - expect response in 2-3 weeks";
}
