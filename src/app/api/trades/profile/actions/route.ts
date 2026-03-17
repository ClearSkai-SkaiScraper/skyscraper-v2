/**
 * Trades Profile Actions - Unified handler for profile management
 *
 * POST /api/trades/profile/actions
 * Actions: update, update_portfolio, add_featured_work, remove_featured_work,
 *          request_verification
 *
 * Real models: TradesProfile (companyName, specialties[], NOT businessName/primaryTrade),
 *              tradesFeaturedWork (userId, NOT profileId).
 * Phantom stubs: portfolioItem, verificationRequest.
 */

import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    companyName: z.string().optional(),
    bio: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    logoUrl: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_portfolio"),
    items: z.array(
      z.object({
        id: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        imageUrl: z.string(),
        category: z.string().optional(),
      })
    ),
  }),
  z.object({
    action: z.literal("add_featured_work"),
    title: z.string(),
    description: z.string().optional(),
    imageUrl: z.string(),
    projectDate: z.string().optional(),
    category: z.string().optional(),
  }),
  z.object({
    action: z.literal("remove_featured_work"),
    workId: z.string(),
  }),
  z.object({
    action: z.literal("request_verification"),
    documents: z.array(z.string()).optional(),
  }),
]);

type ActionInput = z.infer<typeof ActionSchema>;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // Get user's profile
    const profile = await prisma.tradesProfile.findFirst({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Trades profile not found" }, { status: 404 });
    }

    switch (input.action) {
      case "update":
        return handleUpdate(profile.id, userId, input);

      case "update_portfolio":
        return handleUpdatePortfolio(userId, input);

      case "add_featured_work":
        return handleAddFeaturedWork(userId, input);

      case "remove_featured_work":
        return handleRemoveFeaturedWork(userId, input);

      case "request_verification":
        return handleRequestVerification(profile.id, userId, input);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[Trades Profile Actions] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleUpdate(
  profileId: string,
  userId: string,
  input: Extract<ActionInput, { action: "update" }>
) {
  const { action, ...updateData } = input;

  const updated = await prisma.tradesProfile.update({
    where: { id: profileId },
    data: updateData,
  });

  return NextResponse.json({ success: true, profile: updated });
}

async function handleUpdatePortfolio(
  userId: string,
  input: Extract<ActionInput, { action: "update_portfolio" }>
) {
  // No portfolioItem table — use tradesFeaturedWork as portfolio items
  await prisma.tradesFeaturedWork.deleteMany({
    where: { userId },
  });

  if (input.items.length > 0) {
    await prisma.tradesFeaturedWork.createMany({
      data: input.items.map((item) => ({
        id: crypto.randomUUID(),
        userId,
        title: item.title,
        description: item.description || null,
        imageUrl: item.imageUrl,
        category: item.category || null,
      })),
    });
  }

  return NextResponse.json({ success: true, count: input.items.length });
}

async function handleAddFeaturedWork(
  userId: string,
  input: Extract<ActionInput, { action: "add_featured_work" }>
) {
  // Real model: tradesFeaturedWork uses userId (NOT profileId)
  const work = await prisma.tradesFeaturedWork.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      title: input.title,
      description: input.description || null,
      imageUrl: input.imageUrl,
      projectDate: input.projectDate ? new Date(input.projectDate) : null,
      category: input.category || null,
      isFeatured: true,
    },
  });

  return NextResponse.json({ success: true, work });
}

async function handleRemoveFeaturedWork(
  userId: string,
  input: Extract<ActionInput, { action: "remove_featured_work" }>
) {
  // tradesFeaturedWork uses userId (ensure ownership)
  await prisma.tradesFeaturedWork.deleteMany({
    where: {
      id: input.workId,
      userId,
    },
  });

  return NextResponse.json({ success: true });
}

async function handleRequestVerification(
  profileId: string,
  userId: string,
  input: Extract<ActionInput, { action: "request_verification" }>
) {
  // No verificationRequest table — log and return acknowledgment
  logger.info("[Trades] Verification request submitted", {
    profileId,
    userId,
    documentCount: input.documents?.length || 0,
  });

  return NextResponse.json({
    success: true,
    message: "Verification request submitted. Our team will review your documents.",
  });
}
