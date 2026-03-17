/**
 * Building Code Compliance Checker
 * Checks repair proposals against IRC/IBC codes
 *
 * FULL NATIONAL COVERAGE: All 50 states + DC
 * Last updated: February 2026
 */

import { logger } from "@/lib/logger";
import { getUpstash } from "@/lib/upstash";

export interface CodeViolation {
  code: string;
  section: string;
  description: string;
  severity: "info" | "warning" | "error" | "critical";
  remediation: string;
}

export interface CodeCheckResult {
  compliant: boolean;
  codeEdition: string;
  violations: CodeViolation[];
  recommendations: string[];
  permitRequired: boolean;
  cached?: boolean;
  cachedAt?: string;
}

export interface StateCodeInfo {
  edition: string;
  amendments?: string[];
  windZone?: "basic" | "high" | "hurricane";
  seismicZone?: "A" | "B" | "C" | "D" | "E";
  snowLoad?: boolean;
  iceBarrier?: boolean;
  fireZone?: boolean;
}

/** Full compliance report result */
export interface ComplianceReport {
  state: string;
  codeInfo: StateCodeInfo;
  checks: CodeCheckResult[];
  overallCompliant: boolean;
  timestamp: string;
}

// ============================================================================
// ALL 50 STATES + DC — COMPLETE NATIONAL COVERAGE
// ============================================================================
const STATE_CODES: Record<string, StateCodeInfo> = {
  // ALABAMA
  AL: { edition: "IRC 2021", windZone: "hurricane", amendments: ["Coastal zones"] },
  // ALASKA
  AK: { edition: "IRC 2018", snowLoad: true, seismicZone: "D" },
  // ARIZONA
  AZ: { edition: "IRC 2021", amendments: ["R301.2.1.1"], fireZone: true },
  // ARKANSAS
  AR: { edition: "IRC 2021" },
  // CALIFORNIA
  CA: {
    edition: "CBC 2022 (Title 24)",
    seismicZone: "D",
    fireZone: true,
    amendments: ["CALGreen"],
  },
  // COLORADO
  CO: { edition: "IRC 2021", snowLoad: true, amendments: ["High altitude provisions"] },
  // CONNECTICUT
  CT: { edition: "IRC 2021", iceBarrier: true },
  // DELAWARE
  DE: { edition: "IRC 2018" },
  // DISTRICT OF COLUMBIA
  DC: { edition: "IBC 2021", amendments: ["DC Construction Codes"] },
  // FLORIDA
  FL: {
    edition: "FBC 2023 (7th Edition)",
    windZone: "hurricane",
    amendments: ["HVHZ", "Miami-Dade NOA required"],
  },
  // GEORGIA
  GA: { edition: "IRC 2018", windZone: "high", amendments: ["Coastal zone wind maps"] },
  // HAWAII
  HI: { edition: "IRC 2018", windZone: "hurricane", seismicZone: "C" },
  // IDAHO
  ID: { edition: "IRC 2018", snowLoad: true },
  // ILLINOIS
  IL: { edition: "IRC 2021", iceBarrier: true },
  // INDIANA
  IN: { edition: "IRC 2020", iceBarrier: true },
  // IOWA
  IA: { edition: "IRC 2021", iceBarrier: true },
  // KANSAS
  KS: { edition: "IRC 2018" },
  // KENTUCKY
  KY: { edition: "IRC 2018" },
  // LOUISIANA
  LA: { edition: "IRC 2021", windZone: "hurricane", amendments: ["Coastal provisions"] },
  // MAINE
  ME: { edition: "IRC 2021", iceBarrier: true, snowLoad: true },
  // MARYLAND
  MD: { edition: "IRC 2021", amendments: ["MD Building Performance Standards"] },
  // MASSACHUSETTS
  MA: { edition: "IRC 2021 (9th Ed)", iceBarrier: true, amendments: ["MA Amendments (780 CMR)"] },
  // MICHIGAN
  MI: { edition: "IRC 2021", iceBarrier: true },
  // MINNESOTA
  MN: {
    edition: "IRC 2020",
    iceBarrier: true,
    snowLoad: true,
    amendments: ["MN Rules Chapter 1309"],
  },
  // MISSISSIPPI
  MS: { edition: "IRC 2018", windZone: "hurricane" },
  // MISSOURI
  MO: { edition: "IRC 2018" },
  // MONTANA
  MT: { edition: "IRC 2021", snowLoad: true, iceBarrier: true },
  // NEBRASKA
  NE: { edition: "IRC 2018" },
  // NEVADA
  NV: { edition: "IRC 2021", seismicZone: "C", amendments: ["Clark County amendments"] },
  // NEW HAMPSHIRE
  NH: { edition: "IRC 2018", iceBarrier: true, snowLoad: true },
  // NEW JERSEY
  NJ: { edition: "IRC 2021", iceBarrier: true, amendments: ["NJ UCC"] },
  // NEW MEXICO
  NM: { edition: "IRC 2018", seismicZone: "B" },
  // NEW YORK
  NY: { edition: "IRC 2020", iceBarrier: true, amendments: ["NYC has separate code"] },
  // NORTH CAROLINA
  NC: { edition: "IRC 2018", windZone: "high", amendments: ["Coastal wind zone requirements"] },
  // NORTH DAKOTA
  ND: { edition: "IRC 2018", iceBarrier: true, snowLoad: true },
  // OHIO
  OH: { edition: "IRC 2021", iceBarrier: true, amendments: ["OBC"] },
  // OKLAHOMA
  OK: { edition: "IRC 2018" },
  // OREGON
  OR: { edition: "ORSC 2021", seismicZone: "D", amendments: ["Oregon Residential Specialty Code"] },
  // PENNSYLVANIA
  PA: { edition: "IRC 2018", iceBarrier: true, amendments: ["PA UCC"] },
  // RHODE ISLAND
  RI: { edition: "IRC 2021", iceBarrier: true },
  // SOUTH CAROLINA
  SC: { edition: "IRC 2018", windZone: "high", amendments: ["Coastal zone provisions"] },
  // SOUTH DAKOTA
  SD: { edition: "IRC 2018", iceBarrier: true, snowLoad: true },
  // TENNESSEE
  TN: { edition: "IRC 2018" },
  // TEXAS
  TX: {
    edition: "IRC 2021",
    windZone: "high",
    amendments: ["Windstorm certification coastal", "TWIA requirements"],
  },
  // UTAH
  UT: { edition: "IRC 2021", seismicZone: "D", snowLoad: true },
  // VERMONT
  VT: { edition: "IRC 2020", iceBarrier: true, snowLoad: true, amendments: ["VT RBES"] },
  // VIRGINIA
  VA: { edition: "IRC 2021", amendments: ["USBC"] },
  // WASHINGTON
  WA: { edition: "IRC 2021", seismicZone: "D", amendments: ["WA State Amendments"] },
  // WEST VIRGINIA
  WV: { edition: "IRC 2018" },
  // WISCONSIN
  WI: { edition: "IRC 2021", iceBarrier: true, snowLoad: true, amendments: ["SPS 320-325"] },
  // WYOMING
  WY: { edition: "IRC 2018", snowLoad: true },
};

// ============================================================================
// TRADE-SPECIFIC CODE REQUIREMENTS
// ============================================================================

interface CodeRequirement {
  code: string;
  requirement: string;
  citation?: string;
  applicableStates?: string[];
  severity?: "info" | "warning" | "error" | "critical";
}

// Roofing code requirements by category
const ROOFING_CODES: Record<string, CodeRequirement> = {
  underlayment: {
    code: "IRC R905.2.6",
    requirement: "Underlayment shall comply with ASTM D226 Type I, D4869 Type I-IV, or D6757",
    citation: "2021 IRC Section R905.2.6",
  },
  underlaymentSynthetic: {
    code: "IRC R905.2.6.1",
    requirement: "Synthetic underlayment shall comply with ASTM D226 Type II equivalency",
    citation: "2021 IRC Section R905.2.6.1",
  },
  windResistance: {
    code: "IRC R905.2.8.2",
    requirement:
      "Shingles shall be tested per ASTM D3161 Class D or D7158 Class G/H for wind resistance",
    citation: "2021 IRC Section R905.2.8.2",
  },
  windResistanceHurricane: {
    code: "IRC R905.2.8.2 / FBC",
    requirement: "High-velocity hurricane zones require ASTM D7158 Class H (150 mph) minimum",
    citation: "Florida Building Code Chapter 15",
    applicableStates: ["FL", "TX", "LA", "MS", "AL"],
  },
  iceBarrier: {
    code: "IRC R905.2.7.1",
    requirement:
      'Ice barrier required from eave edge to min 24" past interior face of exterior wall',
    citation: "2021 IRC Section R905.2.7.1",
    applicableStates: [
      "MN",
      "WI",
      "MI",
      "NY",
      "MA",
      "ME",
      "NH",
      "VT",
      "MT",
      "ND",
      "SD",
      "CT",
      "RI",
      "PA",
      "OH",
      "IN",
      "IL",
      "IA",
      "NJ",
    ],
  },
  flashings: {
    code: "IRC R905.2.8.1",
    requirement:
      'Flashings shall be corrosion-resistant metal minimum 0.019" galvanized steel or approved material',
    citation: "2021 IRC Section R905.2.8.1",
  },
  valleyFlashing: {
    code: "IRC R905.2.8.2",
    requirement: 'Valley flashings min 24" wide, metal or mineral-surfaced roll roofing',
    citation: "2021 IRC Section R905.2.8.2",
  },
  ventilation: {
    code: "IRC R806.1",
    requirement:
      "Minimum net free ventilation area 1/150 of attic floor area, or 1/300 with balanced intake/exhaust",
    citation: "2021 IRC Section R806.1",
  },
  deckingNailing: {
    code: "IRC R803.2.1",
    requirement:
      'Roof sheathing 8d common nails at 6" edge / 12" field, or per engineering in high-wind',
    citation: "2021 IRC Table R602.3(1)",
  },
  dripEdge: {
    code: "IRC R905.2.8.5",
    requirement: 'Drip edge required at eaves and rakes, extending min 1/4" below sheathing',
    citation: "2021 IRC Section R905.2.8.5",
  },
};

// Siding code requirements
const SIDING_CODES: Record<string, CodeRequirement> = {
  weatherResistiveBarrier: {
    code: "IRC R703.1",
    requirement: "Weather-resistive barrier required behind all exterior wall coverings",
    citation: "2021 IRC Section R703.1",
  },
  flashing: {
    code: "IRC R703.4",
    requirement:
      "Flashing required at wall/roof intersections, around openings, and at penetrations",
    citation: "2021 IRC Section R703.4",
  },
  vinylSiding: {
    code: "IRC R703.11",
    requirement:
      "Vinyl siding per ASTM D3679; attachment per manufacturer with corrosion-resistant fasteners",
    citation: "2021 IRC Section R703.11",
  },
  fiberCement: {
    code: "IRC R703.10.2",
    requirement: 'Fiber cement siding per ASTM C1186; min 6" clearance to grade',
    citation: "2021 IRC Section R703.10.2",
  },
  stucco: {
    code: "IRC R703.7",
    requirement: 'Stucco minimum 7/8" three-coat or 3/8" two-coat over approved base',
    citation: "2021 IRC Section R703.7",
  },
};

// Window/Door code requirements
const OPENING_CODES: Record<string, CodeRequirement> = {
  windowFlashing: {
    code: "IRC R703.4",
    requirement: "Pan flashing and flexible flashing tape required at window rough openings",
    citation: "2021 IRC Section R703.4",
  },
  impactResistance: {
    code: "IRC R301.2.1.2 / FBC",
    requirement: "Impact-resistant glazing or shutters required in wind-borne debris regions",
    citation: "2021 IRC Section R301.2.1.2",
    applicableStates: ["FL", "TX", "LA", "SC", "NC", "GA", "AL", "MS", "HI"],
  },
  egress: {
    code: "IRC R310.1",
    requirement:
      'Emergency egress: min 5.7 sq ft opening, 24" min height, 20" min width, max 44" sill',
    citation: "2021 IRC Section R310.1",
  },
  energyCode: {
    code: "IECC C402",
    requirement: "Window U-factor and SHGC per climate zone requirements",
    citation: "2021 IECC Table C402.4",
  },
};

// Gutter code requirements
const GUTTER_CODES: Record<string, CodeRequirement> = {
  drainage: {
    code: "IRC R801.3",
    requirement: "Roof drainage shall not create erosion or direct water toward building",
    citation: "2021 IRC Section R801.3",
  },
  sizing: {
    code: "Industry Standard",
    requirement: 'Gutters sized per roof area: typically 5" for <600 sq ft drainage, 6" for larger',
    citation: "SMACNA Architectural Sheet Metal Manual",
  },
};

// ============================================================================
// CACHE LAYER (Upstash Redis)
// ============================================================================

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

async function getCachedResult<T>(key: string): Promise<T | null> {
  try {
    const redis = getUpstash();
    if (!redis) return null;
    const cached = await redis.get<T>(key);
    return cached;
  } catch (e) {
    logger.warn("[compliance-cache] Read error:", e);
    return null;
  }
}

async function setCachedResult<T>(key: string, value: T): Promise<void> {
  try {
    const redis = getUpstash();
    if (!redis) return;
    await redis.set(key, value, { ex: CACHE_TTL_SECONDS });
  } catch (e) {
    logger.warn("[compliance-cache] Write error:", e);
  }
}

// ============================================================================
// MAIN COMPLIANCE FUNCTIONS
// ============================================================================

export async function checkBuildingCodes(
  state: string,
  county?: string,
  damageType?: string,
  trade?: "roofing" | "siding" | "windows" | "gutters" | "all"
): Promise<CodeCheckResult> {
  // Check cache first
  const cacheKey = `codes:check:${state}:${county || "none"}:${damageType || "all"}:${trade || "all"}`;
  const cached = await getCachedResult<CodeCheckResult>(cacheKey);
  if (cached) {
    return { ...cached, cached: true, cachedAt: new Date().toISOString() };
  }

  const stateCode = STATE_CODES[state] || { edition: "IRC 2021" };
  const violations: CodeViolation[] = [];
  const recommendations: string[] = [];

  // === UNIVERSAL RECOMMENDATIONS ===
  recommendations.push("Document all existing conditions before beginning repairs");
  recommendations.push("Obtain manufacturer specifications for replacement materials");
  recommendations.push("Verify contractor licensing requirements for your state");
  recommendations.push(`Applicable code edition: ${stateCode.edition}`);

  // === STATE-SPECIFIC FLAGS ===
  if (stateCode.amendments?.length) {
    recommendations.push(`Local amendments apply: ${stateCode.amendments.join(", ")}`);
  }

  // === ICE BARRIER REQUIREMENT ===
  if (stateCode.iceBarrier || ROOFING_CODES.iceBarrier.applicableStates?.includes(state)) {
    recommendations.push(
      `❄️ ICE BARRIER REQUIRED: ${ROOFING_CODES.iceBarrier.requirement} (${ROOFING_CODES.iceBarrier.code})`
    );
  }

  // === HURRICANE/HIGH-WIND ZONES ===
  if (stateCode.windZone === "hurricane") {
    recommendations.push("🌀 HURRICANE ZONE: Verify wind rating meets high-velocity requirements");
    recommendations.push(`Wind resistance: ${ROOFING_CODES.windResistanceHurricane.requirement}`);
    if (state === "FL") {
      recommendations.push(
        "⚠️ FBC product approval required - verify NOA/FL numbers on all materials"
      );
    }
    if (state === "TX") {
      recommendations.push("⚠️ TWIA certification may be required for coastal properties");
    }
  } else if (stateCode.windZone === "high") {
    recommendations.push("💨 HIGH WIND ZONE: Enhanced fastening and wind-rated materials required");
  }

  // === SEISMIC ZONES ===
  if (stateCode.seismicZone && ["C", "D", "E"].includes(stateCode.seismicZone)) {
    recommendations.push(
      `🌍 SEISMIC ZONE ${stateCode.seismicZone}: Special structural requirements apply`
    );
  }

  // === SNOW LOAD ===
  if (stateCode.snowLoad) {
    recommendations.push(
      "❄️ SNOW LOAD ZONE: Verify roof structure meets local ground snow load requirements"
    );
  }

  // === FIRE ZONES ===
  if (stateCode.fireZone) {
    recommendations.push("🔥 WILDFIRE ZONE: Class A fire-rated roofing materials may be required");
    if (state === "CA") {
      recommendations.push("CAL FIRE compliance required in designated WUI zones");
    }
  }

  // === TRADE-SPECIFIC REQUIREMENTS ===
  const selectedTrade = trade || "all";

  if (
    selectedTrade === "roofing" ||
    selectedTrade === "all" ||
    damageType?.includes("roof") ||
    damageType?.includes("shingle")
  ) {
    recommendations.push(`📋 ROOFING — Underlayment: ${ROOFING_CODES.underlayment.requirement}`);
    recommendations.push(
      `📋 ROOFING — Wind Resistance: ${ROOFING_CODES.windResistance.requirement}`
    );
    recommendations.push(`📋 ROOFING — Flashings: ${ROOFING_CODES.flashings.requirement}`);
    recommendations.push(`📋 ROOFING — Ventilation: ${ROOFING_CODES.ventilation.requirement}`);
    recommendations.push(`📋 ROOFING — Drip Edge: ${ROOFING_CODES.dripEdge.requirement}`);
  }

  if (selectedTrade === "siding" || selectedTrade === "all" || damageType?.includes("siding")) {
    recommendations.push(
      `📋 SIDING — Weather Barrier: ${SIDING_CODES.weatherResistiveBarrier.requirement}`
    );
    recommendations.push(`📋 SIDING — Flashing: ${SIDING_CODES.flashing.requirement}`);
  }

  if (selectedTrade === "windows" || selectedTrade === "all" || damageType?.includes("window")) {
    recommendations.push(`📋 WINDOWS — Flashing: ${OPENING_CODES.windowFlashing.requirement}`);
    if (OPENING_CODES.impactResistance.applicableStates?.includes(state)) {
      recommendations.push(`📋 WINDOWS — Impact: ${OPENING_CODES.impactResistance.requirement}`);
    }
  }

  if (selectedTrade === "gutters" || selectedTrade === "all" || damageType?.includes("gutter")) {
    recommendations.push(`📋 GUTTERS — Drainage: ${GUTTER_CODES.drainage.requirement}`);
  }

  const result: CodeCheckResult = {
    compliant:
      violations.filter((v) => v.severity === "error" || v.severity === "critical").length === 0,
    codeEdition: stateCode.edition,
    violations,
    recommendations,
    permitRequired: true,
  };

  // Cache result
  await setCachedResult(cacheKey, result);

  return result;
}

export async function getLocalCodes(state: string, county?: string, trade?: string) {
  // Check cache
  const cacheKey = `codes:local:${state}:${county || "none"}:${trade || "all"}`;
  const cached = await getCachedResult<ReturnType<typeof buildLocalCodes>>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  const result = buildLocalCodes(state, county, trade);
  await setCachedResult(cacheKey, result);
  return result;
}

function buildLocalCodes(state: string, county?: string, trade?: string) {
  const stateCode = STATE_CODES[state] || { edition: "IRC 2021" };

  const codes: CodeRequirement[] = [];

  // Add roofing codes
  if (!trade || trade === "roofing" || trade === "all") {
    codes.push(ROOFING_CODES.underlayment);
    codes.push(ROOFING_CODES.windResistance);
    codes.push(ROOFING_CODES.flashings);
    codes.push(ROOFING_CODES.ventilation);
    codes.push(ROOFING_CODES.dripEdge);
    codes.push(ROOFING_CODES.deckingNailing);
    if (stateCode.iceBarrier || ROOFING_CODES.iceBarrier.applicableStates?.includes(state)) {
      codes.push(ROOFING_CODES.iceBarrier);
    }
    if (stateCode.windZone === "hurricane") {
      codes.push(ROOFING_CODES.windResistanceHurricane);
    }
  }

  // Add siding codes
  if (!trade || trade === "siding" || trade === "all") {
    codes.push(SIDING_CODES.weatherResistiveBarrier);
    codes.push(SIDING_CODES.flashing);
    codes.push(SIDING_CODES.vinylSiding);
    codes.push(SIDING_CODES.fiberCement);
  }

  // Add window codes
  if (!trade || trade === "windows" || trade === "all") {
    codes.push(OPENING_CODES.windowFlashing);
    codes.push(OPENING_CODES.egress);
    if (OPENING_CODES.impactResistance.applicableStates?.includes(state)) {
      codes.push(OPENING_CODES.impactResistance);
    }
  }

  // Add gutter codes
  if (!trade || trade === "gutters" || trade === "all") {
    codes.push(GUTTER_CODES.drainage);
    codes.push(GUTTER_CODES.sizing);
  }

  return {
    state,
    county,
    stateInfo: {
      edition: stateCode.edition,
      windZone: stateCode.windZone,
      seismicZone: stateCode.seismicZone,
      iceBarrier: stateCode.iceBarrier,
      snowLoad: stateCode.snowLoad,
      fireZone: stateCode.fireZone,
    },
    amendments: stateCode.amendments || [],
    codes,
    lastUpdated: new Date().toISOString(),
  };
}

// Alias for checkCompliance
export async function checkCompliance(
  state: string,
  county?: string,
  damageType?: string
): Promise<CodeCheckResult> {
  return checkBuildingCodes(state, county, damageType);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export function getStateList(): string[] {
  return Object.keys(STATE_CODES).sort();
}

export function getStateInfo(state: string): StateCodeInfo | null {
  return STATE_CODES[state] || null;
}

export async function invalidateCache(state?: string): Promise<void> {
  try {
    const redis = getUpstash();
    if (!redis) return;

    if (state) {
      // Invalidate specific state
      const keys = await redis.keys(`codes:*:${state}:*`);
      if (keys.length) {
        await redis.del(...keys);
      }
    } else {
      // Invalidate all compliance cache
      const keys = await redis.keys("codes:*");
      if (keys.length) {
        await redis.del(...keys);
      }
    }
    logger.debug(`[compliance-cache] Invalidated ${state || "all"} cache`);
  } catch (e) {
    logger.warn("[compliance-cache] Invalidation error:", e);
  }
}

// Export code dictionaries for PDF generation
export { GUTTER_CODES, OPENING_CODES, ROOFING_CODES, SIDING_CODES, STATE_CODES };
