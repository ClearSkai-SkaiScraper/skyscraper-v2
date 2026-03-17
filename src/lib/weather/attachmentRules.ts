/**
 * Weather Evidence Attachment Rules
 *
 * Determines what weather evidence to include in carrier packets,
 * damage reports, and supplement documentation based on claim type,
 * carrier requirements, and evidence quality.
 */

import { logger } from "@/lib/logger";

import { getStormEvidence, StormEvidence } from "./getStormEvidence";

export interface AttachmentRule {
  documentType: string;
  required: boolean;
  priority: number; // 1 = highest
  conditions?: {
    minConfidence?: number;
    perils?: string[];
    minHailSize?: number;
    minWindSpeed?: number;
  };
}

export interface WeatherAttachment {
  type: string;
  title: string;
  description: string;
  url?: string;
  data?: any;
  priority: number;
  required: boolean;
}

export interface AttachmentResult {
  attachments: WeatherAttachment[];
  missingRequired: string[];
  evidenceGrade: string;
  recommendations: string[];
}

// Default rules for different packet types
const CARRIER_PACKET_RULES: AttachmentRule[] = [
  {
    documentType: "weather_summary",
    required: true,
    priority: 1,
  },
  {
    documentType: "dol_verification",
    required: true,
    priority: 2,
  },
  {
    documentType: "storm_event_report",
    required: false,
    priority: 3,
    conditions: { minConfidence: 0.6 },
  },
  {
    documentType: "hail_report",
    required: false,
    priority: 4,
    conditions: { perils: ["hail"], minHailSize: 0.75 },
  },
  {
    documentType: "wind_report",
    required: false,
    priority: 5,
    conditions: { perils: ["wind"], minWindSpeed: 58 },
  },
  {
    documentType: "radar_images",
    required: false,
    priority: 6,
    conditions: { minConfidence: 0.5 },
  },
  {
    documentType: "noaa_citations",
    required: false,
    priority: 7,
  },
  {
    documentType: "photo_correlation",
    required: false,
    priority: 8,
    conditions: { minConfidence: 0.7 },
  },
];

const SUPPLEMENT_RULES: AttachmentRule[] = [
  {
    documentType: "weather_summary",
    required: true,
    priority: 1,
  },
  {
    documentType: "storm_event_report",
    required: true,
    priority: 2,
  },
  {
    documentType: "radar_images",
    required: false,
    priority: 3,
  },
];

const DAMAGE_REPORT_RULES: AttachmentRule[] = [
  {
    documentType: "weather_summary",
    required: true,
    priority: 1,
  },
  {
    documentType: "dol_verification",
    required: true,
    priority: 2,
  },
  {
    documentType: "photo_correlation",
    required: false,
    priority: 3,
  },
];

/**
 * Get weather attachments for a carrier packet
 */
export async function getCarrierPacketAttachments(claimId: string): Promise<AttachmentResult> {
  return getAttachmentsForRules(claimId, CARRIER_PACKET_RULES, "carrier_packet");
}

/**
 * Get weather attachments for a supplement
 */
export async function getSupplementAttachments(claimId: string): Promise<AttachmentResult> {
  return getAttachmentsForRules(claimId, SUPPLEMENT_RULES, "supplement");
}

/**
 * Get weather attachments for a damage report
 */
export async function getDamageReportAttachments(claimId: string): Promise<AttachmentResult> {
  return getAttachmentsForRules(claimId, DAMAGE_REPORT_RULES, "damage_report");
}

/**
 * Core function to evaluate rules and generate attachments
 */
async function getAttachmentsForRules(
  claimId: string,
  rules: AttachmentRule[],
  packetType: string
): Promise<AttachmentResult> {
  // Get storm evidence for the claim
  const evidence = await getStormEvidence(claimId);

  if (!evidence) {
    logger.warn("[WeatherAttachments] No storm evidence found", { claimId, packetType });
    return {
      attachments: [],
      missingRequired: rules.filter((r) => r.required).map((r) => r.documentType),
      evidenceGrade: "F",
      recommendations: [
        "Run weather verification to generate storm evidence",
        "Verify claim has a valid date of loss",
      ],
    };
  }

  const attachments: WeatherAttachment[] = [];
  const missingRequired: string[] = [];
  const recommendations: string[] = [];

  // Evaluate each rule
  for (const rule of rules) {
    const attachment = evaluateRule(rule, evidence);

    if (attachment) {
      attachments.push(attachment);
    } else if (rule.required) {
      missingRequired.push(rule.documentType);
    }
  }

  // Sort by priority
  attachments.sort((a, b) => a.priority - b.priority);

  // Generate recommendations
  if (evidence.dolConfidence < 0.5) {
    recommendations.push("Low confidence score - consider manual DOL verification");
  }

  if (evidence.primaryPeril === "hail" && !evidence.hailSizeInches) {
    recommendations.push("Hail claim missing hail size data - add storm reports");
  }

  if (evidence.topEvents.length === 0) {
    recommendations.push("No supporting weather events found - expand search radius");
  }

  if (missingRequired.length > 0) {
    recommendations.push(`Missing required documents: ${missingRequired.join(", ")}`);
  }

  // Calculate evidence grade
  const evidenceGrade = calculateEvidenceGrade(
    evidence,
    attachments.length,
    missingRequired.length
  );

  return {
    attachments,
    missingRequired,
    evidenceGrade,
    recommendations,
  };
}

/**
 * Evaluate a single rule against evidence
 */
function evaluateRule(rule: AttachmentRule, evidence: StormEvidence): WeatherAttachment | null {
  // Check conditions
  if (rule.conditions) {
    const { minConfidence, perils, minHailSize, minWindSpeed } = rule.conditions;

    if (minConfidence && evidence.dolConfidence < minConfidence) {
      return null;
    }

    if (perils && !perils.includes(evidence.primaryPeril)) {
      return null;
    }

    if (minHailSize && (!evidence.hailSizeInches || evidence.hailSizeInches < minHailSize)) {
      return null;
    }

    if (minWindSpeed && (!evidence.windSpeedMph || evidence.windSpeedMph < minWindSpeed)) {
      return null;
    }
  }

  // Generate attachment based on document type
  switch (rule.documentType) {
    case "weather_summary":
      return {
        type: "weather_summary",
        title: "Weather Event Summary",
        description: `${evidence.primaryPeril.toUpperCase()} event on ${evidence.selectedDOL}. Confidence: ${Math.round(evidence.dolConfidence * 100)}%`,
        data: {
          peril: evidence.primaryPeril,
          dol: evidence.selectedDOL,
          confidence: evidence.dolConfidence,
          eventCount: evidence.topEvents.length,
        },
        priority: rule.priority,
        required: rule.required,
      };

    case "dol_verification":
      return {
        type: "dol_verification",
        title: "Date of Loss Verification",
        description: `DOL verified as ${evidence.selectedDOL} based on ${evidence.topEvents.length} weather events`,
        data: {
          dol: evidence.selectedDOL,
          confidence: evidence.dolConfidence,
          topEvents: evidence.topEvents.slice(0, 3),
        },
        priority: rule.priority,
        required: rule.required,
      };

    case "storm_event_report":
      if (evidence.topEvents.length === 0) return null;
      return {
        type: "storm_event_report",
        title: "Storm Event Report",
        description: `${evidence.topEvents.length} documented weather events supporting claim`,
        data: {
          events: evidence.topEvents,
          peril: evidence.primaryPeril,
        },
        priority: rule.priority,
        required: rule.required,
      };

    case "hail_report":
      if (!evidence.hailSizeInches) return null;
      return {
        type: "hail_report",
        title: "Hail Impact Report",
        description: `Hail size: ${evidence.hailSizeInches}" recorded at ${evidence.selectedDOL}`,
        data: {
          hailSize: evidence.hailSizeInches,
          dol: evidence.selectedDOL,
          events: evidence.topEvents.filter((e) => e.type === "hail_report"),
        },
        priority: rule.priority,
        required: rule.required,
      };

    case "wind_report":
      if (!evidence.windSpeedMph) return null;
      return {
        type: "wind_report",
        title: "Wind Impact Report",
        description: `Max wind speed: ${evidence.windSpeedMph} mph recorded at ${evidence.selectedDOL}`,
        data: {
          windSpeed: evidence.windSpeedMph,
          dol: evidence.selectedDOL,
          events: evidence.topEvents.filter((e) => e.type === "wind_report"),
        },
        priority: rule.priority,
        required: rule.required,
      };

    case "radar_images":
      if (!evidence.radarImageUrls || evidence.radarImageUrls.length === 0) return null;
      return {
        type: "radar_images",
        title: "Weather Radar Images",
        description: `${evidence.radarImageUrls.length} radar images from storm event`,
        data: {
          images: evidence.radarImageUrls,
        },
        priority: rule.priority,
        required: rule.required,
      };

    case "noaa_citations":
      const noaaEvents = evidence.topEvents.filter(
        (e) => e.source === "mesonet" || e.source === "cap"
      );
      if (noaaEvents.length === 0) return null;
      return {
        type: "noaa_citations",
        title: "NOAA/NWS Citations",
        description: `${noaaEvents.length} official weather service citations`,
        data: {
          citations: noaaEvents.map((e) => ({
            source: e.source,
            type: e.type,
            time: e.timeUtc,
            eventId: e.eventId,
          })),
        },
        priority: rule.priority,
        required: rule.required,
      };

    case "photo_correlation":
      if (!evidence.correlationScore) return null;
      return {
        type: "photo_correlation",
        title: "Photo-Weather Correlation",
        description: `Photo timing correlation score: ${evidence.correlationScore}%`,
        data: {
          correlationScore: evidence.correlationScore,
          photoCorrelations: evidence.photoCorrelations,
        },
        priority: rule.priority,
        required: rule.required,
      };

    default:
      return null;
  }
}

/**
 * Calculate overall evidence grade
 */
function calculateEvidenceGrade(
  evidence: StormEvidence,
  attachmentCount: number,
  missingCount: number
): string {
  let score = 0;

  // Confidence score (0-40 points) - dolConfidence is 0-1 scale
  score += Math.min(40, evidence.dolConfidence * 40);

  // Event count (0-20 points)
  score += Math.min(20, evidence.topEvents.length * 4);

  // Attachment completeness (0-20 points)
  score += Math.min(20, attachmentCount * 3);

  // Penalty for missing required docs (-10 per missing)
  score -= missingCount * 10;

  // Bonus for specific evidence
  if (evidence.hailSizeInches && evidence.hailSizeInches >= 1) score += 5;
  if (evidence.windSpeedMph && evidence.windSpeedMph >= 58) score += 5;
  if (evidence.radarImageUrls && evidence.radarImageUrls.length > 0) score += 5;
  if (evidence.correlationScore && evidence.correlationScore > 70) score += 5;

  // Convert to letter grade
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 45) return "D+";
  if (score >= 40) return "D";
  return "F";
}

/**
 * Carrier-specific rule overrides
 */
export const CARRIER_SPECIFIC_RULES: Record<string, Partial<AttachmentRule>[]> = {
  "State Farm": [
    { documentType: "noaa_citations", required: true },
    { documentType: "radar_images", required: true },
  ],
  Allstate: [{ documentType: "hail_report", required: true, conditions: { perils: ["hail"] } }],
  USAA: [{ documentType: "photo_correlation", required: true }],
  "Liberty Mutual": [{ documentType: "storm_event_report", required: true }],
};

/**
 * Get carrier-specific attachments
 */
export async function getCarrierSpecificAttachments(
  claimId: string,
  carrierName: string
): Promise<AttachmentResult> {
  // Start with base rules
  let rules = [...CARRIER_PACKET_RULES];

  // Apply carrier-specific overrides
  const overrides = CARRIER_SPECIFIC_RULES[carrierName];
  if (overrides) {
    for (const override of overrides) {
      const existingIndex = rules.findIndex((r) => r.documentType === override.documentType);
      if (existingIndex >= 0) {
        rules[existingIndex] = { ...rules[existingIndex], ...override };
      } else {
        rules.push(override as AttachmentRule);
      }
    }
  }

  return getAttachmentsForRules(claimId, rules, `carrier_${carrierName}`);
}
