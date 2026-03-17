export const dynamic = "force-dynamic";

/**
 * Skai AI Assistant Query Endpoint
 * Replaces the old /api/copilot endpoint
 */

import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/prompts/assistantPrompt";
import { buildClaimContext } from "@/lib/claim/buildClaimContext";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const openai = getOpenAI();

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { claimId, message, threadId } = await req.json();

    if (!claimId || !message) {
      return NextResponse.json({ error: "Missing claimId or message" }, { status: 400 });
    }

    // Verify user has access to this claim
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        Org: {
          users: {
            some: { clerkUserId: user.id },
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Build comprehensive claim context
    const context = await buildClaimContext(claimId);

    // Create or retrieve thread
    let actualThreadId = threadId;
    if (!actualThreadId) {
      const thread = await openai.beta.threads.create();
      actualThreadId = thread.id;
    }

    // Add user message to thread
    await openai.beta.threads.messages.create(actualThreadId, {
      role: "user",
      content: message,
    });

    // Run assistant with context
    const run = await openai.beta.threads.runs.create(actualThreadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!,
      instructions: `${ASSISTANT_SYSTEM_PROMPT}\n\n## Current Claim Context\n${JSON.stringify(context, null, 2)}`,
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, {
      thread_id: actualThreadId,
    } as any);
    while (runStatus.status === "in_progress" || runStatus.status === "queued") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, {
        thread_id: actualThreadId,
      } as any);
    }

    if (runStatus.status === "failed") {
      throw new Error("Assistant run failed");
    }

    // Get messages
    const messages = await openai.beta.threads.messages.list(actualThreadId);
    const latestMessage = messages.data[0];

    return NextResponse.json({
      threadId: actualThreadId,
      response:
        latestMessage.content[0].type === "text"
          ? latestMessage.content[0].text.value
          : "Error processing response",
    });
  } catch (error) {
    logger.error("[AI Assistant] Error:", error);
    return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
  }
}
