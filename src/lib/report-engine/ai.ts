// src/lib/report-engine/ai.ts
import { getOpenAI } from "@/lib/openai";

import { buildReportSystemPrompt } from "./ai-prompts";
import { buildMasterReportPayload } from "./buildMasterPayload";
import { GeneratedReport, ReportAudience,ReportKind } from "./report-types";

export async function runReportBuilder({
  claimId,
  reportType,
  audience,
  addonPayload,
  address,
  roofType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lossType,
  orgId,
}: {
  claimId: string;
  reportType: ReportKind;
  audience: ReportAudience;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addonPayload: any;
  address: string;
  roofType?: string;
  lossType?: string;
  orgId?: string | null;
}): Promise<GeneratedReport> {
  const openai = getOpenAI();

  // Gather all four datasets into a master payload
  const masterPayload = await buildMasterReportPayload({
    claimId,
    addonPayload,
    orgId: orgId ?? undefined,
  });

  const systemPrompt = buildReportSystemPrompt(reportType, audience);

  // JSON schema for the AI response
  const jsonSchema = {
    name: "generated_report",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        reportType: { type: "string" },
        audience: { type: "string" },
        executiveSummary: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              style: { type: "string" },
              audience: { type: "string" },
              content: { type: "string" },
              importance: { type: "string" },
            },
            required: ["id", "title", "style", "audience", "content", "importance"],
            additionalProperties: false,
          },
        },
        meta: {
          type: "object",
          properties: {
            claim_id: { type: "string" },
            claimNumber: { type: "string" },
            dateOfLoss: { type: "string" },
            location: { type: "string" },
            roofType: { type: "string" },
            totalRequested: { type: "number" },
            estimateMode: { type: "string" },
          },
          additionalProperties: true,
        },
      },
      required: ["title", "reportType", "audience", "sections", "meta"],
      additionalProperties: true,
    },
    strict: true,
  };

  const userPrompt = `Build a ${reportType} report for audience ${audience} using the following JSON payload:\n\n${JSON.stringify(masterPayload, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    temperature: 0.7,
    max_tokens: 4000,
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema,
    },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AI did not return any content");
  }

  const parsed = JSON.parse(content) as GeneratedReport;

  // Fallback safety: basic shaping if AI response is missing pieces
  if (!parsed || !parsed.sections) {
    return {
      title: "Report Generation Failed",
      reportType,
      audience,
      sections: [
        {
          id: "error",
          title: "Error",
          style: "plain",
          audience,
          content: "AI did not return a valid report structure.",
          importance: "HIGH" as const,
        },
      ],
      meta: {
        claimId,
        claimNumber: "",
        dateOfLoss: null,
        location: address,
        roofType: roofType ?? null,
        totalRequested: null,
        estimateMode: null,
      },
    };
  }

  return parsed;
}
