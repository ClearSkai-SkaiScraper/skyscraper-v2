export const dynamic = "force-dynamic";

// src/app/api/client-portal/[slug]/profile/route.ts
/**
 * Client Portal Profile API
 * GET /api/client-portal/[slug]/profile - Get client profile
 * POST /api/client-portal/[slug]/profile - Create/update client profile
 *
 * Uses the Client model (not client_networks) for profile management.
 */

import { logger } from "@/lib/logger";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;

    // Get calling user's email for ownership verification
    const user = await currentUser();
    const callerEmail = user?.emailAddresses?.[0]?.emailAddress;

    // Find the client by slug (Client model has slug field)
    const client = await prisma.client.findUnique({
      where: { slug },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        postal: true,
        avatarUrl: true,
        propertyPhotoUrl: true,
        preferredContact: true,
        category: true,
        createdAt: true,
      },
    });

    if (!client) {
      return NextResponse.json({ profile: null });
    }

    // Verify ownership: caller's email must match client's email
    if (!callerEmail || client.email?.toLowerCase() !== callerEmail.toLowerCase()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      profile: {
        id: client.id,
        firstName: client.firstName || client.name?.split(" ")[0] || "",
        lastName: client.lastName || client.name?.split(" ").slice(1).join(" ") || "",
        email: client.email || "",
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        postal: client.postal,
        avatarUrl: client.avatarUrl,
        propertyPhotoUrl: client.propertyPhotoUrl,
        preferredContact: client.preferredContact,
        category: client.category,
        createdAt: client.createdAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[Client Profile GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = params;
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      postal,
      propertyPhotoUrl,
      avatarUrl,
      preferredContact,
      category,
    } = body;

    // Find the client by slug
    const existingClient = await prisma.client.findUnique({
      where: { slug },
      select: { id: true, email: true },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Verify ownership: caller's email must match client's email
    const user = await currentUser();
    const callerEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!callerEmail || existingClient.email?.toLowerCase() !== callerEmail.toLowerCase()) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update the client profile
    const updatedClient = await prisma.client.update({
      where: { id: existingClient.id },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        name: firstName && lastName ? `${firstName} ${lastName}`.trim() : undefined,
        email: email || undefined,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postal: postal || null,
        propertyPhotoUrl: propertyPhotoUrl || null,
        avatarUrl: avatarUrl || null,
        preferredContact: preferredContact || "email",
        category: category || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedClient.id,
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        email: updatedClient.email,
      },
    });
  } catch (error) {
    logger.error("[Client Profile POST] Error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
