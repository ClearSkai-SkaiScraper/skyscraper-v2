import { logger } from "@/lib/logger";

/**
 * AI Assistant Integration
 *
 * OpenAI/Claude integration for claim analysis, document parsing, estimates
 * Smart automation and insights
 */

export interface AIConfig {
  provider: "openai" | "claude";
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Get AI configuration
 */
export function getAIConfig(): AIConfig {
  return {
    // eslint-disable-next-line no-restricted-syntax
    provider: (process.env.AI_PROVIDER as "openai" | "claude") || "openai",
    // eslint-disable-next-line no-restricted-syntax
    apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "",
    // eslint-disable-next-line no-restricted-syntax
    model: process.env.AI_MODEL || "gpt-4o",
    // eslint-disable-next-line no-restricted-syntax
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || "2000"),
    // eslint-disable-next-line no-restricted-syntax
    temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  };
}

/**
 * Analyze claim for insights
 */
export async function analyzeClaim(claimData: {
  lossType: string;
  lossDescription?: string;
  propertyType?: string;
  damagePhotos?: string[];
  documents?: string[];
}): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config.apiKey) {
    return {
      success: false,
      error: "AI API key not configured",
    };
  }

  const prompt = `Analyze this insurance claim and provide insights:

Loss Type: ${claimData.lossType}
Description: ${claimData.lossDescription || "Not provided"}
Property Type: ${claimData.propertyType || "Not provided"}

Provide:
1. Estimated severity (Low/Medium/High)
2. Key areas to inspect
3. Potential complications
4. Recommended documentation
5. Estimated timeline

Format as JSON.`;

  try {
    const response = await callAI(prompt, config);

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(response.result || "{}");
    } catch {
      result = { analysis: response.result };
    }

    return {
      success: true,
      result,
      usage: response.usage,
    };
  } catch (error) {
    logger.error("AI analysis failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "AI analysis failed",
    };
  }
}

/**
 * Generate job estimate from details
 */
export async function generateEstimate(jobDetails: {
  jobType: string;
  scopeOfWork: string;
  propertySize?: number;
  materials?: string[];
  laborRequired?: string[];
}): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config.apiKey) {
    return {
      success: false,
      error: "AI API key not configured",
    };
  }

  const prompt = `Generate a detailed job estimate for:

Job Type: ${jobDetails.jobType}
Scope of Work: ${jobDetails.scopeOfWork}
Property Size: ${jobDetails.propertySize || "Not specified"} sq ft
Materials: ${jobDetails.materials?.join(", ") || "Standard materials"}
Labor: ${jobDetails.laborRequired?.join(", ") || "Standard labor"}

Provide:
1. Itemized cost breakdown (materials, labor, equipment)
2. Total estimated cost range
3. Estimated timeline
4. Recommended add-ons or upgrades
5. Risk factors

Format as JSON with structure:
{
  "items": [{"name": "Item", "quantity": 1, "unit": "each", "unitCost": 100, "total": 100}],
  "subtotals": {"materials": 0, "labor": 0, "equipment": 0},
  "total": {"min": 0, "max": 0},
  "timeline": "X-Y weeks",
  "addOns": [],
  "risks": []
}`;

  try {
    const response = await callAI(prompt, config);

    let result;
    try {
      result = JSON.parse(response.result || "{}");
    } catch {
      result = { estimate: response.result };
    }

    return {
      success: true,
      result,
      usage: response.usage,
    };
  } catch (error) {
    logger.error("Estimate generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Estimate generation failed",
    };
  }
}

/**
 * Extract data from document text
 */
export async function parseDocument(
  documentText: string,
  documentType: "insurance_policy" | "estimate" | "invoice" | "contract"
): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config.apiKey) {
    return {
      success: false,
      error: "AI API key not configured",
    };
  }

  const schemas = {
    insurance_policy: {
      fields: [
        "policyNumber",
        "insuranceCompany",
        "coverageAmount",
        "deductible",
        "effectiveDate",
        "expirationDate",
      ],
    },
    estimate: {
      fields: ["estimateNumber", "date", "items", "subtotal", "tax", "total"],
    },
    invoice: {
      fields: ["invoiceNumber", "date", "items", "subtotal", "tax", "total", "dueDate"],
    },
    contract: {
      fields: ["contractNumber", "date", "parties", "scopeOfWork", "totalAmount", "paymentTerms"],
    },
  };

  const schema = schemas[documentType];

  const prompt = `Extract structured data from this ${documentType}:

${documentText}

Extract the following fields: ${schema.fields.join(", ")}

Return as JSON with extracted values. If a field is not found, return null for that field.`;

  try {
    const response = await callAI(prompt, config);

    let result;
    try {
      result = JSON.parse(response.result || "{}");
    } catch {
      result = { raw: response.result };
    }

    return {
      success: true,
      result,
      usage: response.usage,
    };
  } catch (error) {
    logger.error("Document parsing failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Document parsing failed",
    };
  }
}

/**
 * Suggest next actions for claim/job
 */
export async function suggestNextActions(context: {
  type: "claim" | "lead" | "job";
  status: string;
  recentActivity: string[];
  daysOpen: number;
}): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config.apiKey) {
    return {
      success: false,
      error: "AI API key not configured",
    };
  }

  const prompt = `Suggest next actions for this ${context.type}:

Status: ${context.status}
Days Open: ${context.daysOpen}
Recent Activity:
${context.recentActivity.map((a) => `- ${a}`).join("\n")}

Provide 3-5 specific, actionable next steps prioritized by importance.
Format as JSON array: [{"action": "Do X", "priority": "high", "reason": "Why"}]`;

  try {
    const response = await callAI(prompt, config);

    let result;
    try {
      result = JSON.parse(response.result || "[]");
    } catch {
      result = [{ action: response.result, priority: "medium", reason: "AI suggestion" }];
    }

    return {
      success: true,
      result,
      usage: response.usage,
    };
  } catch (error) {
    logger.error("Action suggestion failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Action suggestion failed",
    };
  }
}

/**
 * Call AI API (abstraction layer)
 */
export async function callAI(
  prompt: string,
  config: AIConfig
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ result: string; usage?: any }> {
  if (config.provider === "openai") {
    return callOpenAI(prompt, config);
  } else {
    return callClaude(prompt, config);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  config: AIConfig
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ result: string; usage?: any }> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert insurance claim and construction job assistant. Provide accurate, structured responses.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      result: data.choices[0].message.content,
      usage: data.usage,
    };
  } catch (error) {
    logger.error("OpenAI call failed:", error);
    throw error;
  }
}

/**
 * Call Claude API
 */
async function callClaude(
  prompt: string,
  config: AIConfig
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ result: string; usage?: any }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      result: data.content[0].text,
      usage: data.usage,
    };
  } catch (error) {
    logger.error("Claude call failed:", error);
    throw error;
  }
}
