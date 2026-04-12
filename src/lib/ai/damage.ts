// src/lib/ai/damage.ts
import { getOpenAI } from "@/lib/openai";
import { DAMAGE_BUILDER_SYSTEM_PROMPT } from "@/lib/supplement/ai-prompts";

type RunDamageBuilderInput = {
  claimId?: string | null;
  leadId?: string | null;
  orgId?: string | null;
  userId: string;
  photos: {
    url: string;
    id?: string;
    label?: string;
    tags?: string[];
  }[];
  hoverData?: unknown;
  carrierEstimateText?: string | null;
  notesText?: string | null;
};

export async function runDamageBuilder(input: RunDamageBuilderInput) {
  const openai = getOpenAI();

  // Shape context payload (text metadata only — photos sent as vision blocks below)
  const payload = {
    claimContext: {
      claim_id: input.claimId,
      leadId: input.leadId,
      orgId: input.orgId,
      userId: input.userId,
    },
    hoverData: input.hoverData ?? null,
    carrierEstimateText: input.carrierEstimateText ?? null,
    notesText: input.notesText ?? null,
    photoCount: input.photos.length,
    photoLabels: input.photos.map((p) => ({
      id: p.id,
      label: p.label,
      tags: p.tags,
    })),
  };

  // ═══════════════════════════════════════════════════════════════════════
  // CRITICAL FIX: Send photos as image_url content blocks
  // Previously photos were sent as JSON text strings — GPT-4o could NOT
  // see them, reducing detection to ~15%. Each photo is now a vision
  // content block so GPT-4o can actually analyze the images.
  // ═══════════════════════════════════════════════════════════════════════
  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" } }
  > = [
    {
      type: "text",
      text: `Analyze the following property for storm damage. Systematically scan every photo in a grid pattern. When in doubt, INCLUDE the finding — it is better to over-report than to miss damage.\n\nClaim Context:\n${JSON.stringify(payload, null, 2)}`,
    },
    // Send EVERY photo as a vision content block
    ...input.photos.map((photo) => ({
      type: "image_url" as const,
      image_url: {
        url: photo.url,
        detail: "high" as const,
      },
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    temperature: 0.5,
    top_p: 0.95,
    messages: [
      {
        role: "system",
        content: DAMAGE_BUILDER_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "DamageBuilderOutput",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                overallAssessment: { type: "string" },
                primaryPeril: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["overallAssessment", "primaryPeril", "confidence"],
              additionalProperties: false,
            },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  photoId: { type: ["string", "null"] },
                  location: {
                    type: "object",
                    properties: {
                      facet: { type: "string" },
                      elevation: { type: "string" },
                      notes: { type: "string" },
                    },
                    required: ["facet", "elevation", "notes"],
                    additionalProperties: false,
                  },
                  damageType: { type: "string" },
                  material: { type: "string" },
                  severity: { type: "string" },
                  perilAttribution: { type: "string" },
                  description: { type: "string" },
                  recommendedAction: { type: "string" },
                  confidence: { type: "number" },
                  quadrant: { type: ["string", "null"] },
                  weatherEvent: { type: ["string", "null"] },
                  measurements: {
                    type: "object",
                    properties: {
                      width_inches: { type: ["number", "null"] },
                      height_inches: { type: ["number", "null"] },
                      diameter_inches: { type: ["number", "null"] },
                      depth_estimate: { type: ["string", "null"] },
                    },
                    required: [
                      "width_inches",
                      "height_inches",
                      "diameter_inches",
                      "depth_estimate",
                    ],
                    additionalProperties: false,
                  },
                  suggestedLineItems: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        code: { type: "string" },
                        name: { type: "string" },
                        unit: { type: "string" },
                        estimatedQuantity: { type: "number" },
                        reason: { type: "string" },
                      },
                      required: ["code", "name", "unit", "estimatedQuantity", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: [
                  "id",
                  "photoId",
                  "location",
                  "damageType",
                  "material",
                  "severity",
                  "perilAttribution",
                  "description",
                  "recommendedAction",
                  "confidence",
                  "quadrant",
                  "weatherEvent",
                  "measurements",
                  "suggestedLineItems",
                ],
                additionalProperties: false,
              },
            },
            globalRecommendations: {
              type: "object",
              properties: {
                roofRecommendation: { type: "string" },
                notes: { type: "string" },
                escalationSuggestions: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["roofRecommendation", "notes", "escalationSuggestions"],
              additionalProperties: false,
            },
          },
          required: ["summary", "findings", "globalRecommendations"],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");

  // Return normalized shape
  return {
    peril: parsed.summary?.primaryPeril || "unknown",
    confidence: parsed.summary?.confidence || 0,
    summary: parsed.summary?.overallAssessment || "No assessment available",
    findings: parsed.findings || [],
    hoverData: input.hoverData,
    meta: {
      globalRecommendations: parsed.globalRecommendations || {},
      rawResponse: parsed,
    },
  };
}
