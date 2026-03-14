/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROFESSIONAL CAPTION GENERATOR
 *
 * Generates inspector-quality captions for damage findings.
 * Format: Observation → Technical Explanation → Code Reference → Claim Implication
 *
 * Styled after professional CompanyCam / DryTop inspection reports.
 * Works for ALL trades: roofing, siding, painting, HVAC, gutters, etc.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { EvidenceCluster } from "@/lib/inspection/evidence-grouping";

// ─── Caption Templates by Damage Category ────────────────────────────────────

interface CaptionTemplate {
  observation: string;
  technical: string;
  claimImpact: string;
}

const CAPTION_TEMPLATES: Record<string, CaptionTemplate[]> = {
  // ─── HAIL ───────────────────────────────────────────────────────────────────
  hail: [
    {
      observation: "Impact damage consistent with hail strike observed on {component}.",
      technical:
        "Granule displacement and substrate bruising indicate functional damage to the shingle mat. HAAG-certified impact pattern confirms storm-related causation rather than mechanical wear.",
      claimImpact:
        "This impact compromises the shingle's weather barrier, reducing its service life and voiding manufacturer warranty per ARMA standards.",
    },
    {
      observation: "Circular impact mark with granule loss identified on {component}.",
      technical:
        "The impact crater exhibits characteristic radial fracturing in the fiberglass mat with exposed bitumen substrate. Impact diameter and depth are consistent with hailstone size reported during the {event} event.",
      claimImpact:
        "Exposed substrate accelerates UV degradation and water absorption, requiring replacement of affected shingles to restore weather protection.",
    },
  ],

  // ─── WIND ───────────────────────────────────────────────────────────────────
  wind: [
    {
      observation: "Wind-lifted {component} with visible crease line and partial detachment.",
      technical:
        "The uplift pattern shows the shingle tab was subjected to wind speeds exceeding the product's rated wind resistance. Seal strip failure along the adhesive line confirms wind-driven separation.",
      claimImpact:
        "Lifted shingles expose the underlayment and deck to direct weather exposure. Complete course replacement is required as re-adhering compromised seal strips does not restore wind resistance rating.",
    },
    {
      observation: "Missing/displaced {component} in exposed wind-facing elevation.",
      technical:
        "Wind displacement of roofing material exposes the weather-resistant barrier to direct precipitation. The pattern of displacement is consistent with storm wind direction and velocity.",
      claimImpact:
        "Open exposure requires immediate temporary protection and permanent replacement to prevent secondary water damage to the roof deck and interior.",
    },
  ],

  // ─── WATER ──────────────────────────────────────────────────────────────────
  water: [
    {
      observation: "Water staining and discoloration visible on {component}.",
      technical:
        "Mineral deposit patterns indicate prolonged moisture contact. Discoloration boundaries suggest ongoing active leak path from above or adjacent assembly failure.",
      claimImpact:
        "Active moisture intrusion will cause progressive deterioration of structural members and may create conditions for microbial growth if not remediated within 48 hours per IICRC S500 standards.",
    },
    {
      observation: "Moisture intrusion evidence with material degradation on {component}.",
      technical:
        "Surface delamination and substrate softening confirm moisture penetration beyond surface level. The damage pattern traces to a breach in the exterior weather-resistant barrier.",
      claimImpact:
        "Remediation requires identification and repair of the source, removal of saturated materials, and restoration of the weather barrier to prevent mold development.",
    },
  ],

  // ─── FIRE ───────────────────────────────────────────────────────────────────
  fire: [
    {
      observation: "Char damage and thermal discoloration observed on {component}.",
      technical:
        "Carbonization depth and heat-affected zone extent indicate direct flame exposure or radiant heat damage. Material integrity has been compromised beyond the visible damage boundary.",
      claimImpact:
        "Fire-damaged materials must be removed beyond the visible damage boundary to ensure complete remediation. Structural members require engineering assessment for load-bearing capacity.",
    },
  ],

  // ─── SIDING ─────────────────────────────────────────────────────────────────
  siding: [
    {
      observation: "Impact damage to {component} with visible crack/dent pattern.",
      technical:
        "The damage pattern is consistent with storm-driven projectile or hail impact. Material fracturing extends through the weatherproofing layer, compromising the exterior wall envelope.",
      claimImpact:
        "Compromised siding allows moisture penetration to the wall assembly sheathing and framing. Full panel replacement is required as repairs cannot restore the section's weather resistance rating.",
    },
  ],

  // ─── STUCCO ─────────────────────────────────────────────────────────────────
  stucco: [
    {
      observation: "Spalling and impact divots visible on stucco surface of {component}.",
      technical:
        "Stucco displacement reveals the wire lath and scratch coat beneath. Impact craters demonstrate force consistent with hailstone strikes. The spall pattern compromises the weather-resistant barrier.",
      claimImpact:
        "Stucco repairs require proper three-coat application over new lath per IRC R703.7. Spot patching is insufficient as the surrounding stucco bond has been destabilized by impact vibration.",
    },
  ],

  // ─── GUTTER ─────────────────────────────────────────────────────────────────
  gutter: [
    {
      observation: "Dents and deformation visible along {component}.",
      technical:
        "Multiple impact dents have compromised the gutter profile geometry, reducing water flow capacity. Gutter pitch may be altered, creating standing water conditions that accelerate corrosion.",
      claimImpact:
        "Damaged gutter sections require replacement to restore proper drainage capacity and prevent fascia board water damage from overflow or standing water.",
    },
  ],

  // ─── HVAC ───────────────────────────────────────────────────────────────────
  hvac: [
    {
      observation: "Condenser fin damage observed on outdoor HVAC unit.",
      technical:
        "Aluminum fin deformation from hail impact has reduced the heat exchange surface area. When >15% of fins are damaged, cooling efficiency drops measurably, increasing energy costs and compressor strain.",
      claimImpact:
        "Fin straightening is effective for <15% damage. Beyond that threshold, coil replacement or unit replacement is cost-effective and may be required to restore rated efficiency.",
    },
  ],

  // ─── WINDOW / SCREEN ───────────────────────────────────────────────────────
  window: [
    {
      observation: "Damage to window/screen assembly on {component}.",
      technical:
        "Screen mesh perforation or frame deformation prevents proper insect protection. Window seal or glazing damage compromises energy performance and may admit water during wind-driven rain events.",
      claimImpact:
        "Complete screen replacement is required as repairs do not restore proper mesh tension. Window seal failure requires sash replacement to restore the insulating glass unit performance.",
    },
  ],

  // ─── SOFT METAL ─────────────────────────────────────────────────────────────
  soft_metal: [
    {
      observation: "Hail impact dents documented on {component} (soft metal indicator).",
      technical:
        "Soft metal testing per HAAG methodology provides forensic confirmation of hail event and impact intensity. Impact density and size directly correlate to damage expected on roofing materials.",
      claimImpact:
        "Soft metal denting serves as primary evidence of hail occurrence and storm intensity. This finding supports the causation argument for all storm-related damage documented in this report.",
    },
  ],

  // ─── STRUCTURAL ─────────────────────────────────────────────────────────────
  structural: [
    {
      observation: "Structural compromise observed in {component}.",
      technical:
        "Visual indicators suggest load-bearing capacity reduction. Deflection patterns are inconsistent with normal settling and indicate damage-related structural movement.",
      claimImpact:
        "Structural damage requires engineering assessment before repairs can be scoped. Building permit and inspection will likely be required for structural remediation.",
    },
  ],

  // ─── GENERAL / FALLBACK ─────────────────────────────────────────────────────
  general: [
    {
      observation: "Damage identified on {component}.",
      technical:
        "The damage pattern is consistent with storm-related causation based on the reported date of loss and documented weather conditions.",
      claimImpact:
        "This damage requires professional repair or replacement to restore the component to its pre-loss condition and maintain code compliance.",
    },
  ],
};

// ─── Template Selection ──────────────────────────────────────────────────────

function selectCategory(damageType: string): string {
  const dt = damageType.toLowerCase();

  if (
    dt.includes("hail") ||
    dt.includes("impact") ||
    dt.includes("bruise") ||
    dt.includes("spatter")
  )
    return "hail";
  if (
    dt.includes("wind") ||
    dt.includes("lifted") ||
    dt.includes("torn") ||
    dt.includes("displaced")
  )
    return "wind";
  if (
    dt.includes("water") ||
    dt.includes("moisture") ||
    dt.includes("stain") ||
    dt.includes("mold") ||
    dt.includes("rot") ||
    dt.includes("leak")
  )
    return "water";
  if (dt.includes("fire") || dt.includes("char") || dt.includes("smoke") || dt.includes("melt"))
    return "fire";
  if (dt.includes("stucco")) return "stucco";
  if (dt.includes("siding") || dt.includes("paint") || dt.includes("trim")) return "siding";
  if (dt.includes("gutter") || dt.includes("downspout")) return "gutter";
  if (dt.includes("hvac") || dt.includes("condenser") || dt.includes("ac_fin")) return "hvac";
  if (
    dt.includes("window") ||
    dt.includes("screen") ||
    dt.includes("glazing") ||
    dt.includes("casing")
  )
    return "window";
  if (
    dt.includes("soft_metal") ||
    dt.includes("mailbox") ||
    dt.includes("meter") ||
    dt.includes("electrical")
  )
    return "soft_metal";
  if (dt.includes("structural") || dt.includes("sagging") || dt.includes("decking"))
    return "structural";

  return "general";
}

function componentLabel(damageType: string): string {
  const dt = damageType.toLowerCase();
  if (dt.includes("shingle")) return "asphalt shingle";
  if (dt.includes("tile")) return "roof tile";
  if (dt.includes("metal_roof") || dt.includes("metal_dent") || dt.includes("metal_puncture"))
    return "metal roofing panel";
  if (dt.includes("membrane")) return "membrane roofing";
  if (dt.includes("shake")) return "wood shake";
  if (dt.includes("slate")) return "slate tile";
  if (dt.includes("flashing")) return "roof flashing";
  if (dt.includes("drip_edge")) return "drip edge";
  if (dt.includes("vent")) return "roof ventilation";
  if (dt.includes("gutter")) return "gutter section";
  if (dt.includes("downspout")) return "downspout";
  if (dt.includes("siding")) return "exterior siding";
  if (dt.includes("stucco")) return "stucco wall surface";
  if (dt.includes("garage")) return "garage door panel";
  if (dt.includes("screen")) return "window screen";
  if (dt.includes("window")) return "window assembly";
  if (dt.includes("hvac") || dt.includes("condenser")) return "HVAC condenser unit";
  if (dt.includes("mailbox")) return "mailbox (soft metal indicator)";
  if (dt.includes("electrical") || dt.includes("meter")) return "electrical/meter box";
  if (dt.includes("fence")) return "fence section";
  if (dt.includes("deck")) return "deck surface";
  if (dt.includes("awning")) return "awning assembly";
  if (dt.includes("chimney")) return "chimney";
  if (dt.includes("skylight")) return "skylight";
  return "building component";
}

// ─── Main Caption Generator ─────────────────────────────────────────────────

/**
 * Generate a professional inspector-style caption for an evidence cluster.
 *
 * Format:
 * [Observation] [Technical Explanation] Per {IRC Code} — {Code Title}. [Claim Impact]
 */
export function generateCaption(
  cluster: EvidenceCluster,
  options?: {
    /** The event type (e.g., "hail storm", "windstorm") */
    eventType?: string;
    /** Index for variation */
    variationIndex?: number;
  }
): string {
  const category = selectCategory(cluster.damageType);
  const templates = CAPTION_TEMPLATES[category] || CAPTION_TEMPLATES.general;
  const idx = (options?.variationIndex || 0) % templates.length;
  const template = templates[idx];

  const component = componentLabel(cluster.damageType);
  const event = options?.eventType || "storm";

  // Build observation
  let observation = template.observation
    .replace(/\{component\}/g, component)
    .replace(/\{event\}/g, event);

  // Build technical
  let technical = template.technical
    .replace(/\{component\}/g, component)
    .replace(/\{event\}/g, event);

  // Build code reference
  let codeRef = "";
  if (cluster.ircCode) {
    codeRef = `Per ${cluster.ircCode.code} — ${cluster.ircCode.title}.`;
  }

  // Build claim impact
  let claimImpact = template.claimImpact
    .replace(/\{component\}/g, component)
    .replace(/\{event\}/g, event);

  // Assemble full caption
  const parts = [observation, technical];
  if (codeRef) parts.push(codeRef);
  parts.push(claimImpact);

  return parts.join(" ");
}

/**
 * Generate a short caption suitable for PDF annotation labels (max 60 chars).
 */
export function generateShortCaption(cluster: EvidenceCluster): string {
  const component = componentLabel(cluster.damageType);
  const severity =
    cluster.severity.charAt(0).toUpperCase() + cluster.severity.slice(1).toLowerCase();

  let caption = `${severity} ${cluster.color.label} — ${component}`;
  if (caption.length > 60) {
    caption = `${severity} ${cluster.color.label}`;
  }
  return caption;
}

/**
 * Generate captions for all clusters in a photo.
 * Returns the clusters with updated captions.
 */
export function generateCaptionsForPhoto(
  clusters: EvidenceCluster[],
  options?: { eventType?: string }
): EvidenceCluster[] {
  return clusters.map((cluster, idx) => ({
    ...cluster,
    caption: generateCaption(cluster, {
      eventType: options?.eventType,
      variationIndex: idx,
    }),
  }));
}
