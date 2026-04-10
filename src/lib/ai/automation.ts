// src/lib/ai/automation.ts
import { getOpenAI } from "@/lib/openai";
import { CLAIM_AUTOMATION_PROMPT } from "@/lib/supplement/ai-prompts";

type RunClaimAutomationInput = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  claimContext: any; // you can strongly type later
};

export async function runClaimAutomation(input: RunClaimAutomationInput) {
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: CLAIM_AUTOMATION_PROMPT },
      { role: "user", content: JSON.stringify(input.claimContext, null, 2) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ClaimAutomationOutput",
        strict: true,
        schema: {
          type: "object",
          properties: {
            claimStage: {
              type: "object",
              properties: {
                current: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["current", "confidence"],
              additionalProperties: false,
            },
            gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" },
                },
                required: ["category", "description", "severity"],
                additionalProperties: false,
              },
            },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  priority: { type: "string" },
                  assignee: { type: "string" },
                  dueDate: { type: "string" },
                },
                required: ["title", "priority"],
                additionalProperties: false,
              },
            },
            summary: {
              type: "object",
              properties: {
                overallHealth: { type: "string" },
                recommendations: { type: "string" },
              },
              required: ["overallHealth"],
              additionalProperties: false,
            },
          },
          required: ["claimStage", "gaps", "actions", "summary"],
          additionalProperties: false,
        },
      },
    },
    temperature: 0.7,
    max_tokens: 4000,
  });

  const parsed = JSON.parse(
    completion.choices[0]?.message?.content || "{}"
  );
  return parsed;
}
