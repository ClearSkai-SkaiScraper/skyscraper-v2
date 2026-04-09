/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/reports/ai/summary-retail.ts

import { ensureOpenAI } from "@/lib/ai/client";

import { extractFirstOutputText } from "./responseText";

const openai = ensureOpenAI();

export async function aiGenerateRetailSummary(_data: any) {
  const prompt = `
    Summarize findings for a homeowner using friendly, plain English.
    Avoid insurance language.
  `;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [{ role: "user", content: prompt }],
    max_output_tokens: 200,
  });

  return {
    headline: "Your Home, Your Project",
    bullets: extractFirstOutputText(res)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
