import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import { getRateLimitIdentifier, rateLimiters } from "@/lib/rate-limit";

const planGenerateSchema = z.object({
  trade: z.string().min(1),
  jobType: z.string().min(1),
  projectSize: z.string().optional(),
  timeline: z.string().optional(),
  budget: z.string().optional(),
  summary: z.string().optional(),
  documents: z.array(z.string()).optional(),
  finalNotes: z.string().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getRateLimitIdentifier(user.id, req);
    const allowed = await rateLimiters.ai.check(5, identifier);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = planGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { trade, jobType, projectSize, timeline, budget, summary, documents, finalNotes } =
      parsed.data;

    const openai = ensureOpenAI();

    const tradeLabel = trade.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
    const jobTypeLabel = jobType
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l: string) => l.toUpperCase());

    const prompt = `You are an expert construction project planner. Generate a comprehensive, professional project plan for the following:

**Trade:** ${tradeLabel}
**Job Type:** ${jobTypeLabel}
**Timeline:** ${timeline ? timeline.replace(/-/g, " ") : "To be determined"}
**Project Size/Scope:** ${projectSize || "Not specified"}
**Budget Range:** ${budget || "Not specified"}

**Project Summary from Client:**
${summary || "No additional summary provided."}

**Documents/References:**
${documents || "None provided."}

**Additional Notes & Final Touches:**
${finalNotes || "None provided."}

Generate a detailed, professional project plan in Markdown format that includes ALL of the following sections:

# ${tradeLabel} Project Plan — ${jobTypeLabel}

Include these sections with REAL, detailed content (not generic placeholders):

1. **Executive Summary** — 2-3 paragraph overview of the project
2. **Project Overview** — Trade, job type, timeline, scope, budget in a clean table format
3. **Scope of Work** — Detailed numbered list of ALL work items
4. **Phase 1: Pre-Construction / Planning** — Permits, site assessment, material ordering, timeline
5. **Phase 2: Mobilization & Site Prep** — Equipment, safety setup, protection measures
6. **Phase 3: Primary Execution** — Step-by-step work breakdown specific to ${tradeLabel} ${jobTypeLabel}
7. **Phase 4: Quality Control & Inspection** — Checkpoints, code compliance, testing
8. **Phase 5: Completion & Handoff** — Cleanup, final walkthrough, warranty, documentation
9. **Materials & Equipment List** — Itemized list with estimated quantities for ${tradeLabel}
10. **Labor Breakdown** — Crew size, roles, estimated hours per phase
11. **Cost Estimate** — Detailed breakdown: labor, materials, permits, equipment, overhead, profit margin
12. **Timeline & Milestones** — Week-by-week Gantt-style text breakdown
13. **Safety & Compliance** — OSHA requirements, local codes, insurance requirements
14. **Warranty & Maintenance** — Post-completion warranty terms, recommended maintenance schedule
15. **Risk Assessment** — Potential issues and mitigation strategies
16. **Terms & Conditions** — Standard project terms

Make this EXTREMELY professional and detailed — this will be exported as a PDF for clients. Use proper markdown formatting with headers, bullet points, numbered lists, and bold text. Include realistic cost ranges and timelines based on industry standards for ${tradeLabel}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a senior construction project manager with 25 years of experience. You create highly detailed, professional project plans that contractors use to win bids and manage jobs. Your plans are thorough, realistic, and formatted beautifully in Markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const plan = completion.choices?.[0]?.message?.content || "";
    const tokensUsed = completion.usage?.total_tokens || 0;

    return NextResponse.json({
      plan,
      tokensUsed,
      model: "gpt-4o",
    });
  } catch (error) {
    logger.error("AI plan generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate project plan. Please try again." },
      { status: 500 }
    );
  }
}
