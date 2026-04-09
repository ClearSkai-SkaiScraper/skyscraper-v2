/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
// lib/reports/ai/damage.ts

import { ensureOpenAI } from "@/lib/ai/client";

import { ClientAndClaimSnapshot, PhotoWithCaption } from "../types";
import { extractFirstOutputText } from "./responseText";

const openai = ensureOpenAI();

export async function aiGenerateDamageCaptions(
  photos: Array<{ url: string }>,
  claim: ClientAndClaimSnapshot
): Promise<PhotoWithCaption[]> {
  const output: PhotoWithCaption[] = [];

  for (const photo of photos) {
    const res = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: `Analyze this roof/exterior damage photo for hail/wind/etc:
          Claim: ${JSON.stringify(claim, null, 2)}
          Return JSON with:
          - location
          - component
          - severity (MINOR/MODERATE/SEVERE)
          - recommendation
          - causeTag (hail, wind, etc)
        `,
        },
        {
          role: "user",
          content: [{ type: "input_image", image_url: photo.url, detail: "auto" }],
        },
      ],
      max_output_tokens: 250,
    });

    try {
      const text = extractFirstOutputText(res);
      const parsed: PhotoWithCaption = JSON.parse(text);
      output.push({ ...parsed, url: photo.url });
    } catch {
      output.push({
        url: photo.url,
        label: "Unparsed AI result",
        severity: "MINOR",
      });
    }
  }

  return output;
}
