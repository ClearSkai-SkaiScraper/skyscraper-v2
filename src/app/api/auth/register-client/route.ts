/**
 * 📝 REGISTER CLIENT API
 *
 * POST /api/auth/register-client
 * Creates a new client profile using the unified Client model.
 */

import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { registerUser } from "@/lib/identity";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, "AUTH");
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", message: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, address, city, state, zip } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    // Check if client already exists (using unified Client model)
    const existingClient = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (existingClient) {
      return NextResponse.json({ error: "Client account already exists" }, { status: 409 });
    }

    const displayName = `${firstName} ${lastName}`.trim();
    const slug = `client-${user.id.slice(-8)}-${nanoid(4)}`;

    // Create client profile in unified Client model
    const client = await prisma.client.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        slug,
        name: displayName,
        email,
        firstName,
        lastName,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postal: zip || null,
        avatarUrl: user.imageUrl || null,
        category: "Homeowner",
        status: "active",
      },
    });

    // Register in user_registry
    await registerUser(user.id, "client", undefined, client.id, undefined, displayName, email);

    // Sync to Clerk publicMetadata
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(user.id, {
        publicMetadata: {
          userType: "client",
          onboardingComplete: true,
          clientId: client.id,
        },
      });
    } catch (syncError) {
      logger.error("[REGISTER_CLIENT] Clerk sync failed:", syncError);
    }

    return NextResponse.json({
      success: true,
      clientId: client.id,
      slug: client.slug,
      message: "Client account created successfully",
    });
  } catch (error) {
    logger.error("[/api/auth/register-client] Error:", error);
    return NextResponse.json(
      { error: "Failed to create client account" },
      { status: 500 }
    );
  }
}
