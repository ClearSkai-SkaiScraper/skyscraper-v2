/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONSOLIDATED IRC / IBC BUILDING CODE REFERENCE DATABASE
 *
 * Single source of truth for all building code references used across:
 *  - AI photo annotation (photo-annotate/route.ts)
 *  - Damage report generation (damage-report/route.ts)
 *  - Batch photo analysis
 *
 * Covers: Roofing (all types), Siding, Stucco, Windows, HVAC, Gutters,
 *         Garage Doors, Fencing/Decks, Soft Metals, Fire, Thermal, Interior
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─── Damage-Type → Code Category Mapping ────────────────────────────────────
// Maps AI detection labels to a code category key
export const IRC_CODE_MAP: Record<string, string> = {
  // ─── HAIL DAMAGE ────────────────────────────────────────────────────────────
  hail_impact: "shingle_damage",
  hail_bruise: "shingle_damage",
  hail_dent: "metal_damage",
  hail_spatter: "metal_damage",
  hail_crack: "tile_damage",
  hail_puncture: "membrane_damage",

  // ─── WIND DAMAGE ────────────────────────────────────────────────────────────
  wind_damage: "shingle_damage",
  wind_lifted: "shingle_damage",
  wind_torn: "shingle_damage",
  wind_creased: "shingle_damage",
  wind_displaced: "shingle_damage",

  // ─── ASPHALT SHINGLE SPECIFIC ───────────────────────────────────────────────
  missing_shingles: "shingle_damage",
  granule_loss: "shingle_damage",
  lifted_curled: "shingle_damage",
  cracked_broken: "shingle_damage",
  blistering: "shingle_damage",
  algae_staining: "shingle_damage",
  mechanical_damage: "shingle_damage",
  improper_nailing: "nail_pattern",
  exposed_nail: "nail_pattern",
  nail_pops: "nail_pattern",

  // ─── METAL ROOFING ──────────────────────────────────────────────────────────
  metal_dent: "metal_damage",
  metal_puncture: "metal_damage",
  metal_rust: "metal_damage",
  metal_corrosion: "metal_damage",
  seam_separation: "metal_damage",
  fastener_failure: "metal_damage",
  oil_canning: "metal_damage",
  coating_damage: "metal_damage",

  // ─── TILE ROOFING ───────────────────────────────────────────────────────────
  tile_crack: "tile_damage",
  tile_broken: "tile_damage",
  tile_displaced: "tile_damage",
  tile_missing: "tile_damage",
  tile_spalling: "tile_damage",
  tile_delamination: "tile_damage",
  mortar_deterioration: "tile_damage",

  // ─── FLAT/MEMBRANE ROOFING ──────────────────────────────────────────────────
  membrane_puncture: "membrane_damage",
  membrane_tear: "membrane_damage",
  membrane_blister: "membrane_damage",
  membrane_seam_failure: "membrane_damage",
  ponding_water: "drainage",
  alligatoring: "membrane_damage",

  // ─── WOOD SHAKE/SHINGLE ─────────────────────────────────────────────────────
  shake_split: "wood_damage",
  shake_rot: "wood_damage",
  shake_missing: "wood_damage",
  shake_warped: "wood_damage",
  shake_moss: "wood_damage",

  // ─── SLATE ──────────────────────────────────────────────────────────────────
  slate_crack: "slate_damage",
  slate_broken: "slate_damage",
  slate_displaced: "slate_damage",
  slate_delamination: "slate_damage",

  // ─── FLASHING & TRIM ────────────────────────────────────────────────────────
  flashing_damage: "flashing",
  flashing_lifted: "flashing",
  flashing_rust: "flashing",
  flashing_missing: "flashing",
  drip_edge_damage: "drip_edge",
  drip_edge_bent: "drip_edge",

  // ─── VENTILATION & PENETRATIONS ─────────────────────────────────────────────
  ventilation_damage: "ventilation",
  vent_boot_damage: "flashing",
  vent_dented: "ventilation",
  pipe_collar_damage: "flashing",
  skylight_damage: "skylight",
  chimney_damage: "chimney",

  // ─── UNDERLAYMENT & STRUCTURE ───────────────────────────────────────────────
  underlayment_exposed: "underlayment",
  decking_damage: "structural",
  structural_damage: "structural",
  sagging: "structural",

  // ─── ICE & WATER ────────────────────────────────────────────────────────────
  ice_dam: "ice_barrier",
  water_damage: "ice_barrier",
  water_intrusion: "water_damage",
  water_staining: "water_damage",
  mold_indicators: "water_damage",
  rot_damage: "water_damage",

  // ─── SIDING ─────────────────────────────────────────────────────────────────
  siding_crack: "siding_damage",
  siding_dent: "siding_damage",
  siding_hole: "siding_damage",
  siding_missing: "siding_damage",
  siding_warped: "siding_damage",
  siding_faded: "siding_damage",
  stucco_crack: "stucco_damage",
  stucco_spalling: "stucco_damage",
  stucco_damage: "stucco_damage",
  stucco_divot: "stucco_damage",
  stucco_delamination: "stucco_damage",

  // ─── PAINT / SURFACE DAMAGE ─────────────────────────────────────────────────
  paint_chipping: "siding_damage",
  paint_peeling: "water_damage",
  paint_spatter: "siding_damage",
  paint_bubbling: "water_damage",
  surface_spatter: "siding_damage",

  // ─── GARAGE DOOR ────────────────────────────────────────────────────────────
  garage_door_dent: "garage_door_damage",
  garage_door_panel: "garage_door_damage",
  garage_door_paint: "garage_door_damage",
  garage_door_seal: "garage_door_damage",

  // ─── MOISTURE / WOOD DAMAGE ─────────────────────────────────────────────────
  moisture_damage: "water_damage",
  wood_rot: "water_damage",
  material_warping: "water_damage",
  paint_failure: "water_damage",

  // ─── GUTTERS & DOWNSPOUTS ───────────────────────────────────────────────────
  gutter_dent: "gutter_damage",
  gutter_separation: "gutter_damage",
  gutter_sagging: "gutter_damage",
  gutter_clogged: "gutter_damage",
  downspout_damage: "gutter_damage",
  gutter_hanger_damage: "gutter_damage",
  downspout_dent: "gutter_damage",
  downspout_crushed: "gutter_damage",
  downspout_disconnected: "gutter_damage",

  // ─── HVAC / AC UNITS ────────────────────────────────────────────────────────
  ac_fin_damage: "hvac_damage",
  condenser_dent: "hvac_damage",
  hvac_panel_damage: "hvac_damage",
  ductwork_damage: "hvac_damage",

  // ─── SCREENS & WINDOWS ──────────────────────────────────────────────────────
  screen_tear: "screen_damage",
  screen_dent: "screen_damage",
  screen_frame_bent: "screen_damage",
  window_crack: "window_damage",
  window_seal_failure: "window_damage",
  window_trim_crack: "window_damage",
  window_trim_chip: "window_damage",
  trim_cracking: "siding_damage",
  trim_chipping: "siding_damage",
  trim_damage: "siding_damage",
  casing_damage: "window_damage",
  brick_mold_damage: "window_damage",

  // ─── FENCE & DECK ───────────────────────────────────────────────────────────
  fence_damage: "fence_damage",
  deck_damage: "deck_damage",

  // ─── MAILBOX / ELECTRICAL BOX / SOFT METALS ─────────────────────────────────
  mailbox_dent: "soft_metal_damage",
  mailbox_damage: "soft_metal_damage",
  electrical_box_dent: "soft_metal_damage",
  electrical_box_damage: "soft_metal_damage",
  meter_box_dent: "soft_metal_damage",
  meter_box_damage: "soft_metal_damage",
  light_fixture_damage: "soft_metal_damage",
  soft_metal_dent: "soft_metal_damage",
  soft_metal_damage: "soft_metal_damage",
  aluminum_dent: "soft_metal_damage",
  copper_dent: "soft_metal_damage",
  lead_dent: "soft_metal_damage",

  // ─── OUTDOOR FURNITURE / ITEMS ──────────────────────────────────────────────
  furniture_damage: "exterior_damage",
  wicker_damage: "exterior_damage",
  patio_furniture_damage: "exterior_damage",
  cushion_damage: "exterior_damage",
  umbrella_damage: "exterior_damage",
  planter_damage: "exterior_damage",

  // ─── AWNING / CANOPY ───────────────────────────────────────────────────────
  awning_damage: "exterior_damage",
  awning_tear: "exterior_damage",
  awning_frame_damage: "exterior_damage",
  canopy_damage: "exterior_damage",
  water_behind_awning: "water_damage",
  water_intrusion_awning: "water_damage",

  // ─── FIRE DAMAGE ────────────────────────────────────────────────────────────
  char_damage: "fire_damage",
  smoke_damage: "fire_damage",
  heat_warping: "fire_damage",
  melting: "fire_damage",

  // ─── THERMAL IMAGING PATTERNS ───────────────────────────────────────────────
  thermal_hotspot: "thermal_anomaly",
  thermal_moisture: "thermal_anomaly",
  thermal_insulation_gap: "thermal_anomaly",
  thermal_air_leak: "thermal_anomaly",

  // ─── INTERIOR ───────────────────────────────────────────────────────────────
  ceiling_crack: "interior_damage",
  ceiling_stain: "interior_damage",
  wall_crack: "interior_damage",
  floor_damage: "interior_damage",
  drywall_damage: "interior_damage",

  // ─── LEGACY MAPPINGS ────────────────────────────────────────────────────────
  structural: "structural",
};

// ─── Full Code Definitions with Text Descriptions ────────────────────────────
export interface IRCCodeEntry {
  code: string;
  title: string;
  text: string;
}

export const IRC_CODES: Record<string, IRCCodeEntry> = {
  // ─── ROOFING ────────────────────────────────────────────────────────────────
  shingle_damage: {
    code: "IRC R905.2.7",
    title: "Asphalt Shingle Application",
    text: "Asphalt shingles shall be applied per manufacturer installation instructions and ASTM D3462. Damage to shingles that compromises the weather barrier requires full replacement of affected courses to maintain code compliance.",
  },
  underlayment: {
    code: "IRC R905.1.1",
    title: "Underlayment Requirements",
    text: "Underlayment shall comply with ASTM D226, D4869, or D6757 for asphalt-saturated felt. Exposed or damaged underlayment requires immediate remediation to prevent moisture intrusion.",
  },
  flashing: {
    code: "IRC R905.2.8",
    title: "Flashing Requirements",
    text: "Flashings shall be installed at wall and roof intersections, changes in roof slope, and around roof openings. Damaged flashing compromises weather protection and must be replaced.",
  },
  drip_edge: {
    code: "IRC R905.2.8.5",
    title: "Drip Edge",
    text: "A drip edge shall be provided at eaves and rakes of shingle roofs. Bent or damaged drip edge allows water ingress behind the fascia board.",
  },
  ventilation: {
    code: "IRC R806.1",
    title: "Ventilation Required",
    text: "Enclosed attics and rafter spaces shall have cross ventilation with a minimum net free ventilating area of 1/150. Damaged ventilation components reduce attic airflow and accelerate moisture damage.",
  },
  ice_barrier: {
    code: "IRC R905.2.7.1",
    title: "Ice Barrier",
    text: "Ice barriers shall extend from the eave's edge to a point 24 inches inside the exterior wall line in areas subject to ice formation.",
  },
  nail_pattern: {
    code: "IRC R905.2.6",
    title: "Fastener Requirements",
    text: "Shingle fasteners shall be corrosion-resistant, minimum 12 gauge shank, 3/8 inch head diameter. Nail pops or improper nailing create uplift vulnerability.",
  },
  structural: {
    code: "IRC R802.1",
    title: "Roof Framing Requirements",
    text: "Roof framing members shall be designed per accepted engineering practice. Sagging or structural damage indicates load-bearing compromise requiring engineering assessment.",
  },
  drainage: {
    code: "IRC R903.4",
    title: "Roof Drainage",
    text: "Roof drainage systems shall be installed to collect and discharge roof drainage to an approved location. Ponding water indicates drainage failure.",
  },

  // ─── METAL ROOFING ──────────────────────────────────────────────────────────
  metal_damage: {
    code: "IRC R905.10",
    title: "Metal Roof Shingles/Panels",
    text: "Metal roof coverings shall comply with manufacturer installation requirements. Dents, punctures, or corrosion compromise the protective coating and weather barrier.",
  },

  // ─── TILE ROOFING ───────────────────────────────────────────────────────────
  tile_damage: {
    code: "IRC R905.3",
    title: "Clay & Concrete Tile",
    text: "Tile roofing shall be applied per ASTM C1167 (clay) or C1492 (concrete). Cracked or displaced tiles expose underlayment and create water intrusion pathways.",
  },

  // ─── MEMBRANE/FLAT ROOFING ──────────────────────────────────────────────────
  membrane_damage: {
    code: "IRC R905.9/R905.11-13",
    title: "Membrane Roofing Systems",
    text: "Membrane roofing shall be installed per manufacturer specifications. Punctures, blisters, or seam failures in membrane roofing allow direct water intrusion to the roof deck.",
  },

  // ─── WOOD ROOFING ───────────────────────────────────────────────────────────
  wood_damage: {
    code: "IRC R905.7-8",
    title: "Wood Shingles/Shakes",
    text: "Wood shingles/shakes shall comply with ASTM D3462. Split, rotted, or missing shakes expose the weather barrier and require replacement.",
  },

  // ─── SLATE ROOFING ──────────────────────────────────────────────────────────
  slate_damage: {
    code: "IRC R905.6",
    title: "Slate Shingles",
    text: "Slate roofing shall comply with ASTM C406. Cracked or displaced slates must be replaced to maintain the weather-tight envelope.",
  },

  // ─── SKYLIGHTS ──────────────────────────────────────────────────────────────
  skylight: {
    code: "IRC R308.6",
    title: "Skylights and Sloped Glazing",
    text: "Skylight glazing shall comply with safety glazing requirements. Damage to skylight assemblies creates water intrusion risk and potential safety hazard.",
  },

  // ─── CHIMNEY ────────────────────────────────────────────────────────────────
  chimney: {
    code: "IRC R1003",
    title: "Masonry Chimneys",
    text: "Chimney masonry and cap damage compromises fire safety and weather protection. Repairs must comply with IRC Chapter 10 masonry requirements.",
  },

  // ─── WATER/WEATHER DAMAGE ───────────────────────────────────────────────────
  water_damage: {
    code: "IRC R703.1",
    title: "Weather-Resistant Exterior Wall Envelope",
    text: "A weather-resistant exterior wall envelope shall prevent accumulation of water within the wall assembly. Evidence of water intrusion, staining, or mold indicates envelope failure requiring immediate remediation.",
  },

  // ─── SIDING ─────────────────────────────────────────────────────────────────
  siding_damage: {
    code: "IRC R703.3-11",
    title: "Wall Covering Standards",
    text: "Exterior wall coverings shall provide weather protection per IRC Chapter 7. Cracked, dented, or missing siding sections compromise the building envelope.",
  },
  stucco_damage: {
    code: "IRC R703.7",
    title: "Stucco/Portland Cement Plaster",
    text: "Stucco shall be a minimum 7/8 inch thick applied over approved lath per ASTM C926. Cracks, spalling, or divots allow moisture penetration behind the wall assembly.",
  },

  // ─── GARAGE DOOR ────────────────────────────────────────────────────────────
  garage_door_damage: {
    code: "IRC R309.1",
    title: "Garage Door Opening/Protection",
    text: "Garage door assemblies shall comply with structural and weather protection requirements. Panel dents or seal damage reduces wind resistance rating and weather protection.",
  },

  // ─── GUTTERS ────────────────────────────────────────────────────────────────
  gutter_damage: {
    code: "IRC R903.4",
    title: "Roof Drainage Systems",
    text: "Roof drainage systems shall collect and discharge water to approved locations. Dented, separated, or sagging gutters allow uncontrolled water discharge causing foundation and fascia damage.",
  },

  // ─── HVAC ───────────────────────────────────────────────────────────────────
  hvac_damage: {
    code: "IRC M1401",
    title: "HVAC General Requirements",
    text: "HVAC equipment shall be installed per manufacturer specifications. Fin damage to condenser units reduces cooling efficiency by 20-40%, requiring fin straightening or unit replacement.",
  },

  // ─── SCREENS & WINDOWS ──────────────────────────────────────────────────────
  screen_damage: {
    code: "IRC R303.8",
    title: "Required Window Openings",
    text: "Screens shall be provided for required ventilation openings. Torn or dented screens fail to provide insect protection per code requirements.",
  },
  window_damage: {
    code: "IRC R308",
    title: "Glazing Requirements",
    text: "Window glazing shall comply with safety and performance standards. Seal failure, cracked glazing, or damaged trim/casing compromises both energy performance and weather protection.",
  },

  // ─── FENCE & DECK ───────────────────────────────────────────────────────────
  fence_damage: {
    code: "IBC 1607",
    title: "Guards & Barriers",
    text: "Guards and barriers shall resist applicable loads per IBC Section 1607. Damaged fence/gate sections may fail to meet safety barrier requirements.",
  },
  deck_damage: {
    code: "IRC R507",
    title: "Exterior Decks",
    text: "Exterior decks shall comply with IRC Section R507 for structural adequacy and safety. Storm damage to decking, railings, or supports requires assessment for structural compliance.",
  },

  // ─── SOFT METALS / MAILBOX / ELECTRICAL ─────────────────────────────────────
  soft_metal_damage: {
    code: "IRC R903.2",
    title: "Soft Metal Damage (Hail Indicator)",
    text: "Dents and impacts on soft metals (aluminum, copper, lead) serve as primary hail damage indicators. Soft metal testing per HAAG methodology confirms storm impact trajectory and intensity.",
  },

  // ─── EXTERIOR ITEMS ─────────────────────────────────────────────────────────
  exterior_damage: {
    code: "IRC R301.2",
    title: "Exterior Property Damage",
    text: "Exterior components shall resist environmental loads per IRC Section R301.2. Storm damage to exterior property items documents event severity.",
  },

  // ─── FIRE DAMAGE ────────────────────────────────────────────────────────────
  fire_damage: {
    code: "IBC Chapter 7",
    title: "Fire and Smoke Protection",
    text: "Building assemblies shall maintain fire resistance ratings per IBC Chapter 7. Char damage, smoke staining, or heat warping indicate fire exposure requiring professional remediation.",
  },

  // ─── THERMAL ANALYSIS ───────────────────────────────────────────────────────
  thermal_anomaly: {
    code: "IRC N1102",
    title: "Building Thermal Envelope",
    text: "Building thermal envelope shall comply with IRC Chapter 11 energy requirements. Thermal anomalies indicate insulation gaps, air leaks, or moisture intrusion requiring investigation.",
  },

  // ─── INTERIOR DAMAGE ───────────────────────────────────────────────────────
  interior_damage: {
    code: "IRC R702",
    title: "Interior Covering",
    text: "Interior wall and ceiling coverings shall comply with IRC Section R702. Water stains, cracks, or drywall damage indicate structural movement or moisture intrusion from exterior envelope failure.",
  },
};

// ─── Damage Color System ─────────────────────────────────────────────────────
// Color-code annotations by damage category for visual clarity in reports
export interface DamageColor {
  /** PDF rgb() values (0-1) */
  r: number;
  g: number;
  b: number;
  /** Hex for web/UI use */
  hex: string;
  /** Human label */
  label: string;
}

export const DAMAGE_COLORS: Record<string, DamageColor> = {
  hail: { r: 0.85, g: 0.15, b: 0.15, hex: "#D92626", label: "Hail Impact" },
  wind: { r: 0.95, g: 0.55, b: 0.1, hex: "#F28C1A", label: "Wind Damage" },
  water: { r: 0.12, g: 0.46, b: 0.85, hex: "#1F75D9", label: "Water/Moisture" },
  fire: { r: 0.25, g: 0.25, b: 0.25, hex: "#404040", label: "Fire/Smoke" },
  structural: { r: 0.55, g: 0.2, b: 0.75, hex: "#8C33BF", label: "Structural" },
  collateral: { r: 0.85, g: 0.75, b: 0.1, hex: "#D9BF1A", label: "Collateral" },
  mechanical: { r: 0.1, g: 0.6, b: 0.5, hex: "#1A9980", label: "Mechanical" },
  general: { r: 0.5, g: 0.5, b: 0.5, hex: "#808080", label: "General" },
};

/** Map a damage type string to its color category */
export function getDamageColor(damageType: string | undefined): DamageColor {
  if (!damageType) return DAMAGE_COLORS.general;
  const dt = damageType.toLowerCase();

  if (dt.includes("hail") || dt.includes("impact") || dt.includes("dent") || dt.includes("spatter"))
    return DAMAGE_COLORS.hail;
  if (
    dt.includes("wind") ||
    dt.includes("lifted") ||
    dt.includes("torn") ||
    dt.includes("displaced") ||
    dt.includes("creased")
  )
    return DAMAGE_COLORS.wind;
  if (
    dt.includes("water") ||
    dt.includes("moisture") ||
    dt.includes("stain") ||
    dt.includes("mold") ||
    dt.includes("rot") ||
    dt.includes("leak")
  )
    return DAMAGE_COLORS.water;
  if (
    dt.includes("fire") ||
    dt.includes("char") ||
    dt.includes("smoke") ||
    dt.includes("melt") ||
    dt.includes("heat")
  )
    return DAMAGE_COLORS.fire;
  if (
    dt.includes("structural") ||
    dt.includes("sagging") ||
    dt.includes("decking") ||
    dt.includes("framing")
  )
    return DAMAGE_COLORS.structural;
  if (
    dt.includes("soft_metal") ||
    dt.includes("mailbox") ||
    dt.includes("electrical") ||
    dt.includes("meter") ||
    dt.includes("furniture") ||
    dt.includes("awning")
  )
    return DAMAGE_COLORS.collateral;
  if (
    dt.includes("hvac") ||
    dt.includes("ac_fin") ||
    dt.includes("condenser") ||
    dt.includes("ductwork")
  )
    return DAMAGE_COLORS.mechanical;

  return DAMAGE_COLORS.general;
}

/** Resolve IRC code key from a damage detection label */
export function resolveIRCCode(damageLabel: string): IRCCodeEntry | null {
  const key = IRC_CODE_MAP[damageLabel];
  if (key && IRC_CODES[key]) return IRC_CODES[key];
  // Direct lookup
  if (IRC_CODES[damageLabel]) return IRC_CODES[damageLabel];
  return null;
}

/** Resolve the code category key for a damage label */
export function resolveIRCCodeKey(damageLabel: string): string | null {
  return IRC_CODE_MAP[damageLabel] || (IRC_CODES[damageLabel] ? damageLabel : null);
}
