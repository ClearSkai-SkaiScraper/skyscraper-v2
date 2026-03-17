/**
 * PHASE 35: REAL-TIME AI STREAMING ENGINE
 *
 * Provides ChatGPT-level token-by-token streaming for all AI functions
 * using Server-Sent Events (SSE) and OpenAI streaming API.
 *
 * Performance targets:
 * - Time to first token: <500ms
 * - Perceived speed: 10x improvement vs batch
 * - Reconnection: Exponential backoff with 3 retries
 */

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

const openai = getOpenAI();

export interface StreamOptions {
  model: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Stream OpenAI completion token-by-token
 *
 * Usage:
 *   for await (const chunk of openAIStream(options)) {
 *     logger.debug("chunk", { chunk }); // Each token as it arrives
 *   }
 */
export async function* openAIStream(options: StreamOptions): AsyncGenerator<string, void, unknown> {
  const { model, messages, temperature = 0.7, maxTokens = 2000 } = options;

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    logger.error("[Streaming] Error:", error);
    throw error;
  }
}

/**
 * Create a ReadableStream for Server-Sent Events (SSE)
 *
 * This enables streaming responses from Next.js API routes
 *
 * Usage in API route:
 *   const stream = createSSEStream(options);
 *   return new Response(stream, {
 *     headers: {
 *       "Content-Type": "text/event-stream",
 *       "Cache-Control": "no-cache",
 *       "Connection": "keep-alive",
 *     },
 *   });
 */
export function createSSEStream(options: StreamOptions): ReadableStream {
  let fullText = "";

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Send start event
        controller.enqueue(encoder.encode("event: start\\ndata: {}\\n\\n"));

        // Stream tokens
        for await (const token of openAIStream(options)) {
          fullText += token;

          // Send token event
          const data = JSON.stringify({ token });
          controller.enqueue(encoder.encode(`event: token\\ndata: ${data}\\n\\n`));

          // Call token callback if provided
          options.onToken?.(token);
        }

        // Send complete event
        const completeData = JSON.stringify({ fullText });
        controller.enqueue(encoder.encode(`event: complete\\ndata: ${completeData}\\n\\n`));

        // Call complete callback if provided
        options.onComplete?.(fullText);

        controller.close();
      } catch (error) {
        logger.error("[SSE Stream] Error:", error);

        // Send error event
        const errorData = JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        });
        controller.enqueue(encoder.encode(`event: error\\ndata: ${errorData}\\n\\n`));

        // Call error callback if provided
        if (error instanceof Error) {
          options.onError?.(error);
        }

        controller.close();
      }
    },
  });
}

/**
 * Utility: Convert streaming generator to full text
 *
 * Useful when you need the complete response but want to use streaming internally
 */
export async function streamToText(options: StreamOptions): Promise<string> {
  let fullText = "";
  for await (const token of openAIStream(options)) {
    fullText += token;
  }
  return fullText;
}

/**
 * Utility: Estimate streaming time based on token count
 *
 * Assumes ~50 tokens/second streaming rate
 */
export function estimateStreamDuration(tokens: number): number {
  const tokensPerSecond = 50;
  return Math.ceil((tokens / tokensPerSecond) * 1000); // in milliseconds
}

/**
 * Utility: Check if streaming is supported for a model
 */
export function supportsStreaming(model: string): boolean {
  const streamingModels = ["gpt-4o", "gpt-4o-mini"];

  return streamingModels.some((m) => model.includes(m));
}
