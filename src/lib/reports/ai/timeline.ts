/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/reports/ai/timeline.ts

import { ensureOpenAI } from "@/lib/ai/client";

import { extractFirstOutputText } from "./responseText";

const openai = ensureOpenAI();

export async function aiGenerateTimeline(jobSchedule: any[], org: any) {
  const basePhases = jobSchedule?.length
    ? `Real schedule data: ${JSON.stringify(jobSchedule)}`
    : `
      Generate a standard roofing project timeline:
      - Material delivery
      - Tear-off
      - Dry-in
      - Install
      - Clean up
    `;

  const res = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: `
        Create a project timeline for ${org.name}.
        ${basePhases}

        Format as:
        {
          "aiTimelineTitle": "",
          "aiTimelineSteps": [
            { "label": "", "description": "" }
          ]
        }
        `,
      },
    ],
    max_output_tokens: 200,
  });

  try {
    return JSON.parse(extractFirstOutputText(res));
  } catch {
    return {
      aiTimelineTitle: "Project Timeline",
      aiTimelineSteps: [],
    };
  }
}
