export const dynamic = "force-dynamic";

// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const uploadPhotoSchema = z.object({
  photoUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = uploadPhotoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { photoUrl } = validation.data;

    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.users.update({
      where: { id: user.id },
      data: {
        headshot_url: photoUrl,
      },
      select: {
        id: true,
        headshot_url: true,
      },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (error) {
    logger.error("POST /api/profile/upload-photo error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
