export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.users.update({
      where: { id: user.id },
      data: {
        name: data.name,
      },
      select: {
        id: true,
        name: true,
        email: true,
        headshot_url: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    logger.error("PUT /api/profile/update error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
