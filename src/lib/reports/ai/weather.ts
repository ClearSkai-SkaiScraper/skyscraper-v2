/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/reports/ai/weather.ts

import { ensureOpenAI } from "@/lib/ai/client";

import { extractFirstOutputText } from "./responseText";

const openai = ensureOpenAI();

export async function aiGenerateWeatherNarrative(weatherData: any) {
  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: `
        Summarize this weather event(s) as it relates to residential roof damage.
        Use insurance-grade language.
        Keep it factual, objective, and no fluff.

        Data:
        ${JSON.stringify(weatherData, null, 2)}
      `,
      },
    ],
    max_output_tokens: 200,
  });

  return extractFirstOutputText(res);
}
