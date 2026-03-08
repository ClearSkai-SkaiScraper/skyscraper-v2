export const dynamic = "force-dynamic";

// app/api/partners/[id]/route.ts
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const partner = await prisma.partner.findFirst({
      where: {
        id: params.id,
        orgId: user.orgId, // Security: only access own org's partners
      },
    });

    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    return NextResponse.json(partner);
  } catch (error) {
    logger.error("Failed to fetch Partner:", error);
    return NextResponse.json({ error: "Failed to fetch Partner" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Verify ownership
    const existing = await prisma.partner.findFirst({
      where: {
        id: params.id,
        orgId: user.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, trade, email, phone, website, address, notes } = body;

    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(trade && { trade }),
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        website: website ?? existing.website,
        address: address ?? existing.address,
        notes: notes ?? existing.notes,
      },
    });

    return NextResponse.json(partner);
  } catch (error) {
    logger.error("Failed to update Partner:", error);
    return NextResponse.json({ error: "Failed to update Partner" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.users.findFirst({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    // Verify ownership
    const existing = await prisma.partner.findFirst({
      where: {
        id: params.id,
        orgId: user.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    await prisma.partner.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete Partner:", error);
    return NextResponse.json({ error: "Failed to delete Partner" }, { status: 500 });
  }
}
