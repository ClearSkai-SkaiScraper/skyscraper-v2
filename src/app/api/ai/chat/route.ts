export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// src/app/api/ai/chat/route.ts
import type { claims, jobs, Org, Plan, projects, properties } from "@prisma/client";
import { NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { trackAiUsage } from "@/lib/ai/trackUsage";
import { aiFail, aiOk, classifyOpenAiError } from "@/lib/api/aiResponse";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";
import { chatSchema, validateAIRequest } from "@/lib/validation/aiSchemas";

// Store user conversation memory (in production, use Redis or database)
const userMemory = new Map<
  string,
  {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    timestamp: number;
  }
>();

type JobWithIncludes = jobs & {
  properties: properties | null;
  claims: claims | null;
};

type ClaimWithIncludes = claims & {
  properties: properties | null;
};

type ProjectWithIncludes = projects & {
  properties: properties | null;
};

type OrgWithPlan = Org & {
  Plan: Plan | null;
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const POST = withAuth(async (request, { userId, orgId }) => {
  const startTime = Date.now();

  try {
    // Rate limiting check (10 requests per minute for AI endpoints)
    const identifier = getRateLimitIdentifier(userId, request);
    const allowed = await rateLimiters.ai.check(10, identifier);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    // Critical configuration check
    const openai = getOpenAI();

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      logger.error("[AI_CHAT] ❌ Failed to parse JSON body:", jsonError);
      return NextResponse.json(aiFail("Invalid request body", "BAD_REQUEST"), { status: 400 });
    }

    const validated = validateAIRequest(chatSchema, body);
    if (!validated.success) {
      return NextResponse.json(aiFail(validated.error, "BAD_REQUEST"), { status: 422 });
    }

    const { message } = validated.data;

    // Get or create user memory
    let memory = userMemory.get(userId);

    if (!memory || Date.now() - memory.timestamp > 3600000) {
      // 1 hour expiry
      memory = { messages: [], timestamp: Date.now() };
    }

    // Gather contextual data from database
    const [orgResult, recentJobs, recentClaims, activeProjects, subscriptionResult] =
      await Promise.all([
        prisma.org.findUnique({
          where: { id: orgId },
          include: { Plan: true },
        }),
        prisma.jobs.findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { properties: true, claims: true },
        }),
        prisma.claims.findMany({
          where: { orgId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { properties: true },
        }),
        prisma.projects.findMany({
          where: {
            orgId,
            status: { in: ["INSPECTION_SCHEDULED", "ESTIMATE_SENT", "APPROVED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { properties: true },
        }),
        prisma.subscription.findFirst({
          where: { orgId },
        }),
      ]);

    // Create context summary
    const contextData = {
      organization: {
        name: orgResult?.name,
        plan: orgResult?.Plan?.name,
        totalJobs: recentJobs.length,
        totalClaims: recentClaims.length,
      },
      recentActivity: {
        jobs: recentJobs.slice(0, 5).map((job) => ({
          id: job.id,
          title: job.title,
          type: job.jobType,
          status: job.status,
          address: job.properties?.street,
        })),
        claims: recentClaims.slice(0, 5).map((claim) => ({
          id: claim.id,
          carrier: claim.carrier,
          status: claim.status,
          value: claim.estimatedValue,
          address: claim.properties?.street,
        })),
        projects: activeProjects.map((project) => ({
          id: project.id,
          title: project.title,
          status: project.status,
          address: project.properties?.street,
        })),
      },
      subscription: {
        status: subscriptionResult?.status,
        currentPeriodEnd: subscriptionResult?.currentPeriodEnd,
      },
    };

    // Build system prompt with context
    const systemPrompt = `You are SkaiAssistant, an AI assistant for SKai-Scraper CRM, a roofing contractor management platform. 

Current Context:
- Organization: ${contextData.organization.name} (${contextData.organization.plan} plan)
- Active Jobs: ${contextData.organization.totalJobs}
- Active Claims: ${contextData.organization.totalClaims}

Recent Activity:
${
  contextData.recentActivity.jobs.length > 0
    ? `Recent Jobs: ${contextData.recentActivity.jobs
        .map((j: any) => `${j.title} (${j.status})`)
        .join(", ")}`
    : "No recent jobs"
}
${
  contextData.recentActivity.claims.length > 0
    ? `Recent Claims: ${contextData.recentActivity.claims
        .map((c: any) => `${c.carrier} claim (${c.status})`)
        .join(", ")}`
    : "No recent claims"
}

You can help with:
- Analyzing job performance and pipeline data
- Providing insights on claims and project status  
- Route optimization for inspections
- Generating reports and summaries
- Team coordination and task management
- Financial tracking and billing questions

Be conversational, helpful, and specific. Reference real data when available. If asked about specific metrics, provide numbers from the context.`;

    // Prepare messages for OpenAI
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...memory.messages.slice(-8).map((m) => ({ role: m.role, content: m.content })), // Keep last 8 messages for context
      { role: "user", content: message },
    ];

    // Get AI response with retry logic
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      });
    } catch (openaiError) {
      logger.error("[AI_CHAT] OpenAI API call failed", { error: openaiError });
      const { message, code } = classifyOpenAiError(openaiError);
      return NextResponse.json(
        aiFail(
          message,
          code,
          { raw: openaiError instanceof Error ? openaiError.message : String(openaiError) },
          {
            model: "gpt-4o-mini",
            durationMs: Date.now() - startTime,
          }
        ),
        { status: 502 }
      );
    }

    const assistantResponse =
      completion.choices[0]?.message?.content ||
      "I apologize, but I couldn't generate a response at this time.";

    // Track AI usage for billing
    const tokensUsed = completion.usage?.total_tokens || 0;
    await trackAiUsage({
      orgId,
      feature: "ai_assistant",
      tokens: tokensUsed,
      metadata: {
        model: "gpt-4o-mini",
        messageLength: message.length,
        responseLength: assistantResponse.length,
      },
    });

    // Update memory
    memory.messages.push(
      { role: "user", content: message },
      { role: "assistant", content: assistantResponse }
    );

    // Keep only last 5 exchanges (10 messages)
    if (memory.messages.length > 10) {
      memory.messages = memory.messages.slice(-10);
    }

    memory.timestamp = Date.now();
    userMemory.set(userId, memory);

    const processingTime = Date.now() - startTime;

    return NextResponse.json(
      aiOk(
        {
          response: assistantResponse,
          context: {
            hasData: true,
            jobCount: contextData.organization.totalJobs,
            claimCount: contextData.organization.totalClaims,
          },
          messageCount: memory.messages.length,
        },
        {
          model: "gpt-4o-mini",
          durationMs: processingTime,
          tokensIn: completion.usage?.prompt_tokens,
          tokensOut: completion.usage?.completion_tokens,
        }
      )
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error(`[AI_CHAT] Error after ${processingTime}ms:`, error);

    // Provide detailed error information
    const errorDetails = {
      message: "Unknown error",
      type: error instanceof Error ? error.constructor.name : typeof error,
      processingTimeMs: processingTime,
    };

    // CRITICAL: Return 200 with safe error message to prevent red error screens
    // The UI will display this as a friendly assistant message
    return NextResponse.json(
      aiOk(
        {
          response:
            "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact support if the issue persists.",
          context: { hasData: false, jobCount: 0, claimCount: 0 },
          messageCount: 0,
        },
        {
          model: "gpt-4o-mini",
          durationMs: processingTime,
          tokensIn: 0,
          tokensOut: 0,
        }
      ),
      { status: 200 }
    );
  }
});
