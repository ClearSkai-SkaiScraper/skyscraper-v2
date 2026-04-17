// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/ai/client";
import { saveChatMessage } from "@/lib/dominus/chat";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  question: z.string().min(1, "Question is required"),
  claimId: z.string().optional(),
  routeName: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const rl = await checkRateLimit(`dominus:${userId}`, "AI");
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const isStreamHeader = req.headers.get("accept") === "text/event-stream";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bodyRaw: any = null;
  try {
    bodyRaw = await req.json().catch(() => null);
  } catch {}
  const parseResult = RequestSchema.safeParse(bodyRaw || {});
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues.map((i) => i.message).join("; ") },
      { status: 400 }
    );
  }
  const { question, claimId, routeName, temperature = 0.3, stream } = parseResult.data;
  const streamRequested = Boolean(stream) || isStreamHeader;
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return NextResponse.json({ error: "Empty question" }, { status: 400 });
  }

  try {
    const openai = getOpenAI();
    const systemPrompt =
      "You are Dominus, a specialized assistant for roofing, storm claims, inspections, and restoration workflows. " +
      "Answer clearly and concisely. If you lack data, ask for clarification instead of guessing." +
      (orgId ? ` Organization context: ${orgId}.` : "") +
      (claimId ? ` Active claim id: ${claimId}.` : "") +
      (routeName ? ` Current route: ${routeName}.` : "");

    if (streamRequested) {
      const encoder = new TextEncoder();
      let answerAccum = "";
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmedQuestion },
        ],
        temperature,
        stream: true,
      });

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const part of stream) {
              const token = part.choices[0]?.delta?.content;
              if (token) {
                answerAccum += token;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            }
            // Persist after full answer
            if (answerAccum) {
              await safePersist(userId, orgId, claimId, routeName, trimmedQuestion, answerAccum);
            }
            controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: trimmedQuestion },
        ],
        temperature,
      });
      const answer = completion.choices[0]?.message?.content || "I’m not sure how to answer that.";
      await safePersist(userId, orgId, claimId, routeName, trimmedQuestion, answer);
      return NextResponse.json({ answer });
    }
  } catch (error) {
    logger.error("Ask Dominus API error:", error);
    return NextResponse.json(
      { error: error?.message || "Ask Dominus encountered an error. Please try again." },
      { status: 500 }
    );
  }
}

async function safePersist(
  userId: string | null | undefined,
  orgId: string | null | undefined,
  claimId: string | undefined,
  routeName: string | null | undefined,
  question: string,
  answer: string
) {
  try {
    await saveChatMessage({
      userId: userId || undefined,
      orgId: orgId || undefined,
      claimId,
      routeName: routeName || undefined,
      role: "user",
      content: question,
    });
    await saveChatMessage({
      userId: userId || undefined,
      orgId: orgId || undefined,
      claimId,
      routeName: routeName || undefined,
      role: "assistant",
      content: answer,
    });
  } catch (err) {
    logger.error("Persist Dominus messages error (non-blocking):", err);
  }
}
