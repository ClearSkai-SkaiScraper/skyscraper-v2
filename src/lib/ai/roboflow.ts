/**
 * Roboflow YOLO Integration for COMPREHENSIVE Damage Detection
 *
 * Uses Roboflow's hosted inference API with MULTIPLE pre-trained YOLO models
 * for precise bounding box detection across ALL property damage types.
 *
 * SUPPORTED DETECTION CATEGORIES:
 * ══════════════════════════════════════════════════════════════════════════════
 * 🏠 ROOFING:        Hail, wind, missing shingles, granule loss, lifted tiles
 * 🚪 DOORS:          Door damage, door frames, hinges, handles
 * 🪟 WINDOWS:        Window detection, broken glass, frame damage, screens
 * 🧱 WALLS/CRACKS:   Crack detection, structural cracks, foundation cracks
 * 💧 WATER DAMAGE:   Water stains, mold, moisture intrusion, flooding
 * ❄️ HVAC:           AC units, ductwork, vents, condensers
 * 📐 FLOOR PLANS:    Blueprint reading, room detection, door/window extraction
 * 🔨 MATERIALS:      Lumber, construction materials, building elements
 * 🏗️ SIDING:         Vinyl, fiber cement, stucco, aluminum damage
 * 🌡️ THERMAL:        Heat signatures, insulation gaps, moisture
 *
 * @see https://docs.roboflow.com/deploy/hosted-api
 * @see https://universe.roboflow.com - Browse 100k+ models
 */

import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_DEMO_MODE = process.env.ROBOFLOW_DEMO_MODE === "true";
const ROBOFLOW_WORKSPACE = process.env.ROBOFLOW_WORKSPACE; // User's workspace ID

// Use local Docker inference server if available, otherwise fall back to cloud
const ROBOFLOW_INFERENCE_URL = process.env.ROBOFLOW_INFERENCE_URL || "http://localhost:9001";
const USE_LOCAL_INFERENCE = process.env.USE_LOCAL_INFERENCE !== "false"; // Default to local

/**
 * COMPREHENSIVE MODEL REGISTRY
 * Each model is selected for its specific detection accuracy
 * Format: {workspace}/{project}/{version} or just {project}/{version} for public models
 */
const ROBOFLOW_MODELS: Record<string, string> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // ROOFING DAMAGE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  roof_hail: process.env.ROBOFLOW_HAIL_MODEL || "roof-hail-damage/3",
  roof_wind: process.env.ROBOFLOW_WIND_MODEL || "roof-wind-damage/5",
  roof_damage: process.env.ROBOFLOW_ROOF_MODEL || "roof-damage-detection/3",
  roof_shingle: process.env.ROBOFLOW_SHINGLE_MODEL || "roof-damage/1",

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT METALS / COLLATERAL DAMAGE (HAAG Engineering Standards)
  // Vents, flashing, gutters, downspouts - dents prove hail direction/size
  // ═══════════════════════════════════════════════════════════════════════════
  soft_metal_damage: "dent-detection/1", // Dent detection on metals
  metal_dent: "vehicle-dent-detection/1", // Repurposed for soft metals
  vent_damage: "roof-vent-detection/1", // Roof vents (plumbing boots, turbines)
  gutter_damage: "gutter-detection/1", // Gutters and downspouts
  flashing_damage: "metal-detection/1", // Metal flashing

  // ═══════════════════════════════════════════════════════════════════════════
  // SPATTER EVIDENCE (Critical for proving hail claims)
  // Paint oxidation rings, aluminum spatter marks on AC, electrical boxes
  // ═══════════════════════════════════════════════════════════════════════════
  spatter_detection: "paint-chip-detection/1", // Paint chips and spatter marks
  oxidation_ring: "rust-detection/1", // Oxidation rings on paint
  aluminum_spatter: "scratch-detection/1", // Aluminum oxide spatter on painted surfaces

  // ═══════════════════════════════════════════════════════════════════════════
  // AC UNITS / HVAC - Hail & Wind Damage
  // Fin damage, dents on casing, debris impact
  // ═══════════════════════════════════════════════════════════════════════════
  hvac_rooftop: "rooftop-hvac/1", // Rooftop HVAC units
  hvac_equipment: "hvac-equipment/1", // General HVAC equipment
  hvac_symbols: "hvac-symbol-detection-mvp/1", // HVAC blueprint symbols
  ac_condenser: "ac-unit-detection/1", // AC condenser units
  ac_fin_damage: "ac-fin-detection/1", // Damaged AC fins

  // ═══════════════════════════════════════════════════════════════════════════
  // ELECTRICAL BOXES (Spatter evidence location)
  // ═══════════════════════════════════════════════════════════════════════════
  electrical_box: "electrical-panel-detection/1", // Electrical boxes/panels
  meter_box: "utility-meter-detection/1", // Utility meters

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTDOOR FURNITURE / COLLATERAL (Proves storm occurred)
  // ═══════════════════════════════════════════════════════════════════════════
  outdoor_furniture: "outdoor-furniture-detection/1", // Patio furniture
  grill: "grill-detection/1", // BBQ grills (collateral evidence)
  mailbox: "mailbox-detection/1", // Mailboxes

  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOW SCREENS & TRIM (Hail punctures, wind tears)
  // ═══════════════════════════════════════════════════════════════════════════
  window_screen: "window-screen-detection/1", // Window screens (holes from hail)
  screen_damage: "mesh-hole-detection/1", // Holes/tears in screens
  window_trim: "trim-detection/1", // Window trim damage

  // ═══════════════════════════════════════════════════════════════════════════
  // CRACK DETECTION (walls, foundation, concrete, asphalt)
  // ═══════════════════════════════════════════════════════════════════════════
  crack_wall: "crack-detection-y5kyg/1", // 2.13k images - wall/building cracks
  crack_concrete: "crack-detection-kznvy/1", // UAV crack detection - 9.87k images
  crack_foundation: "crack-detection-et3wr/1", // 1.25k images foundation cracks

  // ═══════════════════════════════════════════════════════════════════════════
  // DOOR DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  door: "door-detection-26wc3/3", // 297 images, 3 models trained
  door_blueprint: "door-detection-cetql/1", // Blueprint door detection
  door_frames: "door-frames/1", // Door frames + handles

  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOW & SCREEN DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  window: "window-detection-vnpow/1", // 4.84k images - building windows
  window_facade: "window-detection-wjfqc/1", // 2.16k images - facade windows
  window_blueprint: "window-detection-ljl4h/1", // Blueprint window detection

  // ═══════════════════════════════════════════════════════════════════════════
  // WATER DAMAGE & MOLD
  // ═══════════════════════════════════════════════════════════════════════════
  water_damage: "water-damage-xwzcr/1", // Water damage detection
  water_stain: "water-damage-g3mus/1", // Water stains
  water_detection: "water-damage-detection-pwmf5/2", // 2 models available
  mold: "mold-dz8gu/1", // Building mold (175 images)
  mold_crack: "mold-crack-mt5wo/1", // Mold + crack combined

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOOR PLAN / BLUEPRINT ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  floor_plan: "floor-plan-wnhb5/1", // Rooms, doors, windows, stairs
  floor_plan_walls: "floor-plan-walls/1", // 3.4k images - wall detection
  floor_plan_doxle: "floor-plan-ts7cp/8", // 5k images - comprehensive
  blueprint_rooms: "floor-plan-detection-ouhua/1", // Room type detection

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRUCTION MATERIALS
  // ═══════════════════════════════════════════════════════════════════════════
  materials: "construction-site-material-detection/1", // Brick, wood, rebar
  lumber: "material-b5lkz/1", // Lumber/wood detection
  materials_construction: "material-a798z/1", // Construction materials

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERIOR / ROOM DETECTION
  // ═══════════════════════════════════════════════════════════════════════════
  room_interior: "floor-plan-detection-qj1gc/1", // Toilet, appliances, fixtures
  furniture: "spicified-material/2", // Chairs, tables, sofas

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL / MULTI-PURPOSE
  // ═══════════════════════════════════════════════════════════════════════════
  general_damage: "damage-detection-2drcs/1", // General damage + masks
  property_damage: "damage-detection-ydhuy/2", // Property damage 3.42k images

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDING / EXTERIOR CLADDING
  // ═══════════════════════════════════════════════════════════════════════════
  siding_damage: "siding-damage-detection/1", // Vinyl, fiber cement, aluminum siding
  stucco_damage: "stucco-crack-detection/1", // Stucco cracks and damage
  paint_damage: "paint-chip-detection/1", // Exterior paint chipping, peeling, blistering
  paint_peel: "paint-defect-detection/1", // Paint peeling and defects

  // ═══════════════════════════════════════════════════════════════════════════
  // THERMAL / INFRARED IMAGING
  // ═══════════════════════════════════════════════════════════════════════════
  thermal_anomaly: "thermal-anomaly-detection/1", // Heat signature anomalies
  thermal_leak: "thermal-leak-detection/1", // Insulation gaps, air leaks
  moisture_thermal: "moisture-detection-thermal/1", // Moisture intrusion via thermal

  default: process.env.ROBOFLOW_DEFAULT_MODEL || "roof-damage-detection/3",
};

/**
 * MODEL GROUPS - For running multiple models per component type
 * HAAG Engineering Standards compliant - comprehensive storm damage evidence
 */
const MODEL_GROUPS: Record<string, string[]> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIMARY DAMAGE GROUPS
  // ═══════════════════════════════════════════════════════════════════════════
  roof: ["roof_hail", "roof_wind", "roof_damage", "roof_shingle"],
  crack: ["crack_wall", "crack_concrete", "crack_foundation"],
  door: ["door", "door_frames"],
  window: ["window", "window_facade", "window_screen", "window_trim"],
  water: ["water_damage", "water_stain", "water_detection", "mold"],
  hvac: ["hvac_rooftop", "hvac_equipment", "ac_condenser", "ac_fin_damage"],
  floor_plan: ["floor_plan", "floor_plan_walls", "floor_plan_doxle"],
  materials: ["materials", "lumber", "materials_construction"],
  interior: ["room_interior", "furniture"],

  // ═══════════════════════════════════════════════════════════════════════════
  // STORM DAMAGE EVIDENCE GROUPS (HAAG Standards)
  // ═══════════════════════════════════════════════════════════════════════════

  // Full storm assessment - runs ALL relevant models
  storm: [
    "roof_hail",
    "roof_wind",
    "roof_damage",
    "roof_shingle",
    "soft_metal_damage",
    "metal_dent",
    "vent_damage",
    "gutter_damage",
    "spatter_detection",
    "ac_condenser",
    "ac_fin_damage",
    "window_screen",
    "screen_damage",
  ],

  // Hail-specific evidence (HAAG hail damage indicators)
  hail: [
    "roof_hail",
    "soft_metal_damage",
    "metal_dent",
    "vent_damage",
    "gutter_damage",
    "spatter_detection",
    "aluminum_spatter",
    "ac_condenser",
    "ac_fin_damage",
    "screen_damage",
  ],

  // Wind-specific evidence
  wind: [
    "roof_wind",
    "roof_damage",
    "roof_shingle",
    "window_screen",
    "screen_damage",
    "gutter_damage",
  ],

  // Soft metals group (vents, flashing, gutters - proves hail size/direction)
  soft_metals: [
    "soft_metal_damage",
    "metal_dent",
    "vent_damage",
    "gutter_damage",
    "flashing_damage",
  ],

  // Spatter evidence group (paint oxidation, aluminum spatter)
  spatter: ["spatter_detection", "oxidation_ring", "aluminum_spatter"],

  // Collateral evidence (outdoor items that prove storm occurred)
  collateral: [
    "outdoor_furniture",
    "grill",
    "mailbox",
    "electrical_box",
    "meter_box",
    "ac_condenser",
  ],

  // Window components (screens, trim, glass)
  window_components: ["window", "window_facade", "window_screen", "screen_damage", "window_trim"],

  // AC/HVAC comprehensive
  ac_damage: ["hvac_rooftop", "hvac_equipment", "ac_condenser", "ac_fin_damage"],

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERIOR CLADDING GROUPS
  // ═══════════════════════════════════════════════════════════════════════════

  // Gutters & downspouts (critical for proving storm direction + intensity)
  gutter: ["gutter_damage", "soft_metal_damage", "metal_dent"],

  // Siding damage (vinyl, fiber cement, stucco, aluminum)
  siding: ["siding_damage", "stucco_damage", "crack_wall", "general_damage"],

  // Paint damage (chipping, peeling, oxidation, blistering)
  paint: ["paint_damage", "paint_peel", "spatter_detection", "oxidation_ring"],

  // Thermal / infrared imaging
  thermal: ["thermal_anomaly", "thermal_leak", "moisture_thermal"],

  // Exterior comprehensive (siding + gutters + paint + trim)
  exterior: [
    "siding_damage",
    "stucco_damage",
    "gutter_damage",
    "paint_damage",
    "paint_peel",
    "soft_metal_damage",
    "flashing_damage",
    "general_damage",
  ],

  // General catch-all
  general: ["general_damage", "property_damage", "crack_wall"],
};

/**
 * COMPREHENSIVE CLASS MAPPING
 * Maps Roboflow model outputs to our standardized damage types
 */
const CLASS_MAPPING: Record<string, string> = {
  // ─── HAIL DAMAGE ────────────────────────────────────────────────────────────
  "hail-damage": "hail_impact",
  hail_damage: "hail_impact",
  hail: "hail_impact",
  "hail-mark": "hail_impact",
  bruise: "hail_bruise",
  // Generic "dent" stays neutral — only hail-specific classes map to hail
  dent: "dent",

  // ─── WIND DAMAGE ────────────────────────────────────────────────────────────
  "wind-damage": "wind_damage",
  wind_damage: "wind_damage",
  wind: "wind_damage",
  lifted: "wind_lifted",
  "lifted-shingle": "wind_lifted",
  lifted_shingle: "wind_lifted",
  torn: "wind_torn",
  displaced: "wind_displaced",
  creased: "wind_creased",

  // ─── SHINGLE/ROOF ───────────────────────────────────────────────────────────
  "missing-shingle": "missing_shingles",
  missing_shingle: "missing_shingles",
  missing: "missing_shingles",
  "damaged-shingle": "shingle_damage",
  damaged_shingle: "shingle_damage",
  "granule-loss": "granule_displacement",
  granule_loss: "granule_displacement",
  granule: "granule_displacement",
  "curled-shingle": "age_curling",
  curled_shingle: "age_curling",
  curled: "age_curling",
  blistering: "shingle_blistering",

  // ─── CRACKS ─────────────────────────────────────────────────────────────────
  crack: "crack",
  cracks: "crack",
  "wall-crack": "wall_crack",
  "horizontal crack": "horizontal_crack",
  "vertical crack": "vertical_crack",
  "transverse crack": "transverse_crack",
  "longitudinal crack": "longitudinal_crack",
  "alligator crack": "alligator_crack",
  foundation_crack: "foundation_crack",

  // ─── DOORS ──────────────────────────────────────────────────────────────────
  door: "door",
  doors: "door",
  "door-frame": "door_frame",
  door_frame: "door_frame",
  handle: "door_handle",
  doorhandle: "door_handle",
  hinge: "door_hinge",
  knob: "door_knob",
  lever: "door_lever",
  "double door": "double_door",
  "single door": "single_door",
  "sliding door": "sliding_door",

  // ─── WINDOWS ────────────────────────────────────────────────────────────────
  window: "window",
  windows: "window",
  "window-frame": "window_frame",
  "broken-glass": "broken_glass",
  "cracked-glass": "cracked_glass",
  screen: "window_screen",
  "window-screen": "window_screen",
  trim: "window_trim",
  "window-trim": "window_trim",
  sill: "window_sill",

  // ─── WATER DAMAGE ───────────────────────────────────────────────────────────
  water: "water_damage",
  "water-damage": "water_damage",
  water_damage: "water_damage",
  stain: "water_stain",
  "water-stain": "water_stain",
  moisture: "moisture",
  leak: "water_leak",
  flood: "flood_damage",
  ponding: "water_ponding",

  // ─── MOLD ───────────────────────────────────────────────────────────────────
  mold: "mold",
  mould: "mold",
  mildew: "mildew",
  "mold-stain": "mold_stain",
  fungus: "mold",

  // ─── HVAC ───────────────────────────────────────────────────────────────────
  rtu: "hvac_rtu",
  hvac: "hvac_unit",
  "hvac-unit": "hvac_unit",
  condenser: "hvac_condenser",
  "ac-unit": "hvac_ac_unit",
  duct: "hvac_duct",
  vent: "hvac_vent",
  fan: "hvac_fan",
  compressor: "hvac_compressor",

  // ─── FLOOR PLAN / BLUEPRINT ─────────────────────────────────────────────────
  room: "room",
  wall: "wall",
  "interior-wall": "interior_wall",
  "exterior-wall": "exterior_wall",
  stair: "stairs",
  stairs: "stairs",
  elevator: "elevator",
  bathroom: "bathroom",
  bedroom: "bedroom",
  kitchen: "kitchen",
  "living-room": "living_room",
  garage: "garage",
  balcony: "balcony",
  corridor: "corridor",

  // ─── MATERIALS ──────────────────────────────────────────────────────────────
  brick: "brick",
  wood: "wood",
  lumber: "lumber",
  concrete: "concrete",
  steel: "steel",
  rebar: "rebar",
  stucco: "stucco",
  vinyl: "vinyl_siding",
  aluminum: "aluminum",
  metal: "metal",
  pipe: "pipe",

  // ─── GENERAL ────────────────────────────────────────────────────────────────
  damage: "general_damage",
  defect: "defect",
  rust: "rust_corrosion",
  corrosion: "rust_corrosion",
  moss: "moss_algae",
  algae: "moss_algae",
  debris: "debris_impact",
  hole: "puncture",
  puncture: "puncture",
  scratch: "scratch",
  chip: "paint_chip",

  // ═══════════════════════════════════════════════════════════════════════════
  // HAAG ENGINEERING STANDARD TERMINOLOGY
  // Storm damage evidence types per HAAG inspection protocols
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── SOFT METAL DAMAGE (Critical hail evidence) ─────────────────────────────
  "soft-metal": "soft_metal_dent",
  soft_metal: "soft_metal_dent",
  "metal-dent": "soft_metal_dent",
  metal_dent: "soft_metal_dent",
  ding: "soft_metal_ding",
  dimple: "soft_metal_dimple",
  depression: "soft_metal_depression",
  "roof-vent": "roof_vent_damage",
  roof_vent: "roof_vent_damage",
  "plumbing-boot": "plumbing_boot_damage",
  plumbing_boot: "plumbing_boot_damage",
  turbine: "turbine_vent_damage",
  "turbine-vent": "turbine_vent_damage",
  exhaust_vent: "exhaust_vent_damage",
  "pipe-collar": "pipe_collar_damage",

  // ─── GUTTER & DOWNSPOUT DAMAGE ──────────────────────────────────────────────
  gutter: "gutter_dent",
  gutters: "gutter_dent",
  "gutter-dent": "gutter_dent",
  downspout: "downspout_dent",
  "downspout-dent": "downspout_dent",
  "gutter-seam": "gutter_seam_damage",
  elbow: "downspout_elbow_damage",

  // ─── FLASHING DAMAGE ────────────────────────────────────────────────────────
  flashing: "flashing_dent",
  "step-flashing": "step_flashing_damage",
  "drip-edge": "drip_edge_damage",
  drip_edge: "drip_edge_damage",
  "valley-flashing": "valley_flashing_damage",
  "counter-flashing": "counter_flashing_damage",
  ridge_cap: "ridge_cap_damage",
  "ridge-cap": "ridge_cap_damage",

  // ─── SPATTER EVIDENCE (Proves hail occurrence) ──────────────────────────────
  spatter: "spatter_mark",
  "spatter-mark": "spatter_mark",
  spatter_mark: "spatter_mark",
  "aluminum-spatter": "aluminum_oxide_spatter",
  aluminum_spatter: "aluminum_oxide_spatter",
  "oxidation-ring": "oxidation_ring",
  oxidation_ring: "oxidation_ring",
  oxidation: "oxidation_ring",
  "paint-spatter": "paint_spatter",
  "hail-spatter": "hail_spatter_evidence",

  // ─── PAINT DAMAGE (Chipping, oxidation) ─────────────────────────────────────
  "paint-chip": "paint_chip",
  paint_chip: "paint_chip",
  "paint-chipping": "paint_chipping",
  paint_chipping: "paint_chipping",
  "paint-flaking": "paint_flaking",
  peeling: "paint_peeling",
  "paint-peeling": "paint_peeling",
  "bare-metal": "bare_metal_exposed",
  exposed_metal: "bare_metal_exposed",

  // ─── AC/HVAC DAMAGE (HAAG standards) ────────────────────────────────────────
  "ac-unit-damage": "ac_unit_damage",
  ac_unit: "ac_unit_damage",
  "condenser-fins": "condenser_fin_damage",
  condenser_fins: "condenser_fin_damage",
  "fin-damage": "condenser_fin_damage",
  fins: "condenser_fin_damage",
  "bent-fins": "bent_condenser_fins",
  "ac-casing": "ac_casing_dent",
  "ac-dent": "ac_casing_dent",
  "hvac-dent": "hvac_unit_dent",
  "coil-damage": "ac_coil_damage",

  // ─── ELECTRICAL BOX / METER DAMAGE ──────────────────────────────────────────
  "electrical-box": "electrical_box_damage",
  electrical_box: "electrical_box_damage",
  "meter-box": "meter_box_damage",
  meter_box: "meter_box_damage",
  "junction-box": "junction_box_damage",
  "panel-box": "electrical_panel_damage",
  meter: "utility_meter_damage",

  // ─── WINDOW SCREEN DAMAGE ───────────────────────────────────────────────────
  "screen-hole": "screen_puncture",
  screen_hole: "screen_puncture",
  "screen-tear": "screen_tear",
  screen_tear: "screen_tear",
  "screen-puncture": "screen_puncture",
  "mesh-damage": "screen_mesh_damage",
  "screen-frame": "screen_frame_damage",
  "bent-frame": "screen_bent_frame",

  // ─── WINDOW TRIM DAMAGE ─────────────────────────────────────────────────────
  "trim-damage": "window_trim_damage",
  trim_damage: "window_trim_damage",
  "trim-dent": "window_trim_dent",
  "trim-crack": "window_trim_crack",
  fascia: "fascia_damage",
  "fascia-damage": "fascia_damage",
  soffit: "soffit_damage",
  "soffit-damage": "soffit_damage",

  // ─── COLLATERAL DAMAGE (Proves storm occurred) ──────────────────────────────
  "outdoor-furniture": "outdoor_furniture_damage",
  outdoor_furniture: "outdoor_furniture_damage",
  "patio-furniture": "patio_furniture_damage",
  grill: "grill_damage",
  bbq: "grill_damage",
  "bbq-grill": "grill_damage",
  mailbox: "mailbox_damage",
  "mail-box": "mailbox_damage",
  "fence-damage": "fence_damage",
  "deck-damage": "deck_damage",
  "car-damage": "vehicle_hail_damage",
  vehicle: "vehicle_hail_damage",

  // ─── DIRECTIONAL EVIDENCE (Proves wind/hail direction) ─────────────────────
  "directional-dent": "directional_hail_impact",
  "impact-pattern": "hail_impact_pattern",
  "strike-pattern": "hail_strike_pattern",
  "wind-direction": "wind_direction_evidence",
  "debris-line": "debris_line_evidence",

  // ─── SIDING / EXTERIOR CLADDING ─────────────────────────────────────────────
  siding: "siding_damage",
  "siding-damage": "siding_damage",
  "vinyl-siding": "vinyl_siding_damage",
  "fiber-cement": "fiber_cement_damage",
  "aluminum-siding": "aluminum_siding_damage",
  "siding-crack": "siding_crack",
  "siding-dent": "siding_dent",
  "siding-hole": "siding_puncture",
  "lap-siding": "lap_siding_damage",
  "board-and-batten": "board_batten_damage",
  "siding-buckle": "siding_buckle",
  "siding-warp": "siding_warp",

  // ─── STUCCO DAMAGE ─────────────────────────────────────────────────────────
  "stucco-crack": "stucco_crack",
  "stucco-chip": "stucco_chip",
  "stucco-spalling": "stucco_spalling",
  "stucco-delamination": "stucco_delamination",
  "stucco-efflorescence": "stucco_efflorescence",
  "eifs-damage": "eifs_damage",

  // ─── THERMAL / INFRARED ─────────────────────────────────────────────────────
  "heat-anomaly": "thermal_anomaly",
  "hot-spot": "thermal_hot_spot",
  "cold-spot": "thermal_cold_spot",
  "insulation-gap": "insulation_gap",
  "air-leak": "air_infiltration",
  "moisture-intrusion": "moisture_intrusion_thermal",
  "thermal-bridge": "thermal_bridge",
  "energy-loss": "energy_loss_area",

  // ─── PAINT DEFECTS (Exterior) ───────────────────────────────────────────────
  "paint-blister": "paint_blistering",
  "paint-bubble": "paint_blistering",
  "paint-crack": "paint_cracking",
  "paint-chalk": "paint_chalking",
  chalking: "paint_chalking",
  "paint-fade": "paint_fading",
  fading: "paint_fading",
  "paint-alligator": "paint_alligatoring",
  "paint-peel": "paint_peeling",
};
/**
 * SEVERITY MAPPING - Determines urgency/priority
 * Based on HAAG Engineering damage assessment standards
 */
const SEVERITY_MAP: Record<string, "Low" | "Medium" | "High" | "Critical"> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL - Immediate action needed, water intrusion risk
  // ═══════════════════════════════════════════════════════════════════════════
  missing_shingles: "Critical",
  puncture: "Critical",
  flood_damage: "Critical",
  foundation_crack: "Critical",
  broken_glass: "Critical",
  screen_puncture: "Critical", // Pest/debris entry point
  ac_coil_damage: "Critical", // HVAC won't function

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH - Urgent repair needed, proves significant storm damage
  // ═══════════════════════════════════════════════════════════════════════════
  hail_impact: "High",
  wind_damage: "High",
  wind_lifted: "High",
  wind_torn: "High",
  water_damage: "High",
  mold: "High",
  water_leak: "High",

  // Soft metal damage (HAAG - proves hail size/direction)
  soft_metal_dent: "High",
  soft_metal_ding: "High",
  roof_vent_damage: "High",
  plumbing_boot_damage: "High",
  turbine_vent_damage: "High",
  pipe_collar_damage: "High",

  // Gutter damage (proves hail occurred)
  gutter_dent: "High",
  downspout_dent: "High",
  gutter_seam_damage: "High",

  // Flashing damage (water intrusion risk)
  flashing_dent: "High",
  step_flashing_damage: "High",
  drip_edge_damage: "High",
  valley_flashing_damage: "High",
  ridge_cap_damage: "High",

  // AC/HVAC damage (functional impact)
  condenser_fin_damage: "High",
  bent_condenser_fins: "High",
  ac_unit_damage: "High",
  hvac_unit_dent: "High",

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM - Should repair soon, supports claim evidence
  // ═══════════════════════════════════════════════════════════════════════════
  crack: "Medium",
  wall_crack: "Medium",
  granule_displacement: "Medium",
  rust_corrosion: "Medium",
  water_stain: "Medium",
  hail_dent: "Medium",
  shingle_damage: "Medium",

  // Spatter evidence (critical for claim support)
  spatter_mark: "Medium",
  aluminum_oxide_spatter: "Medium",
  oxidation_ring: "Medium",
  paint_spatter: "Medium",
  hail_spatter_evidence: "Medium",

  // Paint damage
  paint_chipping: "Medium",
  paint_flaking: "Medium",
  paint_peeling: "Medium",
  bare_metal_exposed: "Medium",

  // Screen damage
  screen_tear: "Medium",
  screen_mesh_damage: "Medium",
  screen_frame_damage: "Medium",
  screen_bent_frame: "Medium",

  // Trim damage
  window_trim_damage: "Medium",
  window_trim_dent: "Medium",
  fascia_damage: "Medium",
  soffit_damage: "Medium",

  // Electrical (cosmetic unless penetrated)
  electrical_box_damage: "Medium",
  meter_box_damage: "Medium",
  electrical_panel_damage: "Medium",

  // AC casing (cosmetic)
  ac_casing_dent: "Medium",

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW - Monitor/cosmetic, but still valid claim evidence
  // ═══════════════════════════════════════════════════════════════════════════
  age_curling: "Low",
  moss_algae: "Low",
  paint_chip: "Low",
  scratch: "Low",
  general_damage: "Medium",

  // Collateral damage (supports claim but cosmetic)
  outdoor_furniture_damage: "Low",
  patio_furniture_damage: "Low",
  grill_damage: "Low",
  mailbox_damage: "Low",
  fence_damage: "Low",
  deck_damage: "Low",
  vehicle_hail_damage: "Low", // Document but not our claim

  // Directional evidence (documentation only)
  directional_hail_impact: "Low",
  hail_impact_pattern: "Low",
  hail_strike_pattern: "Low",
  wind_direction_evidence: "Low",
  debris_line_evidence: "Low",

  // Soft metal cosmetic
  soft_metal_dimple: "Low",
  soft_metal_depression: "Low",
  downspout_elbow_damage: "Low",
  counter_flashing_damage: "Low",
  exhaust_vent_damage: "Low",
  utility_meter_damage: "Low",
  junction_box_damage: "Low",
  window_trim_crack: "Low",
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RoboflowDetection {
  /** Class name from the model */
  class: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Bounding box center X (pixels) */
  x: number;
  /** Bounding box center Y (pixels) */
  y: number;
  /** Bounding box width (pixels) */
  width: number;
  /** Bounding box height (pixels) */
  height: number;
}

export interface RoboflowResponse {
  predictions: RoboflowDetection[];
  image: {
    width: number;
    height: number;
  };
  time: number;
}

export interface NormalizedDetection {
  /** Normalized X (0-100 percentage from left) */
  x: number;
  /** Normalized Y (0-100 percentage from top) */
  y: number;
  /** Normalized width (0-100 percentage) */
  width: number;
  /** Normalized height (0-100 percentage) */
  height: number;
  /** Mapped damage type */
  type: string;
  /** Original class from model */
  originalClass: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Severity level */
  severity: string;
}

export type ModelType = keyof typeof ROBOFLOW_MODELS;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DETECTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect damage in an image using Roboflow YOLO model
 *
 * @param imageUrl - Public URL to the image OR base64 encoded image
 * @param modelType - Which model to use (roof_damage, property_damage, etc.)
 * @param confidenceThreshold - Minimum confidence to include (default 0.4)
 * @returns Array of normalized detections with percentages (0-100)
 */
export async function detectDamageWithYOLO(
  imageUrl: string,
  modelType: ModelType = "default",
  confidenceThreshold: number = 0.4
): Promise<NormalizedDetection[]> {
  if (!ROBOFLOW_API_KEY && !USE_LOCAL_INFERENCE) {
    logger.warn("[ROBOFLOW] API key not configured - skipping YOLO detection");
    return [];
  }

  const modelPath = ROBOFLOW_MODELS[modelType] || ROBOFLOW_MODELS.default;

  // Use local Docker inference server (FREE, UNLIMITED) or cloud API
  // Local: http://localhost:9001/{model-id}/{version}
  // Cloud: https://serverless.roboflow.com/{model-id}/{version}
  const baseUrl = USE_LOCAL_INFERENCE ? ROBOFLOW_INFERENCE_URL : "https://serverless.roboflow.com";
  const apiUrl = `${baseUrl}/${modelPath}`;

  logger.info("[ROBOFLOW] Starting detection", {
    modelType,
    modelPath,
    useLocalInference: USE_LOCAL_INFERENCE,
    baseUrl,
  });

  try {
    let response: Response;
    let data: RoboflowResponse;

    // Check if imageUrl is a base64 string or URL
    const isBase64 = imageUrl.startsWith("data:") || imageUrl.length > 1000;
    const base64Data = isBase64
      ? imageUrl.startsWith("data:")
        ? imageUrl.split(",")[1]
        : imageUrl
      : null;

    if (USE_LOCAL_INFERENCE) {
      // LOCAL DOCKER INFERENCE SERVER (FREE, UNLIMITED)
      // Uses JSON API format: POST /infer/object_detection
      const inferenceUrl = `${ROBOFLOW_INFERENCE_URL}/infer/object_detection`;

      const requestBody: {
        model_id: string;
        confidence: number;
        api_key?: string;
        image?: Array<{ type: string; value: string }>;
      } = {
        model_id: modelPath,
        confidence: confidenceThreshold,
      };

      if (ROBOFLOW_API_KEY) {
        requestBody.api_key = ROBOFLOW_API_KEY;
      }

      if (isBase64 && base64Data) {
        requestBody.image = [{ type: "base64", value: base64Data }];
      } else {
        requestBody.image = [{ type: "url", value: imageUrl }];
      }

      try {
        response = await fetch(inferenceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.warn("[ROBOFLOW] Local inference error, falling back to cloud API", {
            status: response.status,
            error: errorText,
          });
          throw new Error(`Local inference error: ${response.status} - ${errorText}`);
        }

        // Local server returns array, take first result
        const results = await response.json();
        data = Array.isArray(results) ? results[0] : results;
      } catch (localError) {
        // ═══ FALLBACK: Local Docker not running → use Roboflow cloud API ═══
        logger.info("[ROBOFLOW] Local inference unavailable, falling back to cloud API", {
          error: localError instanceof Error ? localError.message : String(localError),
        });

        if (!ROBOFLOW_API_KEY) {
          throw new Error("No ROBOFLOW_API_KEY and local inference unavailable");
        }

        const cloudUrl = `https://detect.roboflow.com/${modelPath}`;
        if (isBase64 && base64Data) {
          response = await fetch(
            `${cloudUrl}?api_key=${ROBOFLOW_API_KEY}&confidence=${confidenceThreshold}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: base64Data,
            }
          );
        } else {
          const encodedUrl = encodeURIComponent(imageUrl);
          response = await fetch(
            `${cloudUrl}?api_key=${ROBOFLOW_API_KEY}&image=${encodedUrl}&confidence=${confidenceThreshold}`
          );
        }

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("[ROBOFLOW] Cloud API fallback also failed", {
            status: response.status,
            error: errorText,
          });
          throw new Error(`Roboflow cloud API error: ${response.status} - ${errorText}`);
        }

        data = await response.json();
      }
    } else {
      // CLOUD API (requires paid plan for private models)
      if (isBase64 && base64Data) {
        response = await fetch(
          `${apiUrl}?api_key=${ROBOFLOW_API_KEY}&confidence=${confidenceThreshold}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: base64Data,
          }
        );
      } else {
        const encodedUrl = encodeURIComponent(imageUrl);
        response = await fetch(
          `${apiUrl}?api_key=${ROBOFLOW_API_KEY}&image=${encodedUrl}&confidence=${confidenceThreshold}`
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("[ROBOFLOW] Cloud API error", { status: response.status, error: errorText });
        throw new Error(`Roboflow API error: ${response.status} - ${errorText}`);
      }

      data = await response.json();
    }

    logger.info("[ROBOFLOW] Detection complete", {
      predictions: data.predictions?.length || 0,
      imageSize: data.image,
      timeMs: data.time,
    });

    // Use shared normalization helper
    return normalizeDetections(data, confidenceThreshold);
  } catch (error) {
    // Log but don't throw - allow fallback to GPT-4V boxes
    logger.warn("[ROBOFLOW] Detection failed, falling back to GPT-4V", {
      error: error instanceof Error ? error.message : String(error),
      modelType,
    });
    return []; // Return empty so GPT-4V boxes are used as fallback
  }
}

/**
 * Check if Roboflow is configured and available
 * Returns true if API key is set OR demo mode is enabled
 */
export function isRoboflowConfigured(): boolean {
  return !!ROBOFLOW_API_KEY || ROBOFLOW_DEMO_MODE;
}

/**
 * Check if we're in demo mode (for testing without real API)
 */
export function isRoboflowDemoMode(): boolean {
  return ROBOFLOW_DEMO_MODE;
}

/**
 * Get available models
 */
export function getAvailableModels(): Record<string, string> {
  return { ...ROBOFLOW_MODELS };
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-MODEL DETECTION (Run multiple specialized models)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run multiple specialized models and combine results
 * This gives you the BEST coverage for different damage types
 *
 * @param imageUrl - Image to analyze
 * @param claimType - Type of claim (hail, wind, storm, general)
 * @param confidenceThreshold - Minimum confidence
 * @returns Combined detections from all applicable models
 */
export async function detectWithMultipleModels(
  imageUrl: string,
  claimType: "hail" | "wind" | "storm" | "water" | "fire" | "general" = "general",
  confidenceThreshold: number = 0.4
): Promise<NormalizedDetection[]> {
  if (!ROBOFLOW_API_KEY) {
    logger.warn("[ROBOFLOW] API key not configured - skipping multi-model detection");
    return [];
  }

  // Select which models to run based on claim type
  const modelsToRun: string[] = [];

  switch (claimType) {
    case "hail":
      modelsToRun.push(ROBOFLOW_MODELS.hail, ROBOFLOW_MODELS.shingle);
      break;
    case "wind":
      modelsToRun.push(ROBOFLOW_MODELS.wind, ROBOFLOW_MODELS.shingle);
      break;
    case "storm":
      // Storm = check for both hail AND wind damage
      modelsToRun.push(ROBOFLOW_MODELS.hail, ROBOFLOW_MODELS.wind, ROBOFLOW_MODELS.shingle);
      break;
    case "water":
    case "fire":
      // These need visual inspection, use general model
      modelsToRun.push(ROBOFLOW_MODELS.roof_damage);
      break;
    case "general":
    default:
      // Run all models for comprehensive detection
      modelsToRun.push(ROBOFLOW_MODELS.hail, ROBOFLOW_MODELS.wind, ROBOFLOW_MODELS.roof_damage);
      break;
  }

  logger.info("[ROBOFLOW] Running multi-model detection", {
    claimType,
    modelCount: modelsToRun.length,
    models: modelsToRun,
  });

  // Run all models in parallel for speed
  const allDetections: NormalizedDetection[] = [];
  const results = await Promise.allSettled(
    modelsToRun.map(async (modelPath) => {
      try {
        return await runSingleModel(imageUrl, modelPath, confidenceThreshold);
      } catch (err) {
        logger.warn(`[ROBOFLOW] Model ${modelPath} failed`, { error: err });
        return [];
      }
    })
  );

  // Combine results from all models
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allDetections.push(...result.value);
    }
  }

  // Deduplicate overlapping boxes (same area detected by multiple models)
  const deduplicated = deduplicateDetections(allDetections);

  logger.info("[ROBOFLOW] Multi-model detection complete", {
    totalDetections: allDetections.length,
    afterDedup: deduplicated.length,
  });

  return deduplicated;
}

/**
 * Run a single model (internal helper)
 * Tries local Docker inference first (if enabled), falls back to cloud API
 */
async function runSingleModel(
  imageUrl: string,
  modelPath: string,
  confidenceThreshold: number
): Promise<NormalizedDetection[]> {
  let response: Response;

  const isBase64 = imageUrl.startsWith("data:") || imageUrl.length > 1000;
  const base64Data = isBase64
    ? imageUrl.startsWith("data:")
      ? imageUrl.split(",")[1]
      : imageUrl
    : null;

  // Try local Docker inference first if enabled
  if (USE_LOCAL_INFERENCE) {
    try {
      const inferenceUrl = `${ROBOFLOW_INFERENCE_URL}/infer/object_detection`;
      const requestBody: Record<string, unknown> = {
        model_id: modelPath,
        confidence: confidenceThreshold,
      };
      if (ROBOFLOW_API_KEY) requestBody.api_key = ROBOFLOW_API_KEY;
      if (isBase64 && base64Data) {
        requestBody.image = [{ type: "base64", value: base64Data }];
      } else {
        requestBody.image = [{ type: "url", value: imageUrl }];
      }

      response = await fetch(inferenceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(10000), // 10s timeout for local
      });

      if (response.ok) {
        const results = await response.json();
        const data: RoboflowResponse = Array.isArray(results) ? results[0] : results;
        logger.info(`[ROBOFLOW] Local inference success: ${modelPath}`, {
          predictions: data.predictions?.length || 0,
        });
        return normalizeDetections(data, confidenceThreshold);
      }
    } catch {
      // Local not available — fall through to cloud
      logger.debug(`[ROBOFLOW] Local inference unavailable for ${modelPath}, using cloud`);
    }
  }

  // Cloud API fallback
  const apiUrl = `https://detect.roboflow.com/${modelPath}`;

  if (isBase64 && base64Data) {
    response = await fetch(
      `${apiUrl}?api_key=${ROBOFLOW_API_KEY}&confidence=${confidenceThreshold}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: base64Data,
      }
    );
  } else {
    const encodedUrl = encodeURIComponent(imageUrl);
    response = await fetch(
      `${apiUrl}?api_key=${ROBOFLOW_API_KEY}&image=${encodedUrl}&confidence=${confidenceThreshold}`
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "unknown");
    logger.warn(`[ROBOFLOW] Model ${modelPath} returned ${response.status}: ${errorText}`);
    throw new Error(`Model ${modelPath} returned ${response.status}: ${errorText}`);
  }

  const data: RoboflowResponse = await response.json();

  return normalizeDetections(data, confidenceThreshold);
}

/**
 * Normalize Roboflow predictions to 0-100 percentage coordinates
 */
function normalizeDetections(
  data: RoboflowResponse,
  confidenceThreshold: number
): NormalizedDetection[] {
  if (!data?.predictions || !data?.image) return [];

  return data.predictions
    .map((pred) => {
      const topLeftX = pred.x - pred.width / 2;
      const topLeftY = pred.y - pred.height / 2;
      const xPct = (topLeftX / data.image.width) * 100;
      const yPct = (topLeftY / data.image.height) * 100;
      const widthPct = (pred.width / data.image.width) * 100;
      const heightPct = (pred.height / data.image.height) * 100;
      const mappedType = CLASS_MAPPING[pred.class.toLowerCase()] || pred.class;
      const severity = SEVERITY_MAP[mappedType] || "Medium";

      return {
        x: Math.max(0, Math.min(100, xPct)),
        y: Math.max(0, Math.min(100, yPct)),
        width: Math.max(3, Math.min(100, widthPct)),
        height: Math.max(3, Math.min(100, heightPct)),
        type: mappedType,
        originalClass: pred.class,
        confidence: pred.confidence,
        severity,
      };
    })
    .filter((d) => d.confidence >= confidenceThreshold);
}

/**
 * Remove overlapping detections (IoU > 0.5)
 */
function deduplicateDetections(detections: NormalizedDetection[]): NormalizedDetection[] {
  if (detections.length <= 1) return detections;

  // Sort by confidence (keep highest confidence)
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: NormalizedDetection[] = [];

  for (const detection of sorted) {
    // Check if this overlaps with any already-kept detection
    const overlaps = kept.some((existing) => {
      const iou = calculateIoU(detection, existing);
      return iou > 0.5; // 50% overlap threshold
    });

    if (!overlaps) {
      kept.push(detection);
    }
  }

  return kept;
}

/**
 * Calculate Intersection over Union (IoU) for two boxes
 */
function calculateIoU(a: NormalizedDetection, b: NormalizedDetection): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  if (x2 <= x1 || y2 <= y1) return 0; // No overlap

  const intersection = (x2 - x1) * (y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const union = areaA + areaB - intersection;

  return intersection / union;
}

// ─────────────────────────────────────────────────────────────────────────────
// HYBRID DETECTION (YOLO + GPT-4o)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Two-stage detection: YOLO for boxes, GPT-4o for classification
 *
 * This gives you:
 * - Accurate bounding boxes from YOLO (95%+)
 * - Rich damage descriptions from GPT-4o
 * - IRC code mappings from our prompt engineering
 *
 * @param imageUrl - Image to analyze
 * @param modelType - Which YOLO model to use
 * @returns Enhanced detections with GPT-4o classifications
 */
export async function hybridDetection(
  imageUrl: string,
  modelType: ModelType = "default"
): Promise<NormalizedDetection[]> {
  // Stage 1: Get accurate boxes from YOLO
  const yoloDetections = await detectDamageWithYOLO(imageUrl, modelType);

  if (yoloDetections.length === 0) {
    logger.info("[ROBOFLOW] No detections from YOLO, falling back to GPT-4o only");
    return [];
  }

  // Stage 2 would call GPT-4o to enhance classifications
  // For now, return YOLO detections with our mappings
  // TODO: Add GPT-4o enhancement for detailed descriptions

  return yoloDetections;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT-BASED DETECTION (Auto-selects models)
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentType =
  | "roof"
  | "siding"
  | "stucco"
  | "gutter"
  | "hvac"
  | "window"
  | "screen"
  | "fence"
  | "deck"
  | "soffit_fascia"
  | "chimney"
  | "skylight"
  | "door"
  | "wall"
  | "floor"
  | "ceiling"
  | "interior"
  | "foundation"
  | "blueprint"
  | "floor_plan"
  | "mailbox"
  | "electrical_box"
  | "outdoor_furniture"
  | "awning"
  | "garage_door"
  | "downspout"
  | "paint"
  | "thermal"
  | "water_damage"
  | "mold"
  | "general";

/**
 * Detect damage based on component type - auto-selects the best models
 *
 * @param imageUrl - Image to analyze
 * @param componentType - Type of building component (roof, door, window, etc.)
 * @param claimType - Type of claim (hail, wind, water, fire, storm, general)
 * @param confidenceThreshold - Minimum confidence (default 0.35)
 * @returns Combined detections from all relevant models
 */
export async function detectByComponent(
  imageUrl: string,
  componentType: ComponentType,
  claimType: "hail" | "wind" | "water" | "fire" | "storm" | "general" = "general",
  confidenceThreshold: number = 0.35
): Promise<NormalizedDetection[]> {
  if (!ROBOFLOW_API_KEY) {
    logger.warn("[ROBOFLOW] API key not configured");
    return [];
  }

  // Select models based on component type
  let modelKeys: string[] = [];

  switch (componentType) {
    case "roof":
      if (claimType === "hail") {
        modelKeys = ["roof_hail", "roof_shingle"];
      } else if (claimType === "wind" || claimType === "storm") {
        modelKeys = ["roof_hail", "roof_wind", "roof_shingle"];
      } else {
        modelKeys = MODEL_GROUPS.roof || ["roof_damage"];
      }
      break;

    case "door":
      modelKeys = MODEL_GROUPS.door || ["door"];
      break;

    case "window":
    case "screen":
    case "skylight":
      modelKeys = MODEL_GROUPS.window || ["window"];
      break;

    case "wall":
    case "siding":
    case "stucco":
    case "foundation":
      modelKeys = [...(MODEL_GROUPS.siding || []), ...(MODEL_GROUPS.crack || ["crack_wall"])];
      if (claimType === "water") {
        modelKeys.push(...(MODEL_GROUPS.water || []));
      }
      if (claimType === "hail" || claimType === "storm") {
        modelKeys.push(...(MODEL_GROUPS.paint || []));
      }
      break;

    case "paint":
      // Exterior paint damage - chipping, peeling, oxidation, hail spatter
      modelKeys = MODEL_GROUPS.paint || ["paint_damage", "spatter_detection"];
      break;

    case "thermal":
      // Thermal/infrared imaging - heat signatures, insulation, moisture
      modelKeys = MODEL_GROUPS.thermal || ["thermal_anomaly"];
      break;

    case "water_damage":
      // Water damage detection - stains, mold, moisture intrusion
      modelKeys = MODEL_GROUPS.water || ["water_damage", "mold"];
      break;

    case "mold":
      // Mold detection
      modelKeys = ["mold", "mold_crack", "water_damage"];
      break;

    case "hvac":
      modelKeys = MODEL_GROUPS.hvac || ["hvac_rooftop"];
      break;

    case "interior":
    case "floor":
    case "ceiling":
      modelKeys = [...(MODEL_GROUPS.interior || []), ...(MODEL_GROUPS.crack || [])];
      if (claimType === "water") {
        modelKeys.push(...(MODEL_GROUPS.water || []));
      }
      break;

    case "blueprint":
    case "floor_plan":
      modelKeys = MODEL_GROUPS.floor_plan || ["floor_plan"];
      break;

    case "gutter":
    case "downspout":
      // Use dedicated gutter/soft metal detection models
      modelKeys = MODEL_GROUPS.gutter || ["gutter_damage", "soft_metal_damage"];
      break;

    case "soffit_fascia":
    case "chimney":
      // Use soft metals + general damage for fascia/chimney
      modelKeys = ["soft_metal_damage", "flashing_damage", "general_damage", "crack_wall"];
      break;

    case "fence":
    case "deck":
      // Use general damage + crack detection for fences/decks
      modelKeys = ["general_damage", "crack_wall", "property_damage"];
      break;

    case "garage_door":
      // Use door models for garage doors
      modelKeys = [...(MODEL_GROUPS.door || []), "general_damage"];
      break;

    case "awning":
    case "outdoor_furniture":
    case "mailbox":
    case "electrical_box":
      // General damage detection for misc outdoor items
      modelKeys = ["general_damage", "property_damage"];
      break;

    default:
      modelKeys = MODEL_GROUPS.general || ["general_damage"];
  }

  logger.info("[ROBOFLOW] Component detection", {
    componentType,
    claimType,
    modelCount: modelKeys.length,
    models: modelKeys,
  });

  // Run all selected models in parallel
  const allDetections: NormalizedDetection[] = [];
  const results = await Promise.allSettled(
    modelKeys.map(async (modelKey) => {
      const modelPath = ROBOFLOW_MODELS[modelKey];
      if (!modelPath) {
        logger.warn(`[ROBOFLOW] Unknown model key: ${modelKey}`);
        return [];
      }
      try {
        return await runSingleModel(imageUrl, modelPath, confidenceThreshold);
      } catch (err) {
        logger.warn(`[ROBOFLOW] Model ${modelKey} failed`, { error: err });
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allDetections.push(...result.value);
    }
  }

  // Deduplicate overlapping boxes
  const deduplicated = deduplicateDetections(allDetections);

  logger.info("[ROBOFLOW] Component detection complete", {
    componentType,
    totalDetections: allDetections.length,
    afterDedup: deduplicated.length,
  });

  return deduplicated;
}

// ─────────────────────────────────────────────────────────────────────────────
// BLUEPRINT / FLOOR PLAN ANALYZER
// ─────────────────────────────────────────────────────────────────────────────

export interface FloorPlanAnalysis {
  rooms: NormalizedDetection[];
  doors: NormalizedDetection[];
  windows: NormalizedDetection[];
  walls: NormalizedDetection[];
  stairs: NormalizedDetection[];
  fixtures: NormalizedDetection[];
  rawDetections: NormalizedDetection[];
}

/**
 * Analyze a floor plan / blueprint image
 * Extracts rooms, doors, windows, walls, and other elements
 *
 * @param imageUrl - Blueprint or floor plan image
 * @returns Structured analysis with categorized elements
 */
export async function analyzeFloorPlan(imageUrl: string): Promise<FloorPlanAnalysis> {
  if (!ROBOFLOW_API_KEY) {
    logger.warn("[ROBOFLOW] API key not configured for floor plan analysis");
    return {
      rooms: [],
      doors: [],
      windows: [],
      walls: [],
      stairs: [],
      fixtures: [],
      rawDetections: [],
    };
  }

  logger.info("[ROBOFLOW] Analyzing floor plan...");

  // Run floor plan models
  const modelKeys = MODEL_GROUPS.floor_plan || ["floor_plan"];
  const allDetections: NormalizedDetection[] = [];

  const results = await Promise.allSettled(
    modelKeys.map(async (modelKey) => {
      const modelPath = ROBOFLOW_MODELS[modelKey];
      if (!modelPath) return [];
      try {
        return await runSingleModel(imageUrl, modelPath, 0.3);
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allDetections.push(...result.value);
    }
  }

  // Categorize detections
  const analysis: FloorPlanAnalysis = {
    rooms: [],
    doors: [],
    windows: [],
    walls: [],
    stairs: [],
    fixtures: [],
    rawDetections: allDetections,
  };

  for (const detection of allDetections) {
    const type = detection.type.toLowerCase();

    if (
      type.includes("room") ||
      type.includes("bedroom") ||
      type.includes("bathroom") ||
      type.includes("kitchen") ||
      type.includes("living") ||
      type.includes("garage")
    ) {
      analysis.rooms.push(detection);
    } else if (type.includes("door")) {
      analysis.doors.push(detection);
    } else if (type.includes("window")) {
      analysis.windows.push(detection);
    } else if (type.includes("wall")) {
      analysis.walls.push(detection);
    } else if (type.includes("stair") || type.includes("elevator")) {
      analysis.stairs.push(detection);
    } else {
      analysis.fixtures.push(detection);
    }
  }

  logger.info("[ROBOFLOW] Floor plan analysis complete", {
    rooms: analysis.rooms.length,
    doors: analysis.doors.length,
    windows: analysis.windows.length,
    walls: analysis.walls.length,
    stairs: analysis.stairs.length,
    fixtures: analysis.fixtures.length,
  });

  return analysis;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get list of available detection categories
 */
export function getAvailableCategories(): string[] {
  return Object.keys(MODEL_GROUPS);
}

/**
 * Get all models for a category
 */
export function getModelsForCategory(category: string): string[] {
  return MODEL_GROUPS[category] || [];
}

const roboflowClient = {
  detectDamageWithYOLO,
  detectWithMultipleModels,
  detectByComponent,
  analyzeFloorPlan,
  hybridDetection,
  isRoboflowConfigured,
  getAvailableModels,
  getAvailableCategories,
  getModelsForCategory,
  CLASS_MAPPING,
  SEVERITY_MAP,
  MODEL_GROUPS,
};
export default roboflowClient;
