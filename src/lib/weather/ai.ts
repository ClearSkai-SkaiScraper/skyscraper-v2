/**
 * FREE WEATHER STACK - AI Weather Summary
 * Converts storm data into claims-ready impact paragraph
 */

import { getOpenAI } from "@/lib/ai/client";
import { safeAI } from "@/lib/aiGuard";
import { logger } from "@/lib/logger";
import type { DOLResult, PropertyContext, ScoredEvent } from "@/types/weather";

const MODEL = "gpt-4o-mini"; // Fast & cost-effective

/**
 * Generate AI summary of weather impact for insurance claims
 */
export async function aiSummarizeWeather(opts: {
  scored: ScoredEvent[];
  dol: DOLResult;
  property: PropertyContext;
}): Promise<string> {
  const { scored, dol, property } = opts;

  // Build context for AI
  const topEvents = scored
    .filter((e) => e.time_utc.startsWith(dol.recommended_date_utc))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const eventsSummary = topEvents
    .map((e) => {
      const mag = e.magnitude
        ? e.type === "hail_report"
          ? `${e.magnitude}" hail`
          : `${e.magnitude} mph wind`
        : e.type.replace("_", " ");

      return `- ${mag} at ${e.distance_miles.toFixed(1)}mi ${e.direction_cardinal} (${new Date(e.time_utc).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC)`;
    })
    .join("\n");

  const systemPrompt = `You are an insurance claims specialist writing weather verification summaries.
Your job: Convert storm data into a concise, professional impact paragraph for adjusters.

RULES:
- Write 2-3 sentences max
- Focus on damage potential (hail size, wind speed, proximity)
- Use passive, factual tone ("property was located within...", "severe weather occurred...")
- Include specific magnitudes and distances
- Avoid speculation or conclusions about actual damage
- End with data source citation

EXAMPLE OUTPUT:
"On June 15, 2024, severe thunderstorm activity occurred within 3.2 miles of the property location. National Weather Service reports confirmed 1.75-inch hail and 65 mph wind gusts in the immediate vicinity between 3:45 PM and 4:20 PM local time. This weather event represents significant potential for impact to exterior building components and roofing materials. (Source: NWS CAP Alerts, Iowa State Mesonet)"`;

  const userPrompt = `Property: ${property.address || `${property.lat}, ${property.lon}`}
Recommended Date of Loss: ${dol.recommended_date_utc}
Confidence: ${(dol.confidence * 100).toFixed(0)}%
Total Events Scanned: ${dol.total_events_scanned}

Top Events on ${dol.recommended_date_utc}:
${eventsSummary}

Generate a claims-ready weather impact summary.`;

  try {
    const openai = getOpenAI();
    const ai = await safeAI("weather-summary", () =>
      openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // Low temperature for factual consistency
        max_tokens: 300,
      })
    );

    if (!ai.ok) {
      throw new Error(ai.error);
    }

    const response = ai.result;
    const summary = response.choices[0]?.message?.content || "";

    if (!summary) {
      throw new Error("OpenAI returned empty summary");
    }

    return summary.trim();
  } catch (error) {
    logger.error("[AI] Weather summary generation failed:", error);

    // Fallback summary (no AI)
    return buildFallbackSummary(opts);
  }
}

/**
 * Fallback summary when AI is unavailable
 */
function buildFallbackSummary(opts: {
  scored: ScoredEvent[];
  dol: DOLResult;
  property: PropertyContext;
}): string {
  const { dol, property } = opts;

  const topEvent = dol.top_events[0];
  if (!topEvent) {
    return `Weather verification analysis completed for ${property.address || "property location"}. No significant severe weather events identified within the scan period. (Source: NWS CAP Alerts, Iowa State Mesonet)`;
  }

  const magText = topEvent.magnitude
    ? topEvent.type === "hail_report"
      ? `${topEvent.magnitude}-inch hail`
      : `${topEvent.magnitude} mph winds`
    : "severe weather activity";

  const date = new Date(dol.recommended_date_utc).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return `On ${date}, ${magText} was reported ${topEvent.distance_miles} miles ${topEvent.direction_cardinal} of the property location. National Weather Service data confirms ${dol.top_events.length} severe weather reports in the immediate vicinity during this time period. This weather event represents potential impact to property components. (Source: NWS CAP Alerts, Iowa State Mesonet)`;
}

/**
 * Generate source citations for weather data
 */
export function generateCitations(scored: ScoredEvent[]): string[] {
  const citations: string[] = [];

  const hasCap = scored.some((e) => e.source === "cap");
  const hasMesonet = scored.some((e) => e.source === "mesonet");

  if (hasCap) {
    citations.push(
      "National Weather Service (NWS) Common Alerting Protocol (CAP) - Severe Weather Warnings and Advisories. Data accessed via api.weather.gov."
    );
  }

  if (hasMesonet) {
    citations.push(
      "Iowa State University Iowa Environmental Mesonet - Local Storm Reports (Hail, Wind, Tornado). Data accessed via mesonet.agron.iastate.edu."
    );
  }

  if (citations.length === 0) {
    citations.push(
      "Weather data sourced from publicly available National Weather Service records."
    );
  }

  return citations;
}
