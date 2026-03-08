export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bugReportSchema = z.object({
  type: z.enum(["bug", "feature", "support", "question"]),
  severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  description: z.string().min(1).max(2000),
  stepsToReproduce: z.string().max(2000).nullable().optional(),
  context: z
    .object({
      page: z.string().optional(),
      userAgent: z.string().optional(),
      screenWidth: z.number().optional(),
      screenHeight: z.number().optional(),
      timestamp: z.string().optional(),
    })
    .optional(),
});

/** POST /api/support/bug-report — Create a bug report / support ticket */
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(userId, "PUBLIC");
    if (!rl.success) {
      return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = bugReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, severity, description, stepsToReproduce, context } = parsed.data;

    const ticket = await prisma.activities.create({
      data: {
        id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        userId,
        orgId: orgId || "unknown",
        type: "support_ticket",
        title: `Support: ${type} (${severity})`,
        userName: "User",
        updatedAt: new Date(),
        metadata: {
          ticketType: type,
          severity,
          description,
          stepsToReproduce,
          context,
          status: "open",
        },
      },
    });

    console.log(`[support] New ${severity} ${type} from user=${userId} org=${orgId}`);

    return NextResponse.json({ ok: true, data: { ticketId: ticket.id, status: "open" } });
  } catch (error) {
    console.error("[support] Failed:", error);
    return NextResponse.json({ ok: false, error: "Failed to create ticket" }, { status: 500 });
  }
}
