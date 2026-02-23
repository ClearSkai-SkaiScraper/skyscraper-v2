import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

/**
 * Legacy GPT-4 helper — now wraps the unified OpenAI client
 */
export async function callGPT4(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.3,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    logger.error("[callGPT4] Empty response from OpenAI");
    throw new Error("Empty AI response");
  }
  return content;
}
