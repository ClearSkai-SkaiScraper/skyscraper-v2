/**
 * AI Report Generation Engine
 * Version: 1.0.0
 *
 * Deterministic report generation using OpenAI with retry logic and validation.
 */

import { report_templates } from "@prisma/client";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { getSectionByKey } from "@/lib/reports/templateSections";

import {
  getMaxTokensForSection,
  getSectionPrompt,
  REPORT_GENERATION_SYSTEM_PROMPT,
  ReportGenerationContext,
} from "./reportPrompts";

const openai = getOpenAI();

/**
 * Section config type - templates store sections in JSON, not a separate table
 */
interface TemplateSectionConfig {
  sectionKey: string;
  enabled: boolean;
  sectionOrder: number;
  aiInstructions?: string | null;
  layoutVariant?: string | null;
  title?: string;
}

/**
 * Generation configuration
 */
const GENERATION_CONFIG = {
  model: "gpt-4o",
  temperature: 0.3, // Deterministic output
  maxRetries: 3,
  retryDelay: 1000, // ms
};

export interface GeneratedSection {
  sectionKey: string;
  title?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any; // JSON structure
  variant?: string | null;
  generatedAt: Date;
  tokensUsed: number;
}

export interface GeneratedReport {
  reportId: string;
  templateId: string;
  sections: GeneratedSection[];
  context: ReportGenerationContext;
  generatedAt: Date;
  totalTokensUsed: number;
}

/**
 * Generate content for a single report section
 */
export async function generateReportSection(
  sectionConfig: TemplateSectionConfig,
  context: ReportGenerationContext,
  retryCount = 0
): Promise<GeneratedSection> {
  try {
    const sectionDef = getSectionByKey(sectionConfig.sectionKey);
    if (!sectionDef) {
      throw new Error(`Section definition not found: ${sectionConfig.sectionKey}`);
    }

    // Get custom AI instructions or use default
    const aiInstructions = sectionConfig.aiInstructions ?? sectionDef.aiRole;

    // Generate prompt
    const prompt = getSectionPrompt(
      sectionConfig.sectionKey,
      context,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sectionConfig.layoutVariant ?? (undefined as any),
      aiInstructions
    );

    // Get max tokens for this section
    const maxTokens = getMaxTokensForSection(sectionConfig.sectionKey);

    logger.debug(`[ReportGen] Generating section: ${sectionConfig.sectionKey}`);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: GENERATION_CONFIG.model,
      messages: [
        {
          role: "system",
          content: REPORT_GENERATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: GENERATION_CONFIG.temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("Empty response from OpenAI");
    }

    // Parse JSON response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedContent: any;
    try {
      parsedContent = JSON.parse(responseContent);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_parseError) {
      logger.error("[REPORT_GEN] Failed to parse JSON", { responseContent });
      throw new Error("Invalid JSON response from AI");
    }

    // Validate content structure (basic check)
    if (typeof parsedContent !== "object" || Array.isArray(parsedContent)) {
      throw new Error("AI response is not a valid object");
    }

    const tokensUsed = completion.usage?.total_tokens || 0;

    logger.info(`[REPORT_GEN] Section generated: ${sectionConfig.sectionKey}`, { tokensUsed });

    return {
      sectionKey: sectionConfig.sectionKey,
      title: sectionConfig.title,
      content: parsedContent,
      variant: sectionConfig.layoutVariant,
      generatedAt: new Date(),
      tokensUsed,
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error(`[REPORT_GEN] Error generating section ${sectionConfig.sectionKey}`, {
      error: error.message,
    });

    // Capture to Sentry (no prompts/completions)
    if (typeof window === "undefined") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error, {
        tags: { subsystem: "ai", operation: "report_generation" },
        extra: {
          sectionKey: sectionConfig.sectionKey,
          retryCount,
        },
      });
    }

    // Retry logic
    if (retryCount < GENERATION_CONFIG.maxRetries) {
      logger.debug(`[ReportGen] Retrying (${retryCount + 1}/${GENERATION_CONFIG.maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, GENERATION_CONFIG.retryDelay));
      return generateReportSection(sectionConfig, context, retryCount + 1);
    }

    // Max retries exceeded - return error content
    return {
      sectionKey: sectionConfig.sectionKey,
      title: sectionConfig.title,
      content: {
        error: true,
        message: `Failed to generate section: ${error.message}`,
      },
      variant: sectionConfig.layoutVariant,
      generatedAt: new Date(),
      tokensUsed: 0,
    };
  }
}

/**
 * Template with parsed section configuration
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface TemplateWithSections extends report_templates {
  parsedSections?: TemplateSectionConfig[];
}

/**
 * Parse section configuration from template JSON fields
 */
function parseSectionsFromTemplate(template: report_templates): TemplateSectionConfig[] {
  const sectionOrder = (template.section_order as string[] | null) ?? [];
  const sectionEnabled = (template.section_enabled as Record<string, boolean> | null) ?? {};

  return sectionOrder.map((key, index) => ({
    sectionKey: key,
    enabled: sectionEnabled[key] ?? true,
    sectionOrder: index,
  }));
}

/**
 * Generate all sections for a complete report
 */
export async function generateFullReport(
  template: report_templates,
  context: ReportGenerationContext,
  reportId: string
): Promise<GeneratedReport> {
  logger.debug(`[ReportGen] Starting full report generation for template: ${template.name}`);

  const sections = parseSectionsFromTemplate(template);
  logger.debug(`[ReportGen] Total sections: ${sections.length}`);

  const startTime = Date.now();
  let totalTokens = 0;
  const generatedSections: GeneratedSection[] = [];

  // Get section order from parsed sections
  const sectionOrder = sections
    .sort((a, b) => a.sectionOrder - b.sectionOrder)
    .map((s) => s.sectionKey);

  // Generate sections in order (only enabled sections)
  for (const sectionKey of sectionOrder) {
    const sectionConfig = sections.find((s) => s.sectionKey === sectionKey && s.enabled);

    if (!sectionConfig) {
      logger.debug(`[ReportGen] Skipping disabled or missing section: ${sectionKey}`);
      continue;
    }

    try {
      const generatedSection = await generateReportSection(sectionConfig, context);
      generatedSections.push(generatedSection);
      totalTokens += generatedSection.tokensUsed;

      logger.debug(
        `[REPORT_GEN] Progress: ${generatedSections.length}/${sections.filter((s) => s.enabled).length} sections`
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      logger.error(`[REPORT_GEN] Failed to generate section ${sectionKey}`, {
        error: error.message,
      });
      // Continue with other sections even if one fails
    }
  }

  const duration = Date.now() - startTime;
  logger.debug(`[ReportGen] ✓ Full report generated in ${duration}ms`);
  logger.debug(`[ReportGen] Total tokens used: ${totalTokens}`);
  logger.debug(`[ReportGen] Sections generated: ${generatedSections.length}`);

  return {
    reportId,
    templateId: template.id,
    sections: generatedSections,
    context,
    generatedAt: new Date(),
    totalTokensUsed: totalTokens,
  };
}

/**
 * Validate generated content structure
 */
export function validateGeneratedContent(
  sectionKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!content || typeof content !== "object") {
    errors.push("Content must be a valid object");
    return { valid: false, errors };
  }

  if (content.error) {
    errors.push("Content contains error flag");
    return { valid: false, errors };
  }

  // Section-specific validation
  switch (sectionKey) {
    case "cover":
      if (!content.title) errors.push("Missing title");
      if (!content.propertyInfo) errors.push("Missing propertyInfo");
      break;

    case "executive-summary":
      if (!content.summary) errors.push("Missing summary");
      if (!content.keyFindings || !Array.isArray(content.keyFindings)) {
        errors.push("Missing or invalid keyFindings array");
      }
      break;

    case "scope-matrix":
      if (!content.categories || !Array.isArray(content.categories)) {
        errors.push("Missing or invalid categories array");
      }
      if (!content.summary) errors.push("Missing summary");
      break;

    // Add more validations as needed
    default:
      // Generic validation passed
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Estimate token usage for a report generation
 */
export function estimateReportTokens(template: report_templates): number {
  const sections = parseSectionsFromTemplate(template);
  let estimate = 0;

  for (const section of sections) {
    if (section.enabled) {
      estimate += getMaxTokensForSection(section.sectionKey);
    }
  }

  // Add system prompt overhead (~200 tokens)
  estimate += 200 * sections.filter((s) => s.enabled).length;

  return estimate;
}

/**
 * Calculate cost estimate for report generation
 * GPT-4o pricing (as of Dec 2024): $2.50/1M input tokens, $10/1M output tokens
 */
export function estimateReportCost(estimatedTokens: number): number {
  // Assume 60% input, 40% output split
  const inputTokens = estimatedTokens * 0.6;
  const outputTokens = estimatedTokens * 0.4;

  const inputCost = (inputTokens / 1_000_000) * 2.5;
  const outputCost = (outputTokens / 1_000_000) * 10;

  return inputCost + outputCost;
}
