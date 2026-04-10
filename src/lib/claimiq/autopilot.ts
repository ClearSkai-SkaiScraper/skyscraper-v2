/**
 * ClaimIQ™ Autopilot — Intelligent Action Resolution Engine
 *
 * When a section is missing something, Autopilot decides:
 *   1. COLLECT — fetch it from an external source (weather, CRM)
 *   2. DERIVE  — compute it from existing claim data (detections → grids)
 *   3. GENERATE — AI-produce it from available evidence (narratives, letters)
 *   4. PROMPT  — ask the user to provide it (signatures, statements)
 *
 * This engine maps every known missing-field to its optimal resolution path.
 */

import { logger } from "@/lib/logger";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AutopilotAction = "collect" | "derive" | "generate" | "prompt";

export interface AutopilotResolution {
  field: string;
  action: AutopilotAction;
  /** Human label */
  label: string;
  /** What will happen */
  description: string;
  /** API endpoint to call (for collect/derive/generate) */
  endpoint?: string;
  /** HTTP method */
  method?: "GET" | "POST";
  /** Body payload factory — receives claimId + orgId */
  buildPayload?: (ctx: { claimId: string; orgId: string }) => Record<string, unknown>;
  /** Route to navigate to (for prompt) */
  route?: string;
  /** Estimated time in seconds */
  estimatedTime?: number;
  /** Token cost (if AI-based) */
  tokenCost?: number;
  /** Can run without user interaction? */
  autonomous: boolean;
  /** Priority: lower = run first */
  priority: number;
}

export interface AutopilotPlan {
  claimId: string;
  totalActions: number;
  autonomousActions: number;
  promptActions: number;
  estimatedTime: number;
  estimatedTokens: number;
  actions: AutopilotResolution[];
}

export interface AutopilotResult {
  field: string;
  action: AutopilotAction;
  success: boolean;
  message: string;
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolution Registry — maps missing fields to fix strategies
// ─────────────────────────────────────────────────────────────────────────────

const RESOLUTION_REGISTRY: Record<string, Omit<AutopilotResolution, "field">> = {
  // ── COLLECT: External data fetches ─────────────────────────────────────

  weather_report: {
    action: "collect",
    label: "Fetch Weather Verification",
    description:
      "Automatically pull NOAA storm data, Mesonet readings, and NWS alerts for the date of loss",
    endpoint: "/api/claims/{claimId}/weather/quick-verify",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId }),
    estimatedTime: 15,
    tokenCost: 0.5,
    autonomous: true,
    priority: 1,
  },

  weather_verification: {
    action: "collect",
    label: "Run Weather Verification",
    description: "Pull historical weather data from NOAA and local weather stations",
    endpoint: "/api/claims/{claimId}/weather/quick-verify",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId }),
    estimatedTime: 15,
    tokenCost: 0.5,
    autonomous: true,
    priority: 1,
  },

  weather_narrative: {
    action: "generate",
    label: "Generate Weather Narrative",
    description: "AI-generate cause-of-loss narrative from verified weather data",
    endpoint: "/api/claims-folder/generate/cause-of-loss",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId }),
    estimatedTime: 10,
    tokenCost: 1,
    autonomous: true,
    priority: 3,
  },

  // ── DERIVE: Compute from existing data ─────────────────────────────────

  analyzed_photos: {
    action: "derive",
    label: "Run AI Photo Analysis",
    description: "Run YOLO damage detection + GPT-4 vision analysis on all uploaded photos",
    endpoint: "/api/photos/analyze",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId, analyzeAll: true }),
    estimatedTime: 30,
    tokenCost: 1,
    autonomous: true,
    priority: 2,
  },

  damage_grids: {
    action: "derive",
    label: "Build Damage Grids from Detections",
    description: "Auto-populate damage grids from YOLO bounding box detections on analyzed photos",
    endpoint: "/api/claims-folder/sections/damage-grids",
    method: "GET",
    estimatedTime: 3,
    tokenCost: 0,
    autonomous: true,
    priority: 4,
  },

  code_requirements: {
    action: "derive",
    label: "Load Code Compliance Data",
    description: "Pull IRC/IBC code requirements based on property jurisdiction and roof type",
    endpoint: "/api/claims-folder/sections/code-compliance",
    method: "GET",
    estimatedTime: 3,
    tokenCost: 0,
    autonomous: true,
    priority: 4,
  },

  // ── GENERATE: AI-produce from evidence ─────────────────────────────────

  executive_summary: {
    action: "generate",
    label: "Generate Executive Summary",
    description:
      "AI-produce a professional executive summary from weather, photos, and damage data",
    endpoint: "/api/claims-folder/generate/executive-summary",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId }),
    estimatedTime: 12,
    tokenCost: 1,
    autonomous: true,
    priority: 5,
  },

  damage_report: {
    action: "generate",
    label: "Generate Damage Report",
    description: "AI-generate a comprehensive damage report from photo analysis results",
    endpoint: "/api/claims-folder/generate/cause-of-loss",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId }),
    estimatedTime: 15,
    tokenCost: 1,
    autonomous: true,
    priority: 5,
  },

  justification_report: {
    action: "generate",
    label: "Generate Repair Justification",
    description: "AI-generate code-backed repair justifications with IRC/IBC references",
    endpoint: "/api/claims-folder/generate/repair-justification",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId }),
    estimatedTime: 15,
    tokenCost: 1,
    autonomous: true,
    priority: 6,
  },

  adjuster_cover_letter: {
    action: "generate",
    label: "Generate Adjuster Cover Letter",
    description: "AI-produce a professional cover letter addressed to the insurance adjuster",
    endpoint: "/api/claims-folder/generate/cover-letter",
    method: "POST",
    buildPayload: (ctx) => ({ claimId: ctx.claimId }),
    estimatedTime: 8,
    tokenCost: 1,
    autonomous: true,
    priority: 7,
  },

  table_of_contents: {
    action: "derive",
    label: "Auto-generate Table of Contents",
    description: "Automatically build TOC from completed sections",
    endpoint: "/api/claims-folder/sections/table-of-contents",
    method: "GET",
    estimatedTime: 1,
    tokenCost: 0,
    autonomous: true,
    priority: 10,
  },

  claim_checklist: {
    action: "derive",
    label: "Auto-derive Claim Checklist",
    description: "Auto-populate checklist from section completion status",
    endpoint: "/api/claims-folder/sections/claim-checklist",
    method: "GET",
    estimatedTime: 1,
    tokenCost: 0,
    autonomous: true,
    priority: 10,
  },

  // ── PROMPT: Requires user input ────────────────────────────────────────

  insured_name: {
    action: "prompt",
    label: "Add Homeowner Name",
    description: "Enter the insured / homeowner name on the claim record",
    route: "/claims/{claimId}",
    estimatedTime: 30,
    autonomous: false,
    priority: 1,
  },

  property_address: {
    action: "prompt",
    label: "Add Property Address",
    description: "Enter the property street address, city, state, zip",
    route: "/claims/{claimId}",
    estimatedTime: 30,
    autonomous: false,
    priority: 1,
  },

  carrier: {
    action: "prompt",
    label: "Add Insurance Carrier",
    description: "Enter the insurance company handling this claim",
    route: "/claims/{claimId}",
    estimatedTime: 15,
    autonomous: false,
    priority: 2,
  },

  policy_number: {
    action: "prompt",
    label: "Add Policy Number",
    description: "Enter the insurance policy number",
    route: "/claims/{claimId}",
    estimatedTime: 15,
    autonomous: false,
    priority: 2,
  },

  date_of_loss: {
    action: "prompt",
    label: "Set Date of Loss",
    description: "Enter the storm / loss event date",
    route: "/claims/{claimId}",
    estimatedTime: 10,
    autonomous: false,
    priority: 1,
  },

  claim_number: {
    action: "prompt",
    label: "Add Claim Number",
    description: "Enter the insurance claim reference number",
    route: "/claims/{claimId}",
    estimatedTime: 10,
    autonomous: false,
    priority: 3,
  },

  photos: {
    action: "prompt",
    label: "Upload Inspection Photos",
    description: "Upload at least 10 property photos for AI analysis",
    route: "/claims/{claimId}/photos",
    estimatedTime: 120,
    autonomous: false,
    priority: 1,
  },

  scope_items: {
    action: "prompt",
    label: "Upload Scope / Estimate",
    description: "Upload Xactimate ESX or manual scope document",
    route: "/claims/{claimId}/documents",
    estimatedTime: 60,
    autonomous: false,
    priority: 3,
  },

  estimate: {
    action: "prompt",
    label: "Add Repair Estimate",
    description: "Upload or create a repair estimate / scope of work",
    route: "/claims/{claimId}/documents",
    estimatedTime: 60,
    autonomous: false,
    priority: 3,
  },

  digital_signatures: {
    action: "prompt",
    label: "Collect Digital Signatures",
    description: "Get homeowner and contractor signatures",
    route: "/claims/{claimId}",
    estimatedTime: 300,
    autonomous: false,
    priority: 8,
  },

  homeowner_signature: {
    action: "prompt",
    label: "Get Homeowner Signature",
    description: "Collect the homeowner's authorization signature",
    route: "/claims/{claimId}",
    estimatedTime: 300,
    autonomous: false,
    priority: 8,
  },

  homeowner_statement: {
    action: "prompt",
    label: "Get Homeowner Statement",
    description: "The homeowner must provide a written statement about the loss",
    route: "/claims/{claimId}",
    estimatedTime: 600,
    autonomous: false,
    priority: 9,
  },

  contractor_info: {
    action: "prompt",
    label: "Complete Company Profile",
    description: "Add license, insurance, and contact info to your company profile",
    route: "/settings/company",
    estimatedTime: 120,
    autonomous: false,
    priority: 4,
  },

  roof_type: {
    action: "prompt",
    label: "Add Roof Type & Age",
    description: "Set the roof material type and estimated age on the property",
    route: "/claims/{claimId}",
    estimatedTime: 15,
    autonomous: false,
    priority: 3,
  },

  inspection_data: {
    action: "prompt",
    label: "Complete Inspection Details",
    description: "Enter inspection date, inspector name, and findings",
    route: "/claims/{claimId}",
    estimatedTime: 120,
    autonomous: false,
    priority: 3,
  },

  supplements: {
    action: "prompt",
    label: "Upload Supplement",
    description: "Upload supplement documentation if available",
    route: "/claims/{claimId}/documents",
    estimatedTime: 60,
    autonomous: false,
    priority: 7,
  },

  timeline: {
    action: "prompt",
    label: "Log Claim Activities",
    description: "Record key dates and events for the claims timeline",
    route: "/claims/{claimId}",
    estimatedTime: 120,
    autonomous: false,
    priority: 6,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy field name resolver
// ─────────────────────────────────────────────────────────────────────────────

function resolveField(raw: string): string {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  // Exact match
  if (RESOLUTION_REGISTRY[normalized]) return normalized;

  // Common variations
  const aliases: Record<string, string> = {
    weather: "weather_report",
    run_weather_verification: "weather_report",
    run_weather_verification_for_this_claim: "weather_report",
    weather_cause_of_loss: "weather_narrative",
    upload_inspection_photos: "photos",
    upload_claim_photos: "photos",
    photo_analysis: "analyzed_photos",
    run_photo_analysis: "analyzed_photos",
    run_ai_analysis_on_photos: "analyzed_photos",
    run_ai_analysis_on_uploaded_photos: "analyzed_photos",
    photo_analysis__run_detection_: "analyzed_photos",
    damage_report_generated: "damage_report",
    generate_damage_report: "damage_report",
    generate_justification_report: "justification_report",
    justification: "justification_report",
    repair_justification: "justification_report",
    homeowner___insured_name: "insured_name",
    homeowner_name: "insured_name",
    insurance_carrier: "carrier",
    set_date_of_loss: "date_of_loss",
    set_date_of_loss_on_claim: "date_of_loss",
    upload_or_create_scope_estimate: "scope_items",
    upload_scope_estimate: "scope_items",
    generate_code_compliance_analysis: "code_requirements",
    complete_company_profile: "contractor_info",
    company_profile: "contractor_info",
    roof_type__set_on_property_: "roof_type",
    adjuster_name: "claim_number",
    adjuster_name__add_to_claim_: "claim_number",
    collect_digital_signatures: "digital_signatures",
    no_timeline_events_recorded_yet: "timeline",
    homeowner_statement_must_be_provided_by_the_homeowner: "homeowner_statement",
  };

  if (aliases[normalized]) return aliases[normalized];

  // Partial match
  for (const key of Object.keys(RESOLUTION_REGISTRY)) {
    if (normalized.includes(key) || key.includes(normalized)) return key;
  }

  return normalized;
}

// ─────────────────────────────────────────────────────────────────────────────
// Autopilot Plan Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given the ClaimIQ readiness output, build an ordered plan of actions
 * to resolve all missing data — prioritized, with autonomous vs. prompt split.
 */
export function buildAutopilotPlan(claimId: string, missingItems: string[]): AutopilotPlan {
  const seen = new Set<string>();
  const actions: AutopilotResolution[] = [];

  for (const raw of missingItems) {
    const fieldKey = resolveField(raw);
    if (seen.has(fieldKey)) continue;
    seen.add(fieldKey);

    const reg = RESOLUTION_REGISTRY[fieldKey];
    if (reg) {
      actions.push({
        ...reg,
        field: fieldKey,
        endpoint: reg.endpoint?.replace("{claimId}", claimId),
        route: reg.route?.replace("{claimId}", claimId),
      });
    } else {
      // Unknown field — create a generic prompt action
      actions.push({
        field: fieldKey,
        action: "prompt",
        label: raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: `Provide: ${raw}`,
        route: `/claims/${claimId}`,
        autonomous: false,
        priority: 10,
      });
    }
  }

  // Sort by priority (lower = first), then autonomous before prompt
  actions.sort((a, b) => {
    if (a.autonomous !== b.autonomous) return a.autonomous ? -1 : 1;
    return a.priority - b.priority;
  });

  const autonomousActions = actions.filter((a) => a.autonomous);
  const promptActions = actions.filter((a) => !a.autonomous);

  return {
    claimId,
    totalActions: actions.length,
    autonomousActions: autonomousActions.length,
    promptActions: promptActions.length,
    estimatedTime: actions.reduce((sum, a) => sum + (a.estimatedTime || 0), 0),
    estimatedTokens: actions.reduce((sum, a) => sum + (a.tokenCost || 0), 0),
    actions,
  };
}

/**
 * Execute a single autopilot action. Returns result with success/failure.
 * Only executes autonomous actions (collect/derive/generate).
 * Prompt actions return instructions to show the user.
 */
export async function executeAutopilotAction(
  resolution: AutopilotResolution,
  ctx: { claimId: string; orgId: string; cookies?: string }
): Promise<AutopilotResult> {
  const start = Date.now();

  if (!resolution.autonomous || resolution.action === "prompt") {
    return {
      field: resolution.field,
      action: resolution.action,
      success: true,
      message: `User action required: ${resolution.description}`,
      durationMs: 0,
    };
  }

  if (!resolution.endpoint) {
    return {
      field: resolution.field,
      action: resolution.action,
      success: false,
      message: "No endpoint configured for this action",
      durationMs: 0,
    };
  }

  try {
    const payload = resolution.buildPayload?.(ctx) ?? { claimId: ctx.claimId };
    const url = resolution.endpoint;
    const method = resolution.method || "POST";

    logger.info("[AUTOPILOT] Executing", {
      field: resolution.field,
      action: resolution.action,
      endpoint: url,
    });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ctx.cookies) headers["Cookie"] = ctx.cookies;

    const res = await fetch(
      // eslint-disable-next-line no-restricted-syntax
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${url}${method === "GET" ? `?claimId=${ctx.claimId}` : ""}`,
      {
        method,
        headers,
        ...(method === "POST" ? { body: JSON.stringify(payload) } : {}),
      }
    );

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      logger.error("[AUTOPILOT] Action failed", {
        field: resolution.field,
        status: res.status,
        error: errText,
      });
      return {
        field: resolution.field,
        action: resolution.action,
        success: false,
        message: `Failed (${res.status}): ${errText.slice(0, 200)}`,
        durationMs: elapsed,
      };
    }

    logger.info("[AUTOPILOT] Action completed", {
      field: resolution.field,
      elapsed: `${elapsed}ms`,
    });

    return {
      field: resolution.field,
      action: resolution.action,
      success: true,
      message: `${resolution.label} completed successfully`,
      durationMs: elapsed,
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    logger.error("[AUTOPILOT] Action error", { field: resolution.field, error: err });
    return {
      field: resolution.field,
      action: resolution.action,
      success: false,
      message: err instanceof Error ? err.message : "Unknown error",
      durationMs: elapsed,
    };
  }
}
