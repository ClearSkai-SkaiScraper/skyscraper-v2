/**
 * PHASE 44: STORM SEVERITY SCORING ENGINE
 * 
 * Weighted algorithm to calculate comprehensive storm severity score (0-10)
 * 
 * Factors:
 * - Hail size (40% weight)
 * - Wind speed (30% weight)
 * - Storm proximity (20% weight)
 * - Storm duration (10% weight)
 * 
 * Output: 0.0-10.0 severity score + risk category
 */


// ===========================
// TYPE DEFINITIONS
// ===========================

export interface SeverityBreakdown {
  hailScore: number; // 0-10
  windScore: number; // 0-10
  proximityScore: number; // 0-10
  durationScore: number; // 0-10
  weightedTotal: number; // 0-10
  category: "minimal" | "minor" | "moderate" | "severe" | "extreme";
  recommendation: string;
}

// ===========================
// 1. HAIL SIZE SCORING
// ===========================

/**
 * Score based on hail diameter (inches)
 * 
 * Scale:
 * - 0.0-0.5": 1.0 (Pea size, minimal)
 * - 0.5-0.75": 2.5 (Penny size, minor)
 * - 0.75-1.0": 4.0 (Nickel/Quarter, moderate)
 * - 1.0-1.75": 6.0 (Golf ball, severe)
 * - 1.75-2.75": 8.0 (Tennis ball, very severe)
 * - 2.75+": 10.0 (Baseball+, extreme)
 */
export function scoreHailSize(hailInches: number): number {
  if (hailInches === 0) return 0;
  if (hailInches < 0.5) return 1.0;
  if (hailInches < 0.75) return 2.5;
  if (hailInches < 1.0) return 4.0;
  if (hailInches < 1.75) return 6.0;
  if (hailInches < 2.75) return 8.0;
  return 10.0;
}

// ===========================
// 2. WIND SPEED SCORING
// ===========================

/**
 * Score based on wind speed (MPH)
 * 
 * Scale:
 * - 0-30 MPH: 1.0 (Light breeze)
 * - 30-40 MPH: 3.0 (Strong winds)
 * - 40-58 MPH: 5.0 (Damaging winds)
 * - 58-74 MPH: 7.0 (Severe thunderstorm)
 * - 74-95 MPH: 8.5 (EF0 tornado)
 * - 95+ MPH: 10.0 (EF1+ tornado)
 */
export function scoreWindSpeed(windMPH: number): number {
  if (windMPH === 0) return 0;
  if (windMPH < 30) return 1.0;
  if (windMPH < 40) return 3.0;
  if (windMPH < 58) return 5.0;
  if (windMPH < 74) return 7.0;
  if (windMPH < 95) return 8.5;
  return 10.0;
}

// ===========================
// 3. PROXIMITY SCORING
// ===========================

/**
 * Score based on distance from property (miles)
 * 
 * Scale:
 * - 0-2 miles: 10.0 (Direct hit)
 * - 2-5 miles: 8.0 (Very close)
 * - 5-10 miles: 6.0 (Close)
 * - 10-20 miles: 4.0 (Nearby)
 * - 20-30 miles: 2.0 (Distant)
 * - 30+ miles: 0.5 (Very distant)
 */
export function scoreProximity(distanceMiles: number): number {
  if (distanceMiles <= 2) return 10.0;
  if (distanceMiles <= 5) return 8.0;
  if (distanceMiles <= 10) return 6.0;
  if (distanceMiles <= 20) return 4.0;
  if (distanceMiles <= 30) return 2.0;
  return 0.5;
}

// ===========================
// 4. DURATION SCORING
// ===========================

/**
 * Score based on storm duration (minutes)
 * 
 * Scale:
 * - 0-15 min: 2.0 (Brief)
 * - 15-30 min: 4.0 (Moderate)
 * - 30-60 min: 7.0 (Extended)
 * - 60+ min: 10.0 (Prolonged)
 */
export function scoreDuration(durationMinutes: number): number {
  if (durationMinutes === 0) return 0;
  if (durationMinutes < 15) return 2.0;
  if (durationMinutes < 30) return 4.0;
  if (durationMinutes < 60) return 7.0;
  return 10.0;
}

// ===========================
// 5. WEIGHTED SEVERITY CALCULATION
// ===========================

/**
 * Calculate weighted severity score
 * 
 * Weights:
 * - Hail: 40%
 * - Wind: 30%
 * - Proximity: 20%
 * - Duration: 10%
 */
export function calculateSeverityScore(
  hailInches: number,
  windMPH: number,
  distanceMiles: number,
  durationMinutes: number
): SeverityBreakdown {
  // Calculate individual scores
  const hailScore = scoreHailSize(hailInches);
  const windScore = scoreWindSpeed(windMPH);
  const proximityScore = scoreProximity(distanceMiles);
  const durationScore = scoreDuration(durationMinutes);

  // Apply weights
  const weightedTotal =
    hailScore * 0.4 +
    windScore * 0.3 +
    proximityScore * 0.2 +
    durationScore * 0.1;

  // Determine category
  let category: "minimal" | "minor" | "moderate" | "severe" | "extreme";
  let recommendation: string;

  if (weightedTotal >= 8.0) {
    category = "extreme";
    recommendation = "Immediate roof inspection required. Likely total replacement needed. File insurance claim urgently.";
  } else if (weightedTotal >= 6.0) {
    category = "severe";
    recommendation = "Schedule professional inspection within 48 hours. Significant damage likely. Prepare for insurance claim.";
  } else if (weightedTotal >= 4.0) {
    category = "moderate";
    recommendation = "Inspect roof within 1 week. Moderate damage possible. Document all findings for potential claim.";
  } else if (weightedTotal >= 2.0) {
    category = "minor";
    recommendation = "Monitor roof for visible damage. Minor repairs may be needed. Consider inspection if issues arise.";
  } else {
    category = "minimal";
    recommendation = "Minimal storm impact. Routine inspection recommended within normal schedule.";
  }

  return {
    hailScore,
    windScore,
    proximityScore,
    durationScore,
    weightedTotal: parseFloat(weightedTotal.toFixed(2)),
    category,
    recommendation
  };
}

// ===========================
// 6. AGGREGATE STORM SCORING
// ===========================

/**
 * Calculate severity for multiple storm events
 * Returns highest severity + combined impact analysis
 */
export function aggregateStormSeverity(
  storms: Array<{
    hailInches: number;
    windMPH: number;
    distanceMiles: number;
    durationMinutes: number;
  }>
): {
  maxSeverity: SeverityBreakdown;
  avgSeverity: number;
  totalStorms: number;
  criticalStorms: number;
} {
  if (storms.length === 0) {
    return {
      maxSeverity: {
        hailScore: 0,
        windScore: 0,
        proximityScore: 0,
        durationScore: 0,
        weightedTotal: 0,
        category: "minimal",
        recommendation: "No storms detected in area"
      },
      avgSeverity: 0,
      totalStorms: 0,
      criticalStorms: 0
    };
  }

  const severities = storms.map(s =>
    calculateSeverityScore(s.hailInches, s.windMPH, s.distanceMiles, s.durationMinutes)
  );

  const maxSeverity = severities.reduce((max, curr) =>
    curr.weightedTotal > max.weightedTotal ? curr : max
  );

  const avgSeverity =
    severities.reduce((sum, s) => sum + s.weightedTotal, 0) / severities.length;

  const criticalStorms = severities.filter(s => s.weightedTotal >= 6.0).length;

  return {
    maxSeverity,
    avgSeverity: parseFloat(avgSeverity.toFixed(2)),
    totalStorms: storms.length,
    criticalStorms
  };
}
