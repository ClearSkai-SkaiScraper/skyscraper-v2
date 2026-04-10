export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const requestSchema = z.object({
  contractorId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { contractorId } = validation.data;

    // Get user
    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // Check if connection already exists
    const existing = await prisma.clientProConnection.findFirst({
      where: {
        clientId: user.id,
        contractorId,
      },
    });

    if (existing) {
      return NextResponse.json({ ok: false, error: "Connection already exists" }, { status: 400 });
    }

    const connection = await prisma.clientProConnection.create({
      data: {
        id: crypto.randomUUID(),
        clientId: user.id,
        contractorId,
        status: "pending",
      },
    });

    return NextResponse.json({ ok: true, connection });
  } catch (error) {
    logger.error("POST /api/connections/request error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
