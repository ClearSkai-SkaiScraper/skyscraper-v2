// lib/weather/ai-weather-builder.ts
import { z } from "zod";

import { getOpenAI } from "@/lib/openai";

export const WeatherIntelSchema = z.object({
  stormSummary: z.string(),
  hazardLevel: z.string(),
  hail: z.object({
    sizeMax: z.string().optional(),
    density: z.string().optional(),
    hardness: z.string().optional(),
    swathByAddress: z.string().optional(),
    probabilityOfDamage: z.string().optional(),
  }),
  wind: z.object({
    gustMax: z.string().optional(),
    gust3sec: z.string().optional(),
    direction: z.string().optional(),
    structuralRisk: z.string().optional(),
  }),
  rain: z.object({
    rain24hr: z.string().optional(),
    rain72hr: z.string().optional(),
    floodIndex: z.string().optional(),
  }),
  radar: z.object({
    narrative: z.string().optional(),
    stormTrack: z.string().optional(),
  }),
  iceSnow: z.object({
    freezeThaw: z.string().optional(),
    snowLoad: z.string().optional(),
    iceIndex: z.string().optional(),
  }),
  timeline: z.string(),
  severityScore: z.number(),
  conclusions: z.string(),
});

export type WeatherIntel = z.infer<typeof WeatherIntelSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runWeatherIntel(payload: any): Promise<WeatherIntel> {
  const openai = getOpenAI();

  const system = `
You are SKAI-WEATHER, an elite meteorological intelligence engine used by
contractors, public adjusters, and insurance carriers. You produce
forensic-grade, structured JSON results.

DATA YOU CAN REFER TO:
- NOAA Storm Events Database
- NEXRAD Radar Data Summary
- NOAA HAIL SWATH trends (not live pulls)
- Local climate baselines
- SPC wind/hail climatology
- Common carrier weather thresholds
- Property-level wind & hail risk factors
- Roof system vulnerabilities

NEVER make up exact coordinates or exact hail sizes.
Use probabilistic, climatology-based, and radar-indicated language.
Your job is to synthesize the *likeliest* meteorological picture
based on:
- Date of loss
- Peril type
- Address
- Storm context
- Selected report toggles
- Storm climatology for the region
  `;

  const user = `
Build a complete meteorological intelligence analysis for:

Address: ${payload.address}
GPS: ${payload.gps}
Date of Loss: ${payload.dateOfLoss}
Peril: ${payload.peril}

Selected Weather Toggles:
${JSON.stringify(payload.options || payload.toggles || {}, null, 2)}

Return ONLY valid JSON that follows the schema.
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "weather_intel_schema",
        strict: true,
        schema: {
          type: "object",
          properties: {
            stormSummary: { type: "string" },
            hazardLevel: { type: "string" },
            hail: {
              type: "object",
              properties: {
                sizeMax: { type: "string" },
                density: { type: "string" },
                hardness: { type: "string" },
                swathByAddress: { type: "string" },
                probabilityOfDamage: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
            wind: {
              type: "object",
              properties: {
                gustMax: { type: "string" },
                gust3sec: { type: "string" },
                direction: { type: "string" },
                structuralRisk: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
            rain: {
              type: "object",
              properties: {
                rain24hr: { type: "string" },
                rain72hr: { type: "string" },
                floodIndex: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
            radar: {
              type: "object",
              properties: {
                narrative: { type: "string" },
                stormTrack: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
            iceSnow: {
              type: "object",
              properties: {
                freezeThaw: { type: "string" },
                snowLoad: { type: "string" },
                iceIndex: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
            timeline: { type: "string" },
            severityScore: { type: "number" },
            conclusions: { type: "string" },
          },
          required: ["stormSummary", "hazardLevel", "hail", "wind", "rain", "radar", "iceSnow", "timeline", "severityScore", "conclusions"],
          additionalProperties: false,
        },
      },
    },
    max_tokens: 2000,
    temperature: 0.6,
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No weather intelligence generated");
  return JSON.parse(result);
}
