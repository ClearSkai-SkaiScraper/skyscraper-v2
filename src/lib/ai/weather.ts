// src/lib/ai/weather.ts
import { logger } from "@/lib/logger";
import { getOpenAI } from "@/lib/openai";
import { QUICK_DOL_PROMPT, WEATHER_REPORT_PROMPT } from "@/lib/supplement/ai-prompts";

export type QuickDolInput = {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  startDate?: string;
  endDate?: string;
  peril?: "hail" | "wind" | "rain" | "snow" | "other";
  /** Real Visual Crossing weather observations for the date range */
  weatherObservations?: Array<{
    date: string;
    highF: number;
    lowF: number;
    precipIn: number;
    precipProb: number;
    windMph: number;
    gustMph: number | null;
    conditions: string;
    description: string | null;
  }>;
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
  const openai = getOpenAI();

  // Build user message — include real weather data if available
  const userPayload: Record<string, unknown> = {
    address: input.address,
    startDate: input.startDate || null,
    endDate: input.endDate || null,
    peril: input.peril || null,
  };

  // Include real weather observations so the AI can ground its analysis
  if (input.weatherObservations && input.weatherObservations.length > 0) {
    // Cap at most recent 90 days to avoid oversized payloads
    const observations = input.weatherObservations.slice(0, 90);
    userPayload.observedWeatherData = observations;
    userPayload._dataNote = `REAL weather station data is provided (${observations.length} days). Use ONLY these measurements to identify storm dates. Do NOT invent weather events. Cite actual wind speeds, precipitation amounts, and conditions from this data.`;
    logger.info("[runQuickDol] Sending real weather data to GPT-4o", {
      daysCount: observations.length,
      address: input.address,
    });
  } else {
    userPayload._dataNote =
      "No observed weather station data is available. Analyze based on general knowledge of the region and time period. Clearly state that your analysis is based on general knowledge only, not verified station data.";
    logger.info("[runQuickDol] No weather data available — AI knowledge only", {
      address: input.address,
    });
  }

  try {
    const completion = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: QUICK_DOL_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify(userPayload),
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
      },
      { signal: AbortSignal.timeout(45000) }
    );

    const raw = completion.choices[0]?.message?.content || "{}";
    logger.info("[runQuickDol] GPT-4o response received", {
      candidateCount: (JSON.parse(raw) as QuickDolResult).candidates?.length ?? 0,
    });

    const json = JSON.parse(raw) as QuickDolResult;

    // Validate the response has actual data
    if (!json.candidates || !Array.isArray(json.candidates)) {
      logger.error("[runQuickDol] Invalid response — no candidates array", { raw });
      return { peril: json.peril || "unknown", bestGuess: null, candidates: [] };
    }

    return json;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown AI error";
    logger.error("[runQuickDol] OpenAI call failed:", { error: msg, address: input.address });
    throw new Error(`AI analysis failed: ${msg}`);
  }
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
  /** Real Visual Crossing observations — fed to AI so it won't hallucinate */
  weatherConditions?: Array<{
    datetime: string;
    tempmax: number;
    tempmin: number;
    precip: number;
    precipprob: number;
    windspeed: number;
    windgust?: number;
    conditions: string;
    icon: string;
    description?: string;
  }>;
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
    hailSize?: string;
    windSpeed?: string;
  }>;
  carrierTalkingPoints: string;
};

export async function runWeatherReport(input: WeatherReportInput): Promise<WeatherReportResult> {
  const openai = getOpenAI();

  // Build user message — include real weather data if available
  const userPayload: Record<string, unknown> = {
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    dol: input.dol,
    peril: input.peril,
  };

  if (input.weatherConditions && input.weatherConditions.length > 0) {
    userPayload.observedWeatherData = input.weatherConditions.map((d) => ({
      date: d.datetime,
      highF: d.tempmax,
      lowF: d.tempmin,
      precipIn: d.precip,
      precipProb: d.precipprob,
      windMph: d.windspeed,
      gustMph: d.windgust ?? null,
      conditions: d.conditions,
      description: d.description ?? null,
    }));
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: WEATHER_REPORT_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify(userPayload),
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
                  hailSize: {
                    type: "string",
                    description:
                      "Hail diameter if hail event, e.g. '1.75 inch'. Empty string if not applicable.",
                  },
                  windSpeed: {
                    type: "string",
                    description:
                      "Peak wind gust in mph if wind event, e.g. '65 mph'. Empty string if not applicable.",
                  },
                },
                required: ["type", "date", "time", "intensity", "notes", "hailSize", "windSpeed"],
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
