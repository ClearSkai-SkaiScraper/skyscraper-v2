/**
 * Damage Severity Scoring Engine
 *
 * Calculates comprehensive damage scores (1-10 scale) based on:
 * - Damage type and extent
 * - Coverage area percentage
 * - Material condition
 * - Urgency factors
 * - Structural impact
 *
 * Returns per-zone and overall property scores.
 */

export interface DamageZone {
  name: string;
  damageType: string[];
  coveragePercent: number;
  materialCondition: "excellent" | "good" | "fair" | "poor" | "critical";
  structuralImpact: boolean;
  urgency: "low" | "medium" | "high" | "critical";
}

export interface SeverityScore {
  zone: string;
  score: number; // 1-10
  category: "minor" | "moderate" | "severe" | "catastrophic";
  factors: {
    damageExtent: number;
    materialCondition: number;
    structuralRisk: number;
    urgency: number;
  };
  recommendations: string[];
}

export interface OverallSeverity {
  totalScore: number; // 1-10
  category: "minor" | "moderate" | "severe" | "catastrophic";
  zoneScores: SeverityScore[];
  criticalZones: string[];
  estimatedRepairPriority: string[];
}

/**
 * Calculate severity score for a single damage zone
 */
export function calculateZoneSeverity(zone: DamageZone): SeverityScore {
  // Factor 1: Damage Extent (based on coverage)
  let extentScore = 0;
  if (zone.coveragePercent >= 75) extentScore = 10;
  else if (zone.coveragePercent >= 50) extentScore = 8;
  else if (zone.coveragePercent >= 25) extentScore = 6;
  else if (zone.coveragePercent >= 10) extentScore = 4;
  else extentScore = 2;

  // Factor 2: Material Condition
  const conditionScores = {
    excellent: 1,
    good: 3,
    fair: 5,
    poor: 8,
    critical: 10,
  };
  const conditionScore = conditionScores[zone.materialCondition];

  // Factor 3: Structural Risk
  const structuralScore = zone.structuralImpact ? 10 : 2;

  // Factor 4: Urgency
  const urgencyScores = {
    low: 2,
    medium: 5,
    high: 8,
    critical: 10,
  };
  const urgencyScore = urgencyScores[zone.urgency];

  // Weighted average (extent 30%, condition 25%, structural 30%, urgency 15%)
  const totalScore =
    extentScore * 0.3 + conditionScore * 0.25 + structuralScore * 0.3 + urgencyScore * 0.15;

  // Round to 1 decimal
  const score = Math.round(totalScore * 10) / 10;

  // Determine category
  let category: "minor" | "moderate" | "severe" | "catastrophic";
  if (score >= 8.5) category = "catastrophic";
  else if (score >= 6.5) category = "severe";
  else if (score >= 4.0) category = "moderate";
  else category = "minor";

  // Generate recommendations
  const recommendations: string[] = [];

  if (zone.structuralImpact) {
    recommendations.push("Schedule structural engineering inspection immediately");
  }

  if (zone.urgency === "critical" || zone.urgency === "high") {
    recommendations.push("Priority repair required within 7-14 days");
  }

  if (zone.coveragePercent >= 50) {
    recommendations.push("Consider full section replacement vs. piecemeal repairs");
  }

  if (zone.materialCondition === "critical" || zone.materialCondition === "poor") {
    recommendations.push("Material has reached end of service life - replacement recommended");
  }

  if (zone.damageType.includes("hail") && zone.damageType.includes("wind")) {
    recommendations.push("Combined damage - likely qualifies for full replacement claim");
  }

  return {
    zone: zone.name,
    score,
    category,
    factors: {
      damageExtent: extentScore,
      materialCondition: conditionScore,
      structuralRisk: structuralScore,
      urgency: urgencyScore,
    },
    recommendations,
  };
}

/**
 * Calculate overall property severity from multiple zones
 */
export function calculateOverallSeverity(zones: DamageZone[]): OverallSeverity {
  const zoneScores = zones.map((zone) => calculateZoneSeverity(zone));

  // Calculate weighted average (zones with higher damage get more weight)
  const totalScore = zoneScores.reduce((sum, zs) => sum + zs.score, 0) / zoneScores.length;

  // Determine overall category
  let category: "minor" | "moderate" | "severe" | "catastrophic";
  if (totalScore >= 8.5) category = "catastrophic";
  else if (totalScore >= 6.5) category = "severe";
  else if (totalScore >= 4.0) category = "moderate";
  else category = "minor";

  // Identify critical zones (score >= 7.0)
  const criticalZones = zoneScores.filter((zs) => zs.score >= 7.0).map((zs) => zs.zone);

  // Prioritize repair order (highest score first, then by urgency)
  const estimatedRepairPriority = zoneScores
    .sort((a, b) => {
      // First sort by urgency
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aZone = zones.find((z) => z.name === a.zone)!;
      const bZone = zones.find((z) => z.name === b.zone)!;

      const urgencyDiff = urgencyOrder[bZone.urgency] - urgencyOrder[aZone.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;

      // Then by score
      return b.score - a.score;
    })
    .map((zs) => zs.zone);

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    category,
    zoneScores,
    criticalZones,
    estimatedRepairPriority,
  };
}

/**
 * Generate human-readable severity report
 */
export function generateSeverityReport(severity: OverallSeverity): string {
  const lines: string[] = [];

  lines.push(`OVERALL SEVERITY: ${severity.category.toUpperCase()}`);
  lines.push(`Total Score: ${severity.totalScore}/10`);
  lines.push("");

  lines.push("ZONE BREAKDOWN:");
  severity.zoneScores.forEach((zs) => {
    lines.push(`  ${zs.zone}: ${zs.score}/10 (${zs.category.toUpperCase()})`);
    lines.push(`    - Damage Extent: ${zs.factors.damageExtent}/10`);
    lines.push(`    - Material Condition: ${zs.factors.materialCondition}/10`);
    lines.push(`    - Structural Risk: ${zs.factors.structuralRisk}/10`);
    lines.push(`    - Urgency: ${zs.factors.urgency}/10`);

    if (zs.recommendations.length > 0) {
      lines.push(`    Recommendations:`);
      zs.recommendations.forEach((rec) => {
        lines.push(`      • ${rec}`);
      });
    }
    lines.push("");
  });

  if (severity.criticalZones.length > 0) {
    lines.push("CRITICAL ZONES:");
    severity.criticalZones.forEach((zone) => {
      lines.push(`  ⚠️  ${zone}`);
    });
    lines.push("");
  }

  lines.push("REPAIR PRIORITY ORDER:");
  severity.estimatedRepairPriority.forEach((zone, idx) => {
    lines.push(`  ${idx + 1}. ${zone}`);
  });

  return lines.join("\n");
}

/**
 * Map AI analysis results to damage zones
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function analysisToDamageZones(analysis: any): DamageZone[] {
  const zones: DamageZone[] = [];

  // Example zone extraction from AI results
  // In production, this would parse actual segmentation/classification data

  if (analysis.damageAnalysis?.hailDamage?.detected) {
    zones.push({
      name: "Roof - Main Field",
      damageType: ["hail"],
      coveragePercent: 60,
      materialCondition: "poor",
      structuralImpact: false,
      urgency: "high",
    });

    zones.push({
      name: "Roof - Ridge Cap",
      damageType: ["hail", "wind"],
      coveragePercent: 80,
      materialCondition: "poor",
      structuralImpact: true,
      urgency: "critical",
    });
  }

  if (analysis.damageAnalysis?.windDamage?.detected) {
    zones.push({
      name: "Roof - Edges/Eaves",
      damageType: ["wind"],
      coveragePercent: 40,
      materialCondition: "fair",
      structuralImpact: false,
      urgency: "medium",
    });
  }

  if (analysis.damageAnalysis?.structuralIssues?.detected) {
    zones.push({
      name: "Decking/Structure",
      damageType: ["structural"],
      coveragePercent: 20,
      materialCondition: "poor",
      structuralImpact: true,
      urgency: "critical",
    });
  }

  // Fallback: create generic zone if none detected
  if (zones.length === 0) {
    zones.push({
      name: "Overall Property",
      damageType: ["general"],
      coveragePercent: 10,
      materialCondition: "good",
      structuralImpact: false,
      urgency: "low",
    });
  }

  return zones;
}
