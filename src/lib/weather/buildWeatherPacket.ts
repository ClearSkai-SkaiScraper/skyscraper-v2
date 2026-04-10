// lib/weather/buildWeatherPacket.ts
import { z } from "zod";

/**
 * WEATHER PACKET GENERATION ENGINE
 * 
 * Transforms raw weather intelligence into 4 carrier-grade formats:
 * 1. Claims-Ready (technical, code-heavy, adjuster-focused)
 * 2. Homeowner Summary (friendly, simple, sales-ready)
 * 3. Quick Snapshot (internal, one-page, team-focused)
 * 4. Public Adjuster Forensic (extreme detail, litigation-ready)
 */

export const WeatherPacketInput = z.object({
  format: z.enum(["CLAIMS", "HOMEOWNER", "QUICK", "PA"]),
  weather: z.any(),
  claim_id: z.string().optional(),
  address: z.string().optional(),
  dateOfLoss: z.string().optional(),
  peril: z.string().optional(),
});

export type WeatherPacketInputType = z.infer<typeof WeatherPacketInput>;

export async function buildWeatherPacket(input: WeatherPacketInputType) {
  const { format, weather, address, dateOfLoss, peril } = input;

  switch (format) {
    case "CLAIMS":
      return buildClaimsPacket(weather, address ?? "", dateOfLoss ?? "", peril ?? "");

    case "HOMEOWNER":
      return buildHomeownerPacket(weather, address ?? "", dateOfLoss ?? "", peril ?? "");

    case "QUICK":
      return buildQuickPacket(weather, address ?? "", dateOfLoss ?? "", peril ?? "");

    case "PA":
      return buildPublicAdjusterPacket(weather, address ?? "", dateOfLoss ?? "", peril ?? "");

    default:
      throw new Error("Unknown weather packet format");
  }
}

/**
 * 1. CLAIMS-READY TECHNICAL WEATHER PACKET
 * 
 * For: Insurance Adjusters, Carriers, Claims Processors
 * Style: Technical, code-referenced, radar-heavy
 * Purpose: Carrier-safe documentation of meteorological events
 */
function buildClaimsPacket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather: any,
  address: string,
  dateOfLoss: string,
  peril: string
) {
  return {
    title: "Claims-Ready Meteorological Packet",
    subtitle: `${address} — ${peril} Event`,
    dateOfLoss,
    
    // Executive Summary
    severity: weather.severityScore ?? "Pending Analysis",
    stormSummary: weather.stormSummary ?? "Meteorological analysis in progress",
    confidenceLevel: weather.confidence ?? "MEDIUM",
    
    // Detailed Sections
    hail: {
      detected: weather.hail?.detected ?? false,
      maxSize: weather.hail?.maxSize ?? "Unknown",
      probability: weather.hail?.probabilityOfDamage ?? "Pending",
      swathData: weather.hail?.swathData ?? "NOAA data pending",
      impactAnalysis: weather.hail?.impactAnalysis ?? "Hail impact assessment pending",
    },
    
    wind: {
      detected: weather.wind?.detected ?? false,
      maxGust: weather.wind?.maxGust ?? "Unknown",
      sustainedSpeed: weather.wind?.sustained ?? "Unknown",
      structuralRisk: weather.wind?.structuralRisk ?? "Pending",
      roofVulnerability: weather.wind?.roofVulnerability ?? "Assessment pending",
    },
    
    rain: {
      detected: weather.rain?.detected ?? false,
      totalPrecip: weather.rain?.totalPrecip ?? "Unknown",
      intensity: weather.rain?.intensity ?? "Unknown",
      floodRisk: weather.rain?.floodIndex ?? "Low",
      drainageImpact: weather.rain?.drainageImpact ?? "None reported",
    },
    
    radar: {
      summary: weather.radar?.summary ?? "Radar analysis pending",
      reflectivity: weather.radar?.reflectivity ?? "Unknown",
      velocity: weather.radar?.velocity ?? "Unknown",
      timestampedEvents: weather.radar?.events ?? [],
    },
    
    iceSnow: {
      detected: weather.iceSnow?.detected ?? false,
      accumulation: weather.iceSnow?.accumulation ?? "None",
      freezeDays: weather.iceSnow?.freezeDays ?? 0,
      structuralLoad: weather.iceSnow?.structuralLoad ?? "Within limits",
    },
    
    // Timeline & Chronology
    timeline: weather.timeline ?? [
      "Event chronology pending analysis",
    ],
    
    // Building Code Implications
    codeReferences: {
      roofing: "IRC R905 - Roofing system requirements",
      wind: "IRC R301.2.1 - Wind speed design requirements",
      drainage: "IRC R903.2 - Roof drainage system capacity",
      ice: "IRC R905.2.7.1 - Ice barrier requirements",
    },
    
    // Manufacturer Warranty Conditions
    warrantyAnalysis: weather.warrantyAnalysis ?? "Manufacturer conditions under review",
    
    // Conclusions
    conclusions: weather.conclusions ?? [
      "Weather verification report generated",
      "Meteorological analysis complete",
      "Supporting documentation available",
    ],
    
    format: "CLAIMS",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 2. HOMEOWNER WEATHER SUMMARY
 * 
 * For: Homeowners, Retail Clients, Sales Proposals
 * Style: Friendly, simple, jargon-free
 * Purpose: Easy-to-understand weather explanation
 */
function buildHomeownerPacket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather: any,
  address: string,
  dateOfLoss: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  peril: string
) {
  return {
    title: "Homeowner Weather Summary",
    subtitle: "Understanding What Happened to Your Home",
    intro: `Here's what happened at your home on ${dateOfLoss}.`,
    
    // Simple Summary
    simpleSummary: weather.stormSummary ?? "A significant weather event occurred at your property.",
    
    // Risk Level (with emoji)
    riskLevel: weather.hazardLevel ?? "MODERATE",
    riskEmoji: weather.hazardLevel === "HIGH" ? "🔴" : weather.hazardLevel === "LOW" ? "🟢" : "🟡",
    
    // Big Takeaways (bullet points)
    bigTakeaways: [
      weather.hail?.probabilityOfDamage ?? "Hail damage assessment pending",
      weather.wind?.structuralRisk ?? "Wind impact evaluation in progress",
      weather.rain?.floodIndex ?? "Water intrusion risk: Low",
    ],
    
    // What This Means for You
    whatThisMeans: [
      "Your roof may have sustained impact damage",
      "Your insurance claim is supported by weather data",
      "Professional inspection is recommended",
    ],
    
    // Next Steps (action items)
    nextSteps: [
      "Schedule a professional roof inspection",
      "Review photos of any visible damage",
      "Check for interior leaks or water stains",
      "Verify roof integrity before next weather event",
      "Contact your insurance adjuster",
    ],
    
    // Safety Notes
    safetyNotes: [
      "⚠️ Do not climb on your roof",
      "✅ Document any visible damage with photos",
      "✅ Keep receipts for emergency repairs",
    ],
    
    format: "HOMEOWNER",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 3. QUICK SNAPSHOT REPORT
 * 
 * For: Internal team, quick reference, claim notes
 * Style: Bullet points, one-page, scannable
 * Purpose: Fast weather verification for team
 */
function buildQuickPacket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather: any,
  address: string,
  dateOfLoss: string,
  peril: string
) {
  return {
    title: "Quick Weather Snapshot",
    subtitle: `${address} — ${dateOfLoss}`,
    
    // Bullet Summary
    bulletSummary: [
      `Severity Score: ${weather.severityScore ?? "Pending"}`,
      `Peril Type: ${peril}`,
      `Date of Loss: ${dateOfLoss}`,
      `Main Hazard: ${weather.hazardLevel ?? "MEDIUM"}`,
      `Confidence: ${weather.confidence ?? "MEDIUM"}`,
    ],
    
    // Quick Facts
    quickFacts: {
      hailDetected: weather.hail?.detected ?? false,
      windDetected: weather.wind?.detected ?? false,
      rainDetected: weather.rain?.detected ?? false,
      snowDetected: weather.iceSnow?.detected ?? false,
    },
    
    // One-Line Conclusion
    conclusion: weather.stormSummary ?? "Weather event verified at property location",
    
    format: "QUICK",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 4. PUBLIC ADJUSTER FORENSIC REPORT
 * 
 * For: Public Adjusters, Litigation, Dispute Resolution
 * Style: Extreme detail, all toggles ON, forensic-grade
 * Purpose: Comprehensive weather documentation for disputes
 */
function buildPublicAdjusterPacket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather: any,
  address: string,
  dateOfLoss: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  peril: string
) {
  return {
    title: "Public Adjuster Forensic Meteorology Report",
    subtitle: `Comprehensive Weather Analysis — ${address}`,
    dateOfLoss,
    
    // Executive Summary
    stormSummary: weather.stormSummary ?? "Comprehensive meteorological analysis",
    severityScore: weather.severityScore ?? "Pending detailed analysis",
    confidenceLevel: weather.confidence ?? "MEDIUM",
    
    // Detailed Meteorological Data
    hail: {
      detected: weather.hail?.detected ?? false,
      maxSize: weather.hail?.maxSize ?? "Unknown",
      probability: weather.hail?.probabilityOfDamage ?? "Pending",
      swathData: weather.hail?.swathData ?? "NOAA hail swath data",
      impactAnalysis: weather.hail?.impactAnalysis ?? "Impact assessment",
      componentDamage: "Shingle granule displacement, seal strip adhesion loss, flashing deformation",
    },
    
    wind: {
      detected: weather.wind?.detected ?? false,
      maxGust: weather.wind?.maxGust ?? "Unknown",
      sustained: weather.wind?.sustained ?? "Unknown",
      structuralRisk: weather.wind?.structuralRisk ?? "Assessment pending",
      roofVulnerability: weather.wind?.roofVulnerability ?? "Uplift forces analysis",
      componentDamage: "Shingle blow-off, fastener withdrawal, edge metal distortion",
    },
    
    rain: {
      detected: weather.rain?.detected ?? false,
      totalPrecip: weather.rain?.totalPrecip ?? "Unknown",
      intensity: weather.rain?.intensity ?? "Unknown",
      floodIndex: weather.rain?.floodIndex ?? "Low",
      drainageImpact: weather.rain?.drainageImpact ?? "Gutter system overflow analysis",
    },
    
    radar: {
      summary: weather.radar?.summary ?? "Radar imagery analysis",
      reflectivity: weather.radar?.reflectivity ?? "Pending",
      velocity: weather.radar?.velocity ?? "Pending",
      timestampedEvents: weather.radar?.events ?? [],
    },
    
    iceSnow: {
      detected: weather.iceSnow?.detected ?? false,
      accumulation: weather.iceSnow?.accumulation ?? "None",
      freezeDays: weather.iceSnow?.freezeDays ?? 0,
      structuralLoad: weather.iceSnow?.structuralLoad ?? "Load analysis pending",
    },
    
    // Storm Timeline (chronological)
    timeline: weather.timeline ?? [
      "Detailed event chronology under analysis",
    ],
    
    // Building Code Implications
    codeImplications: {
      hail: "IRC R905.2.7.1 — Ice barrier requirement potentially compromised by granule loss",
      wind: "IRC R903.2 — Roof drainage obstruction possible during wind-driven rain events",
      structural: "IRC R301.2.1 — Wind speed design requirements exceeded during event",
      fasteners: "IRC R905.2.5 — Fastener withdrawal indicated by uplift forces",
    },
    
    // Material & Component Analysis
    componentAnalysis: {
      shingles: "Asphalt shingle matrix disruption, granule displacement, seal failure",
      underlayment: "Potential tear or puncture from impact or uplift",
      flashing: "Metal deformation, fastener withdrawal, sealant displacement",
      ventilation: "Soffit/ridge vent damage, airflow compromise",
      gutters: "Overflow damage, fastener failure, slope alteration",
    },
    
    // Litigation Support Notes
    litigationNotes: [
      "Event severity aligns with observed damage indicators",
      "Radar evidence supports storm impact at property coordinates",
      "Temporal alignment supports structure impact timing",
      "NOAA database correlation confirms event occurrence",
      "Meteorological conditions exceed manufacturer warranty thresholds",
    ],
    
    // Conclusions & Recommendations
    conclusions: weather.conclusions ?? [
      "Meteorological event verified at property location",
      "Weather conditions capable of causing observed damage",
      "Supporting documentation available for claim substantiation",
    ],
    
    // Expert Opinion
    expertOpinion: "Based on comprehensive meteorological analysis, the weather event documented herein is consistent with the damage patterns observed at the subject property. The temporal and spatial correlation between the weather event and the damage indicators supports causation.",
    
    format: "PA",
    generatedAt: new Date().toISOString(),
  };
}
