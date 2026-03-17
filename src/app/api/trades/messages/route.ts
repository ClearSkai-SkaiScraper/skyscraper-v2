export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const sendTradesMessageSchema = z.object({
  toProfileId: z.string().min(1),
  subject: z.string().optional(),
  message: z.string().min(1),
});

/**
 * POST /api/trades/messages
 * Send a message to a connected pro via the Trades Network
 */
export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const rl = await checkRateLimit(userId, "AUTH");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = sendTradesMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { toProfileId, subject, message: messageBody } = parsed.data;

    // Find sender's trades profile
    const senderProfile = await prisma.tradesProfile.findFirst({
      where: { userId, orgId },
    });

    if (!senderProfile) {
      return NextResponse.json(
        { error: "You don't have a Trades Network profile. Create one first." },
        { status: 403 }
      );
    }

    // Verify recipient profile exists
    const recipientProfile = await prisma.tradesProfile.findUnique({
      where: { id: toProfileId },
    });

    if (!recipientProfile) {
      return NextResponse.json({ error: "Recipient profile not found" }, { status: 404 });
    }

    // Create the trades message
    const tradesMessage = await prisma.tradesMessage.create({
      data: {
        id: crypto.randomUUID(),
        fromProfileId: senderProfile.id,
        toProfileId: recipientProfile.id,
        subject: subject || "New Message",
        message: messageBody,
        read: false,
        archived: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: tradesMessage.id,
        subject: tradesMessage.subject,
        createdAt: tradesMessage.createdAt,
      },
    });
  } catch (error) {
    logger.error("[API] /api/trades/messages error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
});

/**
 * GET /api/trades/messages
 * Fetch trades messages for the current user
 */
export const GET = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const profile = await prisma.tradesProfile.findFirst({
      where: { userId, orgId },
    });

    if (!profile) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await prisma.tradesMessage.findMany({
      where: {
        OR: [{ fromProfileId: profile.id }, { toProfileId: profile.id }],
        archived: false,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        TradesProfile_TradesMessage_fromProfileIdToTradesProfile: {
          select: { id: true, companyName: true, contactName: true },
        },
        TradesProfile_TradesMessage_toProfileIdToTradesProfile: {
          select: { id: true, companyName: true, contactName: true },
        },
      },
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      subject: m.subject,
      message: m.message,
      read: m.read,
      createdAt: m.createdAt,
      from: {
        id: m.TradesProfile_TradesMessage_fromProfileIdToTradesProfile.id,
        companyName: m.TradesProfile_TradesMessage_fromProfileIdToTradesProfile.companyName,
        contactName: m.TradesProfile_TradesMessage_fromProfileIdToTradesProfile.contactName,
      },
      to: {
        id: m.TradesProfile_TradesMessage_toProfileIdToTradesProfile.id,
        companyName: m.TradesProfile_TradesMessage_toProfileIdToTradesProfile.companyName,
        contactName: m.TradesProfile_TradesMessage_toProfileIdToTradesProfile.contactName,
      },
      isIncoming: m.toProfileId === profile.id,
    }));

    return NextResponse.json({ messages: formatted });
  } catch (error) {
    logger.error("[API] GET /api/trades/messages error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
});
