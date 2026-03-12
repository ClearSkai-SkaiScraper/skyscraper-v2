/**
 * POST /api/weather-chains
 * AI-powered storm history lookup using address + time span.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { address, years = 5 } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const ai = getOpenAI();

    const prompt = `You are a weather forensics expert for insurance claim investigations.

Given the property address: "${address}"
Time span: Last ${years} year(s) from today (${new Date().toISOString().slice(0, 10)}).

Research and generate a realistic list of significant weather events (hail storms, wind events, tornadoes, lightning, extreme heat) that would have affected this area. Use your knowledge of regional weather patterns for this location.

Return a JSON object with:
{
  "summary": "A 1-2 sentence overview of storm exposure for this area.",
  "events": [
    {
      "date": "YYYY-MM-DD",
      "type": "hail|wind|tornado|lightning|heat",
      "severity": "low|moderate|severe|extreme",
      "description": "Brief event title",
      "details": "Specific details (hail size, wind speed, damage reports)"
    }
  ]
}

Return 3-8 events sorted by date descending. Only include events that are realistic for this geographic region and time period. Return ONLY valid JSON, no markdown.`;

    const response = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "{}";
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.error("[WEATHER_CHAINS] Failed to parse AI response", { raw });
      parsed = { summary: "Unable to parse weather data. Please try again.", events: [] };
    }

    logger.info("[WEATHER_CHAINS] Generated", {
      orgId: ctx.orgId,
      address,
      years,
      eventCount: parsed.events?.length ?? 0,
    });

    return NextResponse.json({
      summary: parsed.summary || null,
      events: parsed.events || [],
      address,
      years,
    });
  } catch (error) {
    logger.error("[WEATHER_CHAINS] Error:", error);
    return NextResponse.json({ error: "Failed to generate weather chain" }, { status: 500 });
  }
}
