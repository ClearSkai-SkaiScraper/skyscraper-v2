import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { retailAssistantSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

// Force Node.js runtime for OpenAI SDK
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (request, { userId, orgId }) => {
  try {
    // Rate limit — AI preset (5/min via Upstash)
    const rl = await checkRateLimit(userId, "AI");
    if (!rl.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await request.json();
    const validation = validateAIRequest(retailAssistantSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }
    const { message, jobId, history } = validation.data;

    // Initialize OpenAI client
    const openai = getOpenAI();

    const systemPrompt = `You are an expert retail roofing and restoration job assistant. Help contractors with:
- Estimate creation and pricing strategies for out-of-pocket and financed jobs
- Material selection, quantities, and cost calculations
- Scheduling and project timeline planning
- Customer communication templates and follow-ups
- Financing options and payment plans
- Upselling and cross-selling opportunities
- Job costing and profit margin analysis

You are NOT handling insurance claims - focus on direct retail sales, out-of-pocket projects, and financed work.

Key facts:
- 1 roofing square = 100 sq ft
- Standard shingle bundles: 3 per square
- Always factor in waste (10-15% typical)
- Material costs vary by region and quality

Provide actionable, specific advice. Use markdown formatting for clarity. Keep responses under 200 words.`;

    const contextMessages =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      history?.slice(-5).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })) || [];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        { role: "user", content: message + (jobId ? ` (Job ID: ${jobId})` : "") },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    logger.error("Retail Assistant Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
});
