/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/reports/ai/summary-claim.ts

import { ensureOpenAI } from "@/lib/ai/client";

import { ReportData } from "../types";
import { extractFirstOutputText } from "./responseText";

const openai = ensureOpenAI();

export async function aiGenerateClaimSummary(_data: ReportData) {
  const prompt = `
    Create a professional insurance adjuster summary using:
    - Damage findings
    - Weather verification
    - Materials
    - Estimates
    - Code requirements
  `;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [{ role: "user", content: prompt }],
    max_output_tokens: 250,
  });

  return {
    headline: "Claim Summary",
    bullets: extractFirstOutputText(res)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
