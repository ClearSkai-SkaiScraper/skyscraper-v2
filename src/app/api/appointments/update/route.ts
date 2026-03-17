import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok" || !ctx.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, title, description, startTime, endTime, location, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    // Verify appointment belongs to user's org
    const existing = await prisma.appointments.findFirst({
      where: {
        id,
        orgId: ctx.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found or access denied" },
        { status: 404 }
      );
    }

    // Build update data — only include fields that were provided
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      // Normalize status to lowercase to match schema default
      updateData.status = status.toLowerCase();
    }
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.appointments.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        status: updated.status.toUpperCase(),
        startTime: updated.startTime,
        endTime: updated.endTime,
      },
    });
  } catch (error) {
    logger.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}
