export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Session 9: Added Zod schema to prevent mass-assignment.
 * Previously spread raw body into prisma.contractors.create — any
 * arbitrary field from the body was passed to the DB.
 */
const onboardSchema = z.object({
  trade: z.string().min(1).max(255),
  region: z.string().min(1).max(255),
  company_name: z.string().max(255).optional(),
  website: z.string().url().max(500).optional().or(z.literal("")),
  contact_email: z.string().email().max(255).optional().or(z.literal("")),
  description: z.string().max(2000).optional(),
  profile_photo_url: z.string().url().max(500).optional(),
});

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    const body = await req.json();
    const parsed = onboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const partner = await prisma.contractors.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        updated_at: new Date(),
        ...parsed.data,
      },
    });

    logger.info("[TRADES_ONBOARD]", { userId, contractorId: partner.id });
    return NextResponse.json(partner);
  } catch (error) {
    logger.error("[TRADES_ONBOARD_FAILED]", { error, userId });
    return NextResponse.json({ error: "Failed to onboard contractor" }, { status: 500 });
  }
});
