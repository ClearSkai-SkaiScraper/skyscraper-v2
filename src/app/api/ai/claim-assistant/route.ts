import { withAuth } from "@/lib/auth/withAuth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";

const claimAssistantSchema = z.object({
  message: z.string().min(1).max(4000),
  claimId: z.string().max(200).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(20)
    .optional(),
});

// Force Node.js runtime for OpenAI SDK
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (request, { userId, orgId }) => {
  try {
    // Rate limit AI requests
    const identifier = getRateLimitIdentifier(userId, request);
    const allowed = await rateLimiters.ai.check(10, identifier);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = claimAssistantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, claimId, history } = parsed.data;

    // Initialize OpenAI client
    const openai = getOpenAI();

    const systemPrompt = `You are an expert roofing and restoration claim assistant. Help contractors with:
- Supplement strategy and negotiations
- Weather verification and storm data
- Claim approval probability analysis
- Documentation and photo best practices
- Carrier-specific requirements
- Material pricing and labor calculations

Provide actionable, specific advice. Use markdown formatting for clarity. Keep responses under 200 words.`;

    const contextMessages =
      history?.slice(-5).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })) || [];

    logger.debug("[claim-assistant] Making OpenAI request for user:", userId || "demo");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        { role: "user", content: message + (claimId ? ` (Claim ID: ${claimId})` : "") },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const response =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try again.";

    logger.debug("[claim-assistant] OpenAI response received successfully");

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("[claim-assistant] Error", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Return more specific error messages
    if (error instanceof Error && (error as any).code === "insufficient_quota") {
      return NextResponse.json(
        { error: "AI service quota exceeded. Please contact support." },
        { status: 503 }
      );
    }
    if (error instanceof Error && (error as any).code === "invalid_api_key") {
      return NextResponse.json({ error: "AI service configuration error." }, { status: 503 });
    }

    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
});
