/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */
// lib/reports/ai/warranty.ts

import { ensureOpenAI } from "@/lib/ai/client";

import { extractFirstOutputText } from "./responseText";

const openai = ensureOpenAI();

export async function aiGenerateWarrantySummary(option: any, org: any) {
  const prompt = `
  Create a clean, bullet-structured summary of this company warranty.

  Company: ${org.name}
  Slogan: ${org.slogan}

  Warranty:
  - Name: ${option.name}
  - Duration: ${option.durationYears} years
  - Transferable: ${option.isTransferable}
  - Coverage Text:
    ${option.coverageText}
  - Exclusions:
    ${option.exclusionsText}
  - Maintenance:
    ${option.maintenanceReq}
  `;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [{ role: "user", content: prompt }],
    max_output_tokens: 250,
  });

  return extractFirstOutputText(res);
}
