// src/lib/weather/report.ts
import { getOpenAI } from "@/lib/ai/client";
import type { DOLResult, ScoredEvent } from "@/types/weather";

function getOpenAIClient() {
  return getOpenAI();
}

export async function aiSummarizeWeather({
  scored,
  dol,
  lat,
  lon,
}: {
  scored: ScoredEvent[];
  dol: DOLResult;
  lat: number;
  lon: number;
}) {
  const client = getOpenAIClient();
  const primary = scored[0];
  const severity = classifySeverity(primary?.magnitude, primary?.distance_miles);
  const confidencePct = (dol.confidence * 100).toFixed(1);

  const sys = `
You are a meteorological claims analyst. Your job is to produce a clear, concise,
insurance-approved summary of storm activity affecting a specific property.

STRICT RULES:
- Do NOT guarantee damage or coverage.
- Use terms like "storm activity", "impact potential", "meteorological correlation".
- Reference hail size in inches and wind in mph.
- Use UTC time. DO NOT convert to local.
- Mention proximity in miles.
- Use professional tone, 120-180 words.
- End with a confidence statement: "Correlation Confidence: __%".
`;

  const user = {
    property: { lat, lon },
    recommendedDateOfLoss: dol.recommended_date_utc,
    severity,
    confidencePct,
    topEvents: scored.slice(0, 5).map((e) => ({
      type: e.type,
      magnitude: e.magnitude,
      distance_miles: e.distance_miles,
      time_utc: e.time_utc,
      source: e.source,
    })),
  };

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: JSON.stringify(user, null, 2) },
    ],
    temperature: 0.3,
  });

  return completion.choices[0].message.content!;
}

// Severity classifier based on hail inches + distance
function classifySeverity(hailInches?: number, distanceMiles?: number) {
  if (!hailInches) return "unknown";
  if (hailInches >= 1.75 && distanceMiles && distanceMiles <= 2) return "severe";
  if (hailInches >= 1.0 && distanceMiles && distanceMiles <= 5) return "moderate";
  if (hailInches >= 0.5 && distanceMiles && distanceMiles <= 8) return "minor";
  return "trace";
}
