// lib/intel/correlation/damage-weather.ts
import { getOpenAI } from "@/lib/openai";

export interface CorrelationResult {
  summary: string;
  hailCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  windCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  rainLeakCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  freezeThawCorrelation: {
    likelihood: number;
    explanation: string;
    evidence: string[];
  };
  timelineMatch: {
    score: number;
    explanation: string;
  };
  finalCausationConclusion: string;
  recommendations: string[];
}

export async function correlateDamageWithWeather({
  weather,
  damage,
  specs,
  codes,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any): Promise<CorrelationResult> {
  const prompt = buildCorrelationPrompt(weather, damage, specs, codes);
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a forensic building damage expert providing courtroom-level causation analysis.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "damage_correlation_schema",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            hailCorrelation: {
              type: "object",
              properties: {
                likelihood: { type: "number" },
                explanation: { type: "string" },
                evidence: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["likelihood", "explanation", "evidence"],
              additionalProperties: false,
            },
            windCorrelation: {
              type: "object",
              properties: {
                likelihood: { type: "number" },
                explanation: { type: "string" },
                evidence: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["likelihood", "explanation", "evidence"],
              additionalProperties: false,
            },
            rainLeakCorrelation: {
              type: "object",
              properties: {
                likelihood: { type: "number" },
                explanation: { type: "string" },
                evidence: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["likelihood", "explanation", "evidence"],
              additionalProperties: false,
            },
            freezeThawCorrelation: {
              type: "object",
              properties: {
                likelihood: { type: "number" },
                explanation: { type: "string" },
                evidence: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["likelihood", "explanation", "evidence"],
              additionalProperties: false,
            },
            timelineMatch: {
              type: "object",
              properties: {
                score: { type: "number" },
                explanation: { type: "string" },
              },
              required: ["score", "explanation"],
              additionalProperties: false,
            },
            finalCausationConclusion: { type: "string" },
            recommendations: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: [
            "summary",
            "hailCorrelation",
            "windCorrelation",
            "rainLeakCorrelation",
            "freezeThawCorrelation",
            "timelineMatch",
            "finalCausationConclusion",
            "recommendations",
          ],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.4,
    max_tokens: 3000,
  });

  const result = completion.choices[0].message.content;
  if (!result) throw new Error("No correlation result generated");

  return JSON.parse(result);
}

function buildCorrelationPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  damage: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codes: any
): string {
  return `
You are a forensic building damage expert providing courtroom-level causation analysis.

CORRELATE the following data to determine causation:

WEATHER DATA:
${JSON.stringify(weather || {}, null, 2)}

DAMAGE FINDINGS:
${JSON.stringify(damage || {}, null, 2)}

MANUFACTURER SPECS:
${JSON.stringify(specs || {}, null, 2)}

CODE REQUIREMENTS:
${JSON.stringify(codes || {}, null, 2)}

INSTRUCTIONS:
1. Analyze each type of damage against weather events
2. Calculate likelihood scores (0-100) based on:
   - Physical evidence consistency
   - Timeline proximity
   - Manufacturer tolerance thresholds
   - Code load requirements
   - Weather intensity vs damage severity
3. Provide specific evidence for each correlation
4. Match damage patterns with directional weather data
5. Consider alternative causes and rule them out
6. Build a forensic conclusion suitable for insurance claims

Write as a forensic expert giving testimony. Be specific, technical, and confident.
All likelihood scores must be between 0-100.
All evidence arrays must contain at least 1 item if likelihood > 0.
`;
}
