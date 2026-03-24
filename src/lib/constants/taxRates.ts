/**
 * CANONICAL TAX RATE CONSTANTS — Arizona
 * ─────────────────────────────────────────────────────────
 * Single source of truth for all Arizona city/county tax rates.
 * Every estimator, invoice, export panel, and report generator
 * MUST reference this file instead of hardcoding rates.
 *
 * Rates sourced from Arizona Dept. of Revenue (2024-Q4 combined
 * state + county + city privilege tax rates for prime contracting).
 *
 * NOTE: Keep rates as DECIMALS (e.g., 0.089 = 8.9%).
 * The helper functions convert to percentages where needed.
 *
 * @see MASTER_HARDENING_AUDIT.md — EST-004
 */

// ─── Arizona State Base ──────────────────────────────────

/** AZ Transaction Privilege Tax — state portion only */
export const AZ_STATE_TAX_RATE = 0.056; // 5.6%

/** Default combined rate when city cannot be resolved */
export const AZ_DEFAULT_TAX_RATE = 0.089; // 8.9% (Phoenix-area average)

// ─── City-Level Combined Rates ───────────────────────────
// Combined = State (5.6%) + County + City

export interface CityTaxRate {
  /** City name — Title Case (e.g., "Phoenix") */
  city: string;
  /** Combined tax rate as decimal (e.g., 0.089) */
  rate: number;
  /** County name */
  county: string;
}

/**
 * Authoritative city tax rate table.
 * When these conflict with inline values elsewhere, THIS wins.
 */
export const AZ_CITY_TAX_RATES: CityTaxRate[] = [
  // ── Phoenix Metro (Maricopa County) ──
  { city: "Phoenix", rate: 0.089, county: "Maricopa" },
  { city: "Scottsdale", rate: 0.0855, county: "Maricopa" },
  { city: "Tempe", rate: 0.088, county: "Maricopa" },
  { city: "Mesa", rate: 0.092, county: "Maricopa" },
  { city: "Chandler", rate: 0.088, county: "Maricopa" },
  { city: "Gilbert", rate: 0.082, county: "Maricopa" },
  { city: "Glendale", rate: 0.0905, county: "Maricopa" },
  { city: "Peoria", rate: 0.0895, county: "Maricopa" },
  { city: "Surprise", rate: 0.088, county: "Maricopa" },
  { city: "Goodyear", rate: 0.089, county: "Maricopa" },
  { city: "Avondale", rate: 0.092, county: "Maricopa" },
  { city: "Buckeye", rate: 0.089, county: "Maricopa" },
  { city: "Queen Creek", rate: 0.088, county: "Maricopa" },
  { city: "Fountain Hills", rate: 0.089, county: "Maricopa" },
  { city: "Cave Creek", rate: 0.089, county: "Maricopa" },

  // ── Tucson Area (Pima County) ──
  { city: "Tucson", rate: 0.087, county: "Pima" },
  { city: "Oro Valley", rate: 0.082, county: "Pima" },
  { city: "Marana", rate: 0.087, county: "Pima" },

  // ── Northern Arizona (Yavapai County) ──
  { city: "Prescott", rate: 0.0918, county: "Yavapai" },
  { city: "Prescott Valley", rate: 0.0918, county: "Yavapai" },
  { city: "Chino Valley", rate: 0.0835, county: "Yavapai" },
  { city: "Sedona", rate: 0.0895, county: "Yavapai" },
  { city: "Cottonwood", rate: 0.0943, county: "Yavapai" },
  { city: "Verde Valley", rate: 0.086, county: "Yavapai" },
  { city: "Camp Verde", rate: 0.088, county: "Yavapai" },

  // ── Northern Arizona (Coconino County) ──
  { city: "Flagstaff", rate: 0.0916, county: "Coconino" },
];

// ─── Lookup Helpers ──────────────────────────────────────

/** Lookup map for O(1) city resolution */
const _cityMap = new Map<string, CityTaxRate>(
  AZ_CITY_TAX_RATES.map((c) => [c.city.toLowerCase(), c])
);

/**
 * Get the combined tax rate for a city (as decimal).
 * Returns the default AZ rate if city is not found.
 */
export function getTaxRateForCity(city: string): number {
  const entry = _cityMap.get(city.toLowerCase().trim());
  return entry?.rate ?? AZ_DEFAULT_TAX_RATE;
}

/**
 * Get city tax rate as a user-facing percentage number (e.g., 8.9).
 * Use in UI inputs and display labels.
 */
export function getTaxRatePercent(city: string): number {
  return +(getTaxRateForCity(city) * 100).toFixed(2);
}

/**
 * Build a dropdown-ready array of cities with display labels.
 * Sorted alphabetically.
 */
export function getCityTaxOptions(): Array<{
  value: string;
  label: string;
  rate: number;
}> {
  return AZ_CITY_TAX_RATES.map((c) => ({
    value: c.city,
    label: c.city,
    rate: +(c.rate * 100).toFixed(2),
  })).sort((a, b) => a.label.localeCompare(b.label));
}
