// src/lib/ai/weather.ts
import { getOpenAI } from "@/lib/openai";
import { QUICK_DOL_PROMPT, WEATHER_REPORT_PROMPT } from "@/lib/supplement/ai-prompts";

const openai = getOpenAI();

export type QuickDolInput = {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  startDate?: string;
  endDate?: string;
  peril?: "hail" | "wind" | "rain" | "snow" | "other";
};

export type QuickDolCandidate = {
  date: string;
  score: number;
  reason: string;
};

export type QuickDolResult = {
  peril: string;
  bestGuess: string | null;
  candidates: QuickDolCandidate[];
};

export async function runQuickDol(input: QuickDolInput): Promise<QuickDolResult> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: QUICK_DOL_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "QuickDolResult",
        strict: true,
        schema: {
          type: "object",
          properties: {
            peril: { type: "string" },
            bestGuess: {
              type: "string",
              description: "Best guess date or empty string if unknown",
            },
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  score: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["date", "score", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["peril", "bestGuess", "candidates"],
          additionalProperties: false,
        } as const,
      },
    },
  });

  const json = JSON.parse(completion.choices[0]?.message?.content || "{}") as QuickDolResult;
  return json;
}

export type WeatherReportInput = {
  claimId?: string | null;
  orgId?: string | null;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  dol: string;
  peril?: "hail" | "wind" | "rain" | "snow" | "other";
};

export type WeatherReportResult = {
  dol: string;
  peril: string;
  summary: string;
  events: Array<{
    type: string;
    date: string;
    time?: string;
    intensity?: string;
    notes?: string;
  }>;
  carrierTalkingPoints: string;
};

export async function runWeatherReport(input: WeatherReportInput): Promise<WeatherReportResult> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: WEATHER_REPORT_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "WeatherReportResult",
        strict: true,
        schema: {
          type: "object",
          properties: {
            dol: { type: "string" },
            peril: { type: "string" },
            summary: { type: "string" },
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  date: { type: "string" },
                  time: { type: "string" },
                  intensity: { type: "string" },
                  notes: { type: "string" },
                },
                required: ["type", "date", "time", "intensity", "notes"],
                additionalProperties: false,
              },
            },
            carrierTalkingPoints: { type: "string" },
          },
          required: ["dol", "peril", "summary", "events", "carrierTalkingPoints"],
          additionalProperties: false,
        } as const,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const json = JSON.parse(raw) as WeatherReportResult;

  // Ensure carrierTalkingPoints always has a value
  if (!json.carrierTalkingPoints) {
    json.carrierTalkingPoints = json.summary || "Weather report analysis complete.";
  }

  return json;
}
