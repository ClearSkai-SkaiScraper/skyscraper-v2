/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARIZONA-SPECIFIC IRC/IBC CODE OVERLAY
 *
 * Sprint Item 4.5 — State-specific building code amendments and references.
 *
 * Arizona uses the 2018 IRC with state amendments.
 * Maricopa County and Flagstaff have additional local amendments.
 *
 * This module overlays state-specific requirements on top of the base
 * IRC_CODES from irc-codes.ts.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { IRCCodeEntry } from "@/lib/constants/irc-codes";

// ─── Arizona-Specific Amendments ─────────────────────────────────────────────

export const AZ_CODE_AMENDMENTS: Record<string, IRCCodeEntry> = {
  // ─── ROOFING ────────────────────────────────────────────────────────────────
  shingle_damage: {
    code: "AZ IRC R905.2.7 (2018 w/ amendments)",
    title: "Asphalt Shingle Application — Arizona",
    text: "Per Arizona-adopted 2018 IRC R905.2.7, asphalt shingles shall be applied per manufacturer installation instructions. In regions with design wind speeds of 130 mph or greater (Coconino County high-wind zones), enhanced fastening per ASTM D7158 Class H is required. All shingle replacement in Arizona must comply with current adopted code at time of repair, not original installation code.",
  },
  tile_damage: {
    code: "AZ IRC R905.3 (2018 w/ amendments)",
    title: "Clay & Concrete Tile — Arizona",
    text: "Arizona's desert climate subjects tile roofing to extreme thermal cycling (>100F diurnal range). Tile cracking from hail or thermal stress must be evaluated for both individual tile replacement and underlayment integrity per AZ-adopted IRC R905.3. Arizona requires mechanical attachment of all tiles in wind zones of 110 mph or greater.",
  },
  ventilation: {
    code: "AZ IRC R806.1 (2018)",
    title: "Ventilation Requirements — Arizona",
    text: "Arizona climate zones require enhanced attic ventilation to manage extreme heat loads. Cross ventilation of 1/150 net free area minimum. In Phoenix metro (Climate Zone 2B), radiant barrier or equivalent thermal performance is recommended per AZ energy code amendments.",
  },

  // ─── STUCCO (common in AZ) ──────────────────────────────────────────────
  stucco_damage: {
    code: "AZ IRC R703.7 (2018)",
    title: "Stucco/Portland Cement Plaster — Arizona",
    text: "Stucco is the predominant exterior wall finish in Arizona. Per AZ-adopted IRC R703.7, minimum 7/8 inch thickness over approved lath. Arizona's arid climate makes stucco particularly susceptible to hail impact damage, as lower moisture content reduces flexibility. Repair must match existing texture and integrate with weep screed drainage system.",
  },

  // ─── HVAC (critical in AZ) ──────────────────────────────────────────────
  hvac_damage: {
    code: "AZ IRC M1401 + ARS 44-1460",
    title: "HVAC Equipment — Arizona",
    text: "HVAC systems in Arizona operate under extreme conditions (115°F+ ambient). Condenser fin damage from hail reduces efficiency disproportionately in desert climate conditions. Arizona Revised Statutes (ARS 44-1460) requires licensed contractor for all HVAC work. Replacement units must meet current SEER2 efficiency minimums per AZ energy code.",
  },

  // ─── WINDOWS ────────────────────────────────────────────────────────────────
  window_damage: {
    code: "AZ IRC R308 + Energy Code",
    title: "Glazing & Windows — Arizona",
    text: "Arizona-adopted IRC R308 applies to all glazing. Windows in AZ Climate Zones 2B-5B must meet specific SHGC (Solar Heat Gain Coefficient) requirements. Storm damage requiring window replacement triggers compliance with current AZ energy code, which may require upgraded Low-E glazing with SHGC ≤0.25 in southern Arizona.",
  },

  // ─── MONSOON / WATER DAMAGE ─────────────────────────────────────────────
  water_damage: {
    code: "AZ IRC R703.1 + ARS 33-1361",
    title: "Weather-Resistant Envelope — Arizona Monsoon",
    text: "Arizona monsoon season produces wind-driven rain events that expose weather barrier deficiencies. Per AZ-adopted IRC R703.1, exterior wall envelope must prevent water accumulation. Arizona landlord-tenant act (ARS 33-1361) requires prompt remediation of water intrusion. Monsoon-related water damage frequently indicates pre-existing envelope failures exacerbated by storm events.",
  },

  // ─── FLAGSTAFF/NORTHERN AZ SPECIFIC ─────────────────────────────────────
  ice_barrier: {
    code: "AZ IRC R905.2.7.1 (Northern AZ)",
    title: "Ice Barrier — Northern Arizona",
    text: "Northern Arizona (Flagstaff, Prescott, Payson) is subject to ice formation conditions. Ice barriers extending from eave's edge to 24 inches inside exterior wall line are required per IRC R905.2.7.1 in these jurisdictions. Many Phoenix-metro roofs do NOT require ice barriers.",
  },

  // ─── FIRE ZONES ─────────────────────────────────────────────────────────
  fire_damage: {
    code: "AZ WUI Code + IBC Chapter 7A",
    title: "Wildland-Urban Interface — Arizona",
    text: "Portions of Coconino, Yavapai, and Gila counties are designated Wildland-Urban Interface (WUI) zones. Fire-damaged structures in WUI areas must be rebuilt with ignition-resistant materials per IBC Chapter 7A and local WUI ordinances. Class A fire-rated roofing is mandatory in these zones.",
  },

  // ─── GARAGE DOORS (wind code) ───────────────────────────────────────────
  garage_door_damage: {
    code: "AZ IRC R309.1 + ASTM E1996",
    title: "Garage Door Wind Resistance — Arizona",
    text: "In Arizona high-wind zones, replacement garage doors must meet ASTM E1996 impact resistance and TAS 201/202/203 pressure cycling requirements. Hail-dented panels that compromise structural reinforcement struts require full door replacement, not individual panel replacement.",
  },

  // ─── SOFT METALS (hail indicator) ───────────────────────────────────────
  soft_metal_damage: {
    code: "HAAG Methodology (AZ Application)",
    title: "Soft Metal Hail Indicators — Arizona",
    text: "In Arizona's arid climate, soft metal damage is particularly probative because the absence of regular precipitation means dents do not accumulate over time from routine weather. Fresh soft metal denting in Arizona is strong evidence of a specific hail event.",
  },
};

// ─── State Detection ─────────────────────────────────────────────────────────

/**
 * Check if a state/region should use Arizona-specific codes.
 */
export function isArizonaJurisdiction(state?: string | null): boolean {
  if (!state) return false;
  const s = state.toLowerCase().trim();
  return s === "az" || s === "arizona";
}

/**
 * Check if the property is in Northern Arizona (different climate requirements).
 */
export function isNorthernArizona(city?: string | null, zipCode?: string | null): boolean {
  if (!city && !zipCode) return false;

  const northernCities = [
    "flagstaff",
    "prescott",
    "prescott valley",
    "payson",
    "show low",
    "pinetop",
    "lakeside",
    "snowflake",
    "winslow",
    "williams",
    "sedona",
    "cottonwood",
    "camp verde",
  ];

  if (city && northernCities.includes(city.toLowerCase().trim())) return true;

  // Northern AZ zip code ranges
  if (zipCode) {
    const zip = parseInt(zipCode, 10);
    if (zip >= 86000 && zip <= 86099) return true; // Flagstaff area
    if (zip >= 86300 && zip <= 86399) return true; // Prescott area
    if (zip >= 85900 && zip <= 85999) return true; // Show Low / Payson area
  }

  return false;
}

/**
 * Get the appropriate IRC code entry, using Arizona amendments when applicable.
 * Falls back to base IRC codes if no AZ-specific amendment exists.
 */
export function getAZCode(codeKey: string, state?: string | null): IRCCodeEntry | null {
  if (!isArizonaJurisdiction(state)) return null;

  return AZ_CODE_AMENDMENTS[codeKey] || null;
}

/**
 * Get all applicable AZ code amendments for a set of damage types.
 */
export function getApplicableAZCodes(
  codeKeys: string[],
  state?: string | null
): Map<string, IRCCodeEntry> {
  const result = new Map<string, IRCCodeEntry>();
  if (!isArizonaJurisdiction(state)) return result;

  for (const key of codeKeys) {
    const azCode = AZ_CODE_AMENDMENTS[key];
    if (azCode) result.set(key, azCode);
  }

  return result;
}
